<?php

namespace Tests\Feature;

use App\Models\PasswordResetToken;
use App\Models\User;
use App\Mail\OtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Spatie\OneTimePasswords\Models\OneTimePassword;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_email_sends_spatie_otp(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'user@example.com']);

        $this->postJson('/api/password/send-otp', ['email' => 'user@example.com'])
            ->assertOk()
            ->assertJson(['message' => 'OTP sent to your email. It expires in 10 minutes.']);

        Mail::assertSent(OtpMail::class, function (OtpMail $mail) use ($user) {
            return $mail->hasTo($user->email);
        });
        $this->assertDatabaseHas('one_time_passwords', [
            'authenticatable_type' => User::class,
            'authenticatable_id' => $user->id,
        ]);
    }

    public function test_invalid_email_returns_error(): void
    {
        Mail::fake();

        $this->postJson('/api/password/send-otp', ['email' => 'missing@example.com'])
            ->assertUnprocessable()
            ->assertJson(['message' => 'Email not found']);

        Mail::assertNothingSent();
    }

    public function test_frontend_json_request_sends_otp_once(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'front@example.com']);

        $this->withHeaders([
            'Origin' => 'http://127.0.0.1:8000',
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->postJson('/api/password/send-otp', ['email' => 'front@example.com'])
            ->assertOk();

        Mail::assertSent(OtpMail::class, 1);
        Mail::assertSent(OtpMail::class, function (OtpMail $mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_otp_verification_consumes_otp_and_reset_token_resets_password(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => 'old-password',
        ]);

        $this->postJson('/api/password/send-otp', ['email' => 'reset@example.com'])->assertOk();

        $otp = OneTimePassword::query()->firstOrFail()->password;

        $verifyResponse = $this->postJson('/api/password/verify-otp', [
            'email' => 'reset@example.com',
            'otp' => $otp,
        ])->assertOk()
            ->assertJson(['ok' => true])
            ->json();

        $this->assertDatabaseCount('one_time_passwords', 0);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'reset@example.com']);

        $this->postJson('/api/password/reset', [
            'email' => 'reset@example.com',
            'reset_token' => $verifyResponse['reset_token'],
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()
            ->assertJson(['message' => 'Password reset successfully.']);

        $user->refresh();

        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertSame(0, PasswordResetToken::where('email', 'reset@example.com')->count());
    }

    public function test_reset_can_consume_fresh_spatie_otp_directly(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'direct@example.com',
            'password' => 'old-password',
        ]);

        $this->postJson('/api/password/send-otp', ['email' => 'direct@example.com'])->assertOk();

        $otp = OneTimePassword::query()->firstOrFail()->password;

        $this->postJson('/api/password/reset', [
            'email' => 'direct@example.com',
            'otp' => $otp,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
        $this->assertDatabaseCount('one_time_passwords', 0);
    }
}
