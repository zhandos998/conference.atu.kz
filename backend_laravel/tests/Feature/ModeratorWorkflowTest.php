<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\SystemSetting;
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
            'full_name' => 'Р ВР Р†Р В°Р Р… Р ВР Р†Р В°Р Р…Р С•Р Р†',
            'organization_position' => 'Р С’Р СћР Р€, Р СР В°Р С–Р С‘РЎРѓРЎвЂљРЎР‚Р В°Р Р…РЎвЂљ',
            'academic_degree' => 'Р СР В°Р С–Р С‘РЎРѓРЎвЂљРЎР‚',
            'phone' => '+77010000000',
            'email' => 'ivan@example.com',
            'supervisor_full_name' => 'Р СџР ВµРЎвЂљРЎР‚Р С•Р Р† Р Сџ.Р Сџ.',
            'supervisor_organization_position' => 'Р С’Р СћР Р€, Р С—РЎР‚Р С•РЎвЂћР ВµРЎРѓРЎРѓР С•РЎР‚',
            'supervisor_academic_degree' => 'Рґ.С‚.РЅ.',
            'department' => 'Кафедра информационных технологий',
            'report_title' => 'Р вЂќР С•Р С”Р В»Р В°Р Т‘ Р С—Р С• РЎвЂљР ВµР СР Вµ',
            'direction' => 'Р ВР Сћ',
            'participation_form' => 'Р С›РЎвЂЎР Р…Р С•',
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
            'moderator_comment' => 'Р вЂќР С•Р С”Р В»Р В°Р Т‘ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ.',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'accepted',
            'moderator_comment' => 'Р вЂќР С•Р С”Р В»Р В°Р Т‘ Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ.',
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

    public function test_moderator_can_toggle_submission_settings(): void
    {
        $moderator = User::factory()->create([
            'role' => 'moderator',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($moderator);

        $this->patchJson('/api/moderator/application-submission-settings', [
            'enabled' => false,
        ])->assertOk()->assertJson([
            'enabled' => false,
        ]);

        $this->assertFalse(SystemSetting::getBoolean(SystemSetting::KEY_APPLICATION_SUBMISSION_ENABLED, true));

        $this->getJson('/api/moderator/application-submission-settings')
            ->assertOk()
            ->assertJson([
                'enabled' => false,
            ]);
    }
}
