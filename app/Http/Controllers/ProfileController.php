<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * GET /api/profile
     * Return the authenticated user's full profile.
     */
    public function show(Request $request)
    {
        $user = $request->user()->load('healthConditions');

        return response()->json([
            'user' => array_merge($user->toArray(), [
                'health_conditions' => $user->healthConditions->pluck('id'),
            ]),
        ]);
    }

    /**
     * PUT /api/profile
     * Update basic profile fields.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'gender'         => 'sometimes|in:male,female',
            'age'            => 'sometimes|integer|min:1|max:120',
            'height_cm'      => 'sometimes|numeric|min:50|max:300',
            'weight_kg'      => 'sometimes|numeric|min:1|max:500',
            'activity_level' => 'sometimes|in:sedentary,lightly_active,moderately_active,very_active,extra_active',
            'goal'           => 'sometimes|in:lose_weight,maintain,gain_weight',
            'avatar'         => 'sometimes|string|nullable',
        ]);

        $user = $request->user();
        $user->fill($validated)->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * POST /api/profile/health-info
     * Submit full health info and auto-calculate BMR.
     */
    public function submitHealthInfo(Request $request)
    {
        $validated = $request->validate([
            'gender'               => 'required|in:male,female',
            'age'                  => 'required|integer|min:1|max:120',
            'height_cm'            => 'required|numeric|min:50|max:300',
            'weight_kg'            => 'required|numeric|min:1|max:500',
            'activity_level'       => 'required|in:sedentary,lightly_active,moderately_active,very_active,extra_active',
            'goal'                 => 'required|in:lose_weight,maintain,gain_weight',
            'health_condition_ids' => 'sometimes|array',
            'health_condition_ids.*' => 'integer|exists:health_conditions,id',
        ]);

        $user = $request->user();

        $user->fill([
            'gender'         => $validated['gender'],
            'age'            => $validated['age'],
            'height_cm'      => $validated['height_cm'],
            'weight_kg'      => $validated['weight_kg'],
            'activity_level' => $validated['activity_level'],
            'goal'           => $validated['goal'],
        ])->save();

        // Sync health conditions
        if (isset($validated['health_condition_ids'])) {
            $user->healthConditions()->sync($validated['health_condition_ids']);
        }

        // Calculate & persist BMR / daily calories
        $bmr = $user->calculateAndSaveBmr();

        return response()->json([
            'message'        => 'Health info saved and BMR calculated',
            'bmr'            => round($bmr, 2),
            'daily_calories' => $user->daily_calories,
            'user'           => $user->fresh()->load('healthConditions'),
        ]);
    }

    /**
     * PATCH /api/profile/password
     * Change the authenticated user's password (not available for Google/social accounts).
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6',
        ]);

        $user = $request->user();

        // Prevent password changes for social-auth accounts
        if ($user->provider && $user->provider !== 'local') {
            return response()->json([
                'message' => 'Password cannot be changed for social login accounts.',
            ], 422);
        }

        if (! \Illuminate\Support\Facades\Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => $validated['new_password']]);

        return response()->json(['message' => 'Password changed successfully']);
    }

    /**
     * DELETE /api/user
     * Permanently delete the authenticated user's account.
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // Revoke all tokens first
        $user->tokens()->delete();

        // Delete the account
        $user->delete();

        return response()->json(['message' => 'Account deleted successfully']);
    }
}
