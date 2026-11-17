<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_callback_creates_user_and_returns_token(): void
    {
        $this->mockGoogleUser('google-123', 'google@example.com', 'Google User', 'https://example.com/avatar.png');

        $this->getJson('/auth/google/callback')
            ->assertOk()
            ->assertJsonPath('user.email', 'google@example.com')
            ->assertJsonPath('user.provider', 'google')
            ->assertJsonStructure(['token', 'user' => ['email', 'name', 'provider', 'avatar']]);

        $this->assertDatabaseHas('users', [
            'email' => 'google@example.com',
            'provider' => 'google',
            'provider_id' => 'google-123',
        ]);
    }

    public function test_google_callback_logs_in_existing_user(): void
    {
        User::factory()->create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
        ]);

        $this->mockGoogleUser('google-456', 'existing@example.com', 'Existing Google', null);

        $this->getJson('/auth/google/callback')
            ->assertOk()
            ->assertJsonPath('user.email', 'existing@example.com')
            ->assertJsonPath('user.provider', 'google')
            ->assertJsonStructure(['token']);

        $this->assertSame(1, User::where('email', 'existing@example.com')->count());
        $this->assertDatabaseHas('users', [
            'email' => 'existing@example.com',
            'provider' => 'google',
            'provider_id' => 'google-456',
        ]);
    }

    private function mockGoogleUser(string $id, string $email, string $name, ?string $avatar): void
    {
        $googleUser = Mockery::mock();
        $googleUser->shouldReceive('getId')->andReturn($id);
        $googleUser->shouldReceive('getEmail')->andReturn($email);
        $googleUser->shouldReceive('getName')->andReturn($name);
        $googleUser->shouldReceive('getNickname')->andReturn(null);
        $googleUser->shouldReceive('getAvatar')->andReturn($avatar);

        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($googleUser);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturn($provider);
    }
}
