<?php

namespace App\Http\Controllers;

use App\Models\ActivityPlan;
use App\Models\Exercise;
use Illuminate\Http\Request;

class ActivityPlanController extends Controller
{
    /**
     * GET /api/activity-plan
     */
    public function show(Request $request)
    {
        $plan = $request->user()
            ->activityPlans()
            ->where('is_active', true)
            ->with(['exercises' => function ($q) {
                $q->withPivot('day_of_week', 'sets', 'reps')->orderBy('pivot_day_of_week');
            }])
            ->latest()
            ->first();

        if (! $plan) {
            return response()->json(['message' => 'No active activity plan. Please generate one.'], 404);
        }

        return response()->json(['activity_plan' => $plan]);
    }

    /**
     * POST /api/activity-plan/generate
     * Auto-generate a 7-day activity schedule based on the user's goal.
     */
    public function generate(Request $request)
    {
        $user = $request->user();
        $goal = $user->goal ?? 'maintain';

        // Map goal to desired difficulty
        $difficulty = match ($goal) {
            'lose_weight' => 'hard',
            'gain_weight' => 'medium',
            default       => 'easy',
        };

        // Deactivate previous plans
        $user->activityPlans()->update(['is_active' => false]);

        $plan = $user->activityPlans()->create([
            'title'       => 'Your 7-Day Activity Schedule',
            'description' => "Auto-generated ({$goal}) schedule — {$difficulty} intensity",
            'start_date'  => now()->toDateString(),
            'end_date'    => now()->addDays(6)->toDateString(),
            'is_active'   => true,
        ]);

        // Pick exercises by difficulty, fallback to any
        $exercises = Exercise::where('difficulty', $difficulty)->inRandomOrder()->take(7)->get();

        if ($exercises->count() < 7) {
            $more = Exercise::inRandomOrder()->take(7 - $exercises->count())->get();
            $exercises = $exercises->merge($more);
        }

        foreach (range(1, 7) as $day) {
            $exercise = $exercises->get($day - 1);
            if ($exercise) {
                $plan->exercises()->attach($exercise->id, [
                    'day_of_week' => $day,
                    'sets'        => 3,
                    'reps'        => 12,
                ]);
            }
        }

        return response()->json([
            'message'       => 'Activity plan generated successfully',
            'activity_plan' => $plan->load('exercises'),
        ], 201);
    }

    /**
     * PUT /api/admin/activity-plans/{id}  (admin)
     */
    public function adminUpdate(Request $request, $id)
    {
        $plan = ActivityPlan::findOrFail($id);

        $validated = $request->validate([
            'title'       => 'sometimes|string',
            'description' => 'sometimes|string|nullable',
            'start_date'  => 'sometimes|date|nullable',
            'end_date'    => 'sometimes|date|nullable',
            'is_active'   => 'sometimes|boolean',
        ]);

        $plan->update($validated);

        return response()->json([
            'message'       => 'Activity plan updated',
            'activity_plan' => $plan->fresh()->load('exercises'),
        ]);
    }

    /**
     * GET /api/admin/activity-plans  (admin)
     */
    public function adminIndex()
    {
        $plans = ActivityPlan::with('user:id,name,email')->latest()->paginate(20);
        return response()->json($plans);
    }

    /**
     * GET /api/admin/users/{userId}/activity-plan  (admin)
     */
    public function adminShowForUser($userId)
    {
        $plan = ActivityPlan::where('user_id', $userId)
            ->where('is_active', true)
            ->with('exercises')
            ->latest()
            ->first();

        if (! $plan) {
            return response()->json(['message' => 'No active activity plan for this user.'], 404);
        }

        return response()->json(['activity_plan' => $plan]);
    }
}
