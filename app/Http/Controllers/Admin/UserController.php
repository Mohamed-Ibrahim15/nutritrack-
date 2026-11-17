<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * GET /api/admin/users
     * Paginated list of all users.
     */
    public function index(Request $request)
    {
        $users = User::with('healthConditions:id,name')
            ->select('id', 'name', 'email', 'role', 'gender', 'age',
                     'height_cm', 'weight_kg', 'activity_level', 'goal',
                     'bmr', 'daily_calories', 'avatar', 'created_at')
            ->latest()
            ->paginate($request->query('per_page', 15));

        return response()->json($users);
    }

    /**
     * GET /api/admin/users/{id}
     * Full detail for a single user.
     */
    public function show($id)
    {
        $user = User::with([
            'healthConditions:id,name,type',
            'dietPlans' => fn ($q) => $q->where('is_active', true)->with('meals'),
            'activityPlans' => fn ($q) => $q->where('is_active', true)->with('exercises'),
            'progressLogs' => fn ($q) => $q->orderByDesc('logged_at')->take(10),
        ])->findOrFail($id);

        return response()->json(['user' => $user]);
    }

    /**
     * PUT /api/admin/users/{id}
     * Update any user field (admin can set role too).
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'email'          => 'sometimes|email|unique:users,email,' . $id,
            'role'           => 'sometimes|in:user,admin',
            'gender'         => 'sometimes|in:male,female|nullable',
            'age'            => 'sometimes|integer|min:1|max:120|nullable',
            'height_cm'      => 'sometimes|numeric|min:50|max:300|nullable',
            'weight_kg'      => 'sometimes|numeric|min:1|max:500|nullable',
            'activity_level' => 'sometimes|in:sedentary,lightly_active,moderately_active,very_active,extra_active|nullable',
            'goal'           => 'sometimes|in:lose_weight,maintain,gain_weight|nullable',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/users/{id}
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Cannot delete admin accounts.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * GET /api/admin/stats
     * Dashboard statistics.
     */
    public function stats()
    {
        return response()->json([
            'total_users'  => User::where('role', 'user')->count(),
            'total_admins' => User::where('role', 'admin')->count(),
            'new_today'    => User::whereDate('created_at', today())->count(),
        ]);
    }
}
