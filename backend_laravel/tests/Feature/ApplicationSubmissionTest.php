<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\SystemSetting;
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
            'full_name' => 'Р ВР Р†Р В°Р Р… Р ВР Р†Р В°Р Р…Р С•Р Р†',
            'organization_position' => 'Р С’Р СћР Р€, РЎРѓРЎвЂљРЎС“Р Т‘Р ВµР Р…РЎвЂљ',
            'academic_degree' => 'Р В±Р В°Р С”Р В°Р В»Р В°Р Р†РЎР‚',
            'phone' => '+77010000000',
            'email' => 'ivan@example.com',
            'supervisor_full_name' => 'Р СџР ВµРЎвЂљРЎР‚Р С•Р Р† Р СџР ВµРЎвЂљРЎР‚ Р СџР ВµРЎвЂљРЎР‚Р С•Р Р†Р С‘РЎвЂЎ',
            'supervisor_organization_position' => 'Р С’Р СћР Р€, Р Т‘Р С•РЎвЂ Р ВµР Р…РЎвЂљ',
            'supervisor_academic_degree' => 'Р С”.РЎвЂљ.Р Р….',
            'department' => 'Кафедра информационных технологий',
            'report_title' => 'Р ВРЎРѓРЎРѓР В»Р ВµР Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ РЎвЂљР ВµРЎвЂ¦Р Р…Р С•Р В»Р С•Р С–Р С‘Р в„–',
            'direction' => 'Р СћР ВµРЎвЂ¦Р Р…Р С•Р В»Р С•Р С–Р С‘Р С‘ Р С—Р С‘РЎвЂ°Р ВµР Р†Р С•Р в„– Р С—РЎР‚Р С•Р СРЎвЂ№РЎв‚¬Р В»Р ВµР Р…Р Р…Р С•РЎРѓРЎвЂљР С‘',
            'participation_form' => 'Р С›РЎвЂЎР Р…Р С•',
            'hotel_booking_needed' => false,
        ];
    }

    public function test_user_can_create_multiple_applications(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        $first = $this->post('/api/applications', $this->payload());
        $first->assertCreated();

        $second = $this->post('/api/applications', array_merge($this->payload(), [
            'report_title' => 'Р’С‚РѕСЂРѕР№ РґРѕРєР»Р°Рґ',
            'email' => 'ivan.second@example.com',
        ]));
        $second->assertCreated();

        $this->assertDatabaseCount('applications', 2);
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
            'moderator_comment' => 'Р В РЎСљР РЋРЎвЂњР В Р’В¶Р В Р вЂ¦Р В РЎвЂў Р В РўвЂР В РЎвЂўР РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р РЋР Р‰ Р В РўвЂР В РЎвЂўР В РЎвЂќР В Р’В»Р В Р’В°Р В РўвЂ.',
        ]));

        Sanctum::actingAs($user);

        $response = $this->patch('/api/applications/' . $application->id, array_merge($this->payload(), [
            'report_title' => 'Р В РЎвЂєР В Р’В±Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В Р’В·Р В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РўвЂР В РЎвЂўР В РЎвЂќР В Р’В»Р В Р’В°Р В РўвЂР В Р’В°',
        ]));

        $response->assertOk();

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'report_title' => 'Р В РЎвЂєР В Р’В±Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В Р’В·Р В Р вЂ Р В Р’В°Р В Р вЂ¦Р В РЎвЂР В Р’Вµ Р В РўвЂР В РЎвЂўР В РЎвЂќР В Р’В»Р В Р’В°Р В РўвЂР В Р’В°',
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

    public function test_user_cannot_create_application_when_submission_disabled(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        SystemSetting::setBoolean(SystemSetting::KEY_APPLICATION_SUBMISSION_ENABLED, false);

        Sanctum::actingAs($user);

        $response = $this->post('/api/applications', $this->payload());
        $response->assertForbidden();
    }

    public function test_user_cannot_resubmit_application_when_submission_disabled(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $application = Application::create(array_merge($this->payload(), [
            'user_id' => $user->id,
            'status' => Application::STATUS_REVISION,
        ]));

        SystemSetting::setBoolean(SystemSetting::KEY_APPLICATION_SUBMISSION_ENABLED, false);

        Sanctum::actingAs($user);

        $response = $this->patch('/api/applications/' . $application->id, $this->payload());
        $response->assertForbidden();
    }

    public function test_user_can_read_submission_settings(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        SystemSetting::setBoolean(SystemSetting::KEY_APPLICATION_SUBMISSION_ENABLED, false);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/application-submission-settings');
        $response->assertOk()->assertJson([
            'enabled' => false,
        ]);
    }
}
