<?php

namespace App\Http\Controllers;

use App\Models\DietPlan;
use App\Models\Meal;
use Illuminate\Http\Request;

class DietPlanController extends Controller
{
    /**
     * GET /api/diet-plan
     * Return the user's active diet plan with meals.
     */
    public function show(Request $request)
    {
        $plan = $request->user()
            ->dietPlans()
            ->where('is_active', true)
            ->with(['meals' => function ($q) {
                $q->withPivot('day_of_week', 'meal_time')->orderBy('pivot_day_of_week');
            }])
            ->latest()
            ->first();

        if (! $plan) {
            return response()->json(['message' => 'No active diet plan. Please generate one.'], 404);
        }

        return response()->json(['diet_plan' => $plan]);
    }

    /**
     * POST /api/diet-plan/generate
     * Auto-generate a 7-day diet plan based on the user's calorie target.
     */
    public function generate(Request $request)
    {
        $user = $request->user();

        if (! $user->daily_calories) {
            return response()->json([
                'message' => 'Please submit your health info first to calculate daily calories.',
            ], 422);
        }

        // Deactivate previous plans
        $user->dietPlans()->update(['is_active' => false]);

        $target   = $user->daily_calories;
        $goal     = $user->goal ?? 'maintain';

        // Create the plan
        $plan = $user->dietPlans()->create([
            'title'          => 'Your Personalised Diet Plan',
            'description'    => "Auto-generated plan targeting {$target} kcal/day ({$goal})",
            'total_calories' => $target,
            'start_date'     => now()->toDateString(),
            'end_date'       => now()->addDays(6)->toDateString(),
            'is_active'      => true,
        ]);

        // Distribute meals across 7 days × 4 meal slots
        $mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        $pivotData  = [];

        foreach ($mealTypes as $type) {
            $meals = Meal::where('meal_type', $type)->inRandomOrder()->take(7)->get();

            // Pad if fewer than 7 exist
            while ($meals->count() < 7) {
                $fallback = Meal::where('meal_type', $type)->inRandomOrder()->first();
                if ($fallback) {
                    $meals->push($fallback);
                } else {
                    break;
                }
            }

            foreach (range(1, 7) as $day) {
                $meal = $meals->get($day - 1);
                if ($meal) {
                    $pivotData[] = [
                        'meal_id'     => $meal->id,
                        'day_of_week' => $day,
                        'meal_time'   => $type,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ];
                }
            }
        }

        // Bulk insert pivot rows
        foreach ($pivotData as $row) {
            $plan->meals()->attach($row['meal_id'], [
                'day_of_week' => $row['day_of_week'],
                'meal_time'   => $row['meal_time'],
            ]);
        }

        return response()->json([
            'message'   => 'Diet plan generated successfully',
            'diet_plan' => $plan->load('meals'),
        ], 201);
    }

    /**
     * PUT /api/admin/diet-plans/{id}  (admin)
     */
    public function adminUpdate(Request $request, $id)
    {
        $plan = DietPlan::findOrFail($id);

        $validated = $request->validate([
            'title'          => 'sometimes|string',
            'description'    => 'sometimes|string|nullable',
            'total_calories' => 'sometimes|numeric',
            'start_date'     => 'sometimes|date|nullable',
            'end_date'       => 'sometimes|date|nullable',
            'is_active'      => 'sometimes|boolean',
        ]);

        $plan->update($validated);

        return response()->json(['message' => 'Diet plan updated', 'diet_plan' => $plan->fresh()->load('meals')]);
    }

    /**
     * GET /api/admin/users/{userId}/diet-plan  (admin)
     */
    public function adminShowForUser($userId)
    {
        $plan = DietPlan::where('user_id', $userId)
            ->where('is_active', true)
            ->with('meals')
            ->latest()
            ->first();

        if (! $plan) {
            return response()->json(['message' => 'No active diet plan for this user.'], 404);
        }

        return response()->json(['diet_plan' => $plan]);
    }

    /**
     * GET /api/admin/diet-plans  (admin)
     */
    public function adminIndex()
    {
        $plans = DietPlan::with('user:id,name,email')->latest()->paginate(20);
        return response()->json($plans);
    }
}
