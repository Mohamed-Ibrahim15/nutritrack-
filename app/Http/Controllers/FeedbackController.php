<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    /**
     * GET /api/feedback
     * List the authenticated user's exercise feedback.
     */
    public function index(Request $request)
    {
        $feedbacks = $request->user()
            ->feedbacks()
            ->with('exercise:id,name,difficulty')
            ->latest()
            ->get();

        return response()->json(['feedbacks' => $feedbacks]);
    }

    /**
     * POST /api/feedback
     * Submit feedback for an exercise.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'exercise_id' => 'sometimes|integer|exists:exercises,id|nullable',
            'rating'      => 'required|integer|min:1|max:5',
            'comment'     => 'sometimes|string|nullable|max:2000',
        ]);

        $feedback = $request->user()->feedbacks()->create($validated);

        return response()->json([
            'message'  => 'Feedback submitted successfully',
            'feedback' => $feedback->load('exercise:id,name'),
        ], 201);
    }

    /**
     * GET /api/admin/feedback   (admin)
     * List all users' feedback.
     */
    public function adminIndex()
    {
        $feedbacks = Feedback::with([
            'user:id,name,email',
            'exercise:id,name',
        ])->latest()->paginate(20);

        return response()->json($feedbacks);
    }
}
