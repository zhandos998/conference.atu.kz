<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use App\Notifications\ApplicationStatusChangedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModeratorWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function applicationPayload(User $user): array
    {
        return [
            'user_id' => $user->id,
            'full_name' => 'Иван Иванов',
            'organization_position' => 'АТУ, магистрант',
            'academic_degree' => 'магистр',
            'phone' => '+77010000000',
            'email' => 'ivan@example.com',
            'supervisor_full_name' => 'Петров П.П.',
            'supervisor_organization_position' => 'АТУ, профессор',
            'supervisor_academic_degree' => 'д.т.н.',
            'report_title' => 'Доклад по теме',
            'direction' => 'ИТ',
            'participation_form' => 'Очно',
            'hotel_booking_needed' => false,
            'status' => 'pending',
        ];
    }

    public function test_moderator_updates_status_sends_notification_and_writes_audit_log(): void
    {
        Notification::fake();

        $moderator = User::factory()->create([
            'role' => 'moderator',
            'email_verified_at' => now(),
        ]);

        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $application = Application::create($this->applicationPayload($user));

        Sanctum::actingAs($moderator);

        $response = $this->patchJson('/api/moderator/applications/' . $application->id . '/status', [
            'status' => 'accepted',
            'moderator_comment' => 'Доклад принят.',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'accepted',
            'moderator_comment' => 'Доклад принят.',
        ]);

        $this->assertDatabaseHas('application_status_logs', [
            'application_id' => $application->id,
            'moderator_id' => $moderator->id,
            'old_status' => 'pending',
            'new_status' => 'accepted',
        ]);

        Notification::assertSentTo($user, ApplicationStatusChangedNotification::class);
    }

    public function test_moderator_can_export_excel(): void
    {
        $moderator = User::factory()->create([
            'role' => 'moderator',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($moderator);

        $response = $this->get('/api/moderator/applications-export');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringContainsString('conference_application_', (string) $response->headers->get('content-disposition'));
    }
}
