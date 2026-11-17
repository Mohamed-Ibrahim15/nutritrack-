<?php

namespace App\Http\Controllers;

use App\Models\Advice;
use Illuminate\Http\Request;

class AdviceController extends Controller
{
    /**
     * GET /api/advice
     * List all advice articles (public for authenticated users).
     */
    public function index(Request $request)
    {
        $category = $request->query('category');

        $query = Advice::with('author:id,name')
            ->latest();

        if ($category) {
            $query->where('category', $category);
        }

        return response()->json(['advice' => $query->get()]);
    }

    /**
     * GET /api/advice/{id}
     */
    public function show($id)
    {
        $advice = Advice::with('author:id,name')->findOrFail($id);
        return response()->json(['advice' => $advice]);
    }

    /**
     * POST /api/admin/advice  (admin)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'content'  => 'required|string',
            'category' => 'sometimes|string|nullable|max:100',
        ]);

        $advice = Advice::create(array_merge($validated, [
            'created_by' => $request->user()->id,
        ]));

        return response()->json([
            'message' => 'Advice created successfully',
            'advice'  => $advice,
        ], 201);
    }

    /**
     * PUT /api/admin/advice/{id}  (admin)
     */
    public function update(Request $request, $id)
    {
        $advice = Advice::findOrFail($id);

        $validated = $request->validate([
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'category' => 'sometimes|string|nullable|max:100',
        ]);

        $advice->update($validated);

        return response()->json([
            'message' => 'Advice updated successfully',
            'advice'  => $advice->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/advice/{id}  (admin)
     */
    public function destroy($id)
    {
        $advice = Advice::findOrFail($id);
        $advice->delete();

        return response()->json(['message' => 'Advice deleted successfully']);
    }
}
