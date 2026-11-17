<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgressLog;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * GET /api/admin/reports/progress
     * All users' progress logs with user info.
     */
    public function progressReport(Request $request)
    {
        $logs = ProgressLog::with('user:id,name,email')
            ->orderByDesc('logged_at')
            ->paginate($request->query('per_page', 20));

        return response()->json($logs);
    }

    /**
     * GET /api/admin/reports/progress/{userId}
     * Progress logs for a specific user.
     */
    public function userProgressReport($userId)
    {
        $user = User::findOrFail($userId);

        $logs = $user->progressLogs()
            ->orderByDesc('logged_at')
            ->get();

        return response()->json([
            'user'          => $user->only('id', 'name', 'email', 'weight_kg'),
            'progress_logs' => $logs,
        ]);
    }
}
