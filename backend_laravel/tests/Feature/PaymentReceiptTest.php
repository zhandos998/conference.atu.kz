<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_receipt_upload_allowed_only_for_accepted_application(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $pending = Application::create([
            'user_id' => $user->id,
            'full_name' => 'Иван Иванов',
            'organization_position' => 'АТУ',
            'academic_degree' => 'бакалавр',
            'phone' => '+77010000000',
            'email' => 'ivan@example.com',
            'supervisor_full_name' => 'Петров П.П.',
            'supervisor_organization_position' => 'доцент',
            'supervisor_academic_degree' => 'к.т.н.',
            'report_title' => 'Доклад 1',
            'direction' => 'Направление 1',
            'participation_form' => 'Очно',
            'hotel_booking_needed' => false,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($user);

        $file = UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf');

        $blocked = $this->post('/api/applications/' . $pending->id . '/payment-receipt', [
            'payment_receipt' => $file,
        ]);

        $blocked->assertStatus(422);

        $pending->update(['status' => 'accepted']);

        $allowed = $this->post('/api/applications/' . $pending->id . '/payment-receipt', [
            'payment_receipt' => UploadedFile::fake()->create('receipt2.pdf', 100, 'application/pdf'),
        ]);

        $allowed->assertOk();

        $this->assertNotNull($pending->fresh()->payment_receipt_path);
        Storage::disk('public')->assertExists($pending->fresh()->payment_receipt_path);
    }
}
