<?php

namespace App\Http\Controllers;

use App\Models\ProgressLog;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    /**
     * GET /api/progress
     * List the authenticated user's progress logs (newest first).
     */
    public function index(Request $request)
    {
        $logs = $request->user()
            ->progressLogs()
            ->orderByDesc('logged_at')
            ->get();

        return response()->json(['progress_logs' => $logs]);
    }

    /**
     * POST /api/progress
     * Log a new weight entry.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'weight_kg' => 'required|numeric|min:1|max:500',
            'notes'     => 'sometimes|string|nullable|max:1000',
            'logged_at' => 'sometimes|date',
        ]);

        $log = $request->user()->progressLogs()->create([
            'weight_kg' => $validated['weight_kg'],
            'notes'     => $validated['notes'] ?? null,
            'logged_at' => $validated['logged_at'] ?? now()->toDateString(),
        ]);

        // Update the user's current weight
        $request->user()->update(['weight_kg' => $validated['weight_kg']]);

        return response()->json([
            'message'      => 'Progress logged successfully',
            'progress_log' => $log,
        ], 201);
    }

    /**
     * DELETE /api/progress/{id}
     */
    public function destroy(Request $request, $id)
    {
        $log = $request->user()->progressLogs()->findOrFail($id);
        $log->delete();

        return response()->json(['message' => 'Progress log deleted']);
    }
}
