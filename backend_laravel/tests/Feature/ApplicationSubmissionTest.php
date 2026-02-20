<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApplicationSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return [
            'full_name' => 'Иван Иванов',
            'organization_position' => 'АТУ, студент',
            'academic_degree' => 'бакалавр',
            'phone' => '+77010000000',
            'email' => 'ivan@example.com',
            'supervisor_full_name' => 'Петров Петр Петрович',
            'supervisor_organization_position' => 'АТУ, доцент',
            'supervisor_academic_degree' => 'к.т.н.',
            'report_title' => 'Исследование технологий',
            'direction' => 'Технологии пищевой промышленности',
            'participation_form' => 'Очно',
            'hotel_booking_needed' => false,
        ];
    }

    public function test_user_can_create_only_one_application(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        $first = $this->post('/api/applications', $this->payload());
        $first->assertCreated();

        $second = $this->post('/api/applications', $this->payload());
        $second->assertStatus(422);

        $this->assertDatabaseCount('applications', 1);
    }

    public function test_user_sees_only_own_application(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now(), 'role' => 'user']);
        $other = User::factory()->create(['email_verified_at' => now(), 'role' => 'user']);

        Application::create(array_merge($this->payload(), ['user_id' => $owner->id, 'status' => 'pending']));
        Application::create(array_merge($this->payload(), ['user_id' => $other->id, 'email' => 'other@example.com', 'status' => 'pending']));

        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/applications');
        $response->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertEquals($owner->id, $response->json()[0]['user_id']);
    }

    public function test_user_can_update_own_application_in_revision_status(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $application = Application::create(array_merge($this->payload(), [
            'user_id' => $user->id,
            'status' => Application::STATUS_REVISION,
            'moderator_comment' => 'РќСѓР¶РЅРѕ РґРѕСЂР°Р±РѕС‚Р°С‚СЊ РґРѕРєР»Р°Рґ.',
        ]));

        Sanctum::actingAs($user);

        $response = $this->patch('/api/applications/' . $application->id, array_merge($this->payload(), [
            'report_title' => 'РћР±РЅРѕРІР»РµРЅРЅРѕРµ РЅР°Р·РІР°РЅРёРµ РґРѕРєР»Р°РґР°',
        ]));

        $response->assertOk();

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'report_title' => 'РћР±РЅРѕРІР»РµРЅРЅРѕРµ РЅР°Р·РІР°РЅРёРµ РґРѕРєР»Р°РґР°',
            'status' => Application::STATUS_PENDING,
            'moderator_comment' => null,
        ]);

        Notification::assertSentTo($user, ApplicationSubmittedNotification::class);
    }

    public function test_user_cannot_update_application_if_not_in_revision_status(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $application = Application::create(array_merge($this->payload(), [
            'user_id' => $user->id,
            'status' => Application::STATUS_PENDING,
        ]));

        Sanctum::actingAs($user);

        $response = $this->patch('/api/applications/' . $application->id, $this->payload());
        $response->assertForbidden();
    }
}
