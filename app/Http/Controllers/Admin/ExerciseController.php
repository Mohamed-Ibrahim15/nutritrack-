<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use Illuminate\Http\Request;

class ExerciseController extends Controller
{
    /** GET /api/exercises  (authenticated users) */
    public function index(Request $request)
    {
        $difficulty   = $request->query('difficulty');
        $muscleGroup  = $request->query('muscle_group');
        $query        = Exercise::latest();

        if ($difficulty) {
            $query->where('difficulty', $difficulty);
        }
        if ($muscleGroup) {
            $query->where('muscle_group', $muscleGroup);
        }

        return response()->json(['exercises' => $query->get()]);
    }

    /** GET /api/exercises/{id} */
    public function show($id)
    {
        return response()->json(['exercise' => Exercise::findOrFail($id)]);
    }

    /** POST /api/admin/exercises */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'description'       => 'sometimes|string|nullable',
            'duration_minutes'  => 'required|integer|min:1',
            'calories_burned'   => 'required|numeric|min:0',
            'difficulty'        => 'required|in:easy,medium,hard',
            'muscle_group'      => 'sometimes|string|nullable',
        ]);

        $exercise = Exercise::create($validated);

        return response()->json([
            'message'  => 'Exercise created successfully',
            'exercise' => $exercise,
        ], 201);
    }

    /** PUT /api/admin/exercises/{id} */
    public function update(Request $request, $id)
    {
        $exercise  = Exercise::findOrFail($id);

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'description'      => 'sometimes|string|nullable',
            'duration_minutes' => 'sometimes|integer|min:1',
            'calories_burned'  => 'sometimes|numeric|min:0',
            'difficulty'       => 'sometimes|in:easy,medium,hard',
            'muscle_group'     => 'sometimes|string|nullable',
        ]);

        $exercise->update($validated);

        return response()->json([
            'message'  => 'Exercise updated successfully',
            'exercise' => $exercise->fresh(),
        ]);
    }

    /** DELETE /api/admin/exercises/{id} */
    public function destroy($id)
    {
        Exercise::findOrFail($id)->delete();
        return response()->json(['message' => 'Exercise deleted successfully']);
    }
}
