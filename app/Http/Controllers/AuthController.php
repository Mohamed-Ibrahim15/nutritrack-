<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    /** Admin emails that are auto-assigned the admin role */
    private const ADMIN_EMAILS = [
        'admin@healthsystem.com',
        'mohamedali@example.com',
    ];

    /**
     * POST /api/register
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $role = in_array(strtolower($request->email), self::ADMIN_EMAILS) ? 'admin' : 'user';

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password,
            'role'     => $role,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ], 201);
    }

    /**
     * POST /api/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Revoke previous tokens (optional single-session enforcement)
        // $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'     => $user->id,
                'name'   => $user->name,
                'email'  => $user->email,
                'role'   => $user->role,
                'avatar' => $user->avatar,
            ],
        ]);
    }

    /**
     * POST /api/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * GET /api/auth/google/redirect
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * GET /api/auth/google/callback
     */
    public function handleGoogleCallback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            $user->forceFill([
                'provider'    => 'google',
                'provider_id' => $user->provider_id ?: $googleUser->getId(),
                'avatar'      => $googleUser->getAvatar(),
            ])->save();
        } else {
            $role = in_array(strtolower($googleUser->getEmail()), self::ADMIN_EMAILS) ? 'admin' : 'user';

            $user = User::create([
                'name'              => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email'             => $googleUser->getEmail(),
                'password'          => Str::random(32),
                'provider'          => 'google',
                'provider_id'       => $googleUser->getId(),
                'avatar'            => $googleUser->getAvatar(),
                'email_verified_at' => now(),
                'role'              => $role,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        if (request()->expectsJson()) {
            return response()->json([
                'token' => $token,
                'user'  => [
                    'id'       => $user->id,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'role'     => $user->role,
                    'provider' => $user->provider,
                    'avatar'   => $user->avatar,
                ],
            ]);
        }

        $targetUrl = $user->role === 'admin' ? '/pages/admin/index.html' : '/pages/home.html';
        $sessionPayload = json_encode([
            'email'      => $user->email,
            'name'       => $user->name,
            'role'       => $user->role,
            'provider'   => 'google',
            'loggedInAt' => now()->toISOString(),
        ]);

        return response(
            "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Redirecting...</title></head><body>" .
            "<script>" .
            "localStorage.setItem('nutri_auth_access_token', " . json_encode($token) . ");" .
            "localStorage.setItem('nutri_user_role', " . json_encode($user->role) . ");" .
            "localStorage.setItem('nutri_auth_session', " . json_encode($sessionPayload) . ");" .
            "window.location.href = " . json_encode($targetUrl) . ";" .
            "</script></body></html>"
        )->header('Content-Type', 'text/html');
    }
}
