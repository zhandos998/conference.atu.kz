<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_verification_link_redirects_to_frontend_and_verifies_user(): void
    {
        $user = User::factory()->unverified()->create([
            'role' => 'user',
            'email' => 'verifyme@example.com',
        ]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(30),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->get($url);

        $response->assertRedirect('http://localhost:5173/?verified=1');
        $this->assertTrue((bool) $user->fresh()->hasVerifiedEmail());
    }
}
