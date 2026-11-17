<?php

namespace App\Http\Controllers;

use App\Models\PasswordResetToken;
use App\Models\User;
use App\Mail\OtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Spatie\OneTimePasswords\Models\OneTimePassword;

class PasswordController extends Controller
{
    /**
     * POST /api/password/send-otp
     * Generate a Spatie OTP and email it to the user.
     */
    public function sendOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'Email not found',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'No account found with this email address.',
            ], 404);
        }

        OneTimePassword::query()
            ->where('authenticatable_type', $user->getMorphClass())
            ->where('authenticatable_id', $user->id)
            ->delete();

        $otp = $user->createOneTimePassword();

        Log::info('Sending password reset OTP email.', [
            'user_id' => $user->id,
            'email' => $user->email,
            'otp' => $otp->password,
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'encryption' => config('mail.mailers.smtp.encryption'),
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp->password));
        } catch (\Throwable $exception) {
            Log::error('Password reset OTP email failed.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Could not send OTP email. Please try again later.',
            ], 500);
        }

        Log::info('Password reset OTP email accepted by mail transport.', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return response()->json([
            'message' => 'OTP sent to your email. It expires in 10 minutes.',
        ]);
    }

    /**
     * POST /api/password/verify-otp
     * Consume the Spatie OTP and issue a short-lived reset token.
     */
    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'ok' => false,
                'message' => 'No account found with this email address.',
            ], 404);
        }

        $result = $user->consumeOneTimePassword($validated['otp']);

        if (! $result->isOk()) {
            return response()->json([
                'ok' => false,
                'message' => $result->validationMessage(),
            ], 422);
        }

        $plainToken = Str::random(64);

        PasswordResetToken::where('email', $user->email)->delete();
        PasswordResetToken::create([
            'email' => $user->email,
            'token' => Hash::make($plainToken),
            'expires_at' => now()->addMinutes(10),
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'OTP verified successfully',
            'reset_token' => $plainToken,
        ]);
    }

    /**
     * POST /api/password/reset
     * Reset using either a fresh Spatie OTP or a reset token from verifyOtp().
     */
    public function reset(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'otp' => 'required_without:reset_token|string',
            'reset_token' => 'required_without:otp|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'No account found with this email address.',
            ], 404);
        }

        if (! empty($validated['reset_token'])) {
            $resetToken = PasswordResetToken::where('email', $user->email)->first();

            if (
                ! $resetToken ||
                now()->greaterThan($resetToken->expires_at) ||
                ! Hash::check($validated['reset_token'], $resetToken->token)
            ) {
                optional($resetToken)->delete();

                return response()->json([
                    'message' => 'Invalid or expired reset token.',
                ], 422);
            }
        } else {
            $result = $user->consumeOneTimePassword($validated['otp']);

            if (! $result->isOk()) {
                return response()->json([
                    'message' => $result->validationMessage(),
                ], 422);
            }
        }

        $user->password = $validated['password'];
        $user->save();

        PasswordResetToken::where('email', $user->email)->delete();

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }
}
