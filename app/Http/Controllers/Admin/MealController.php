<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Meal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MealController extends Controller
{
    /** GET /api/meals  (public, authenticated) */
    public function index(Request $request)
    {
        $type  = $request->query('type');
        $query = Meal::latest();

        if ($type) {
            $query->where('meal_type', $type);
        }

        return response()->json(['meals' => $query->get()]);
    }

    /** GET /api/meals/{id} */
    public function show($id)
    {
        return response()->json(['meal' => Meal::findOrFail($id)]);
    }

    /** POST /api/admin/meals */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'description' => 'sometimes|string|nullable',
            'calories'  => 'required|numeric|min:0',
            'protein_g' => 'sometimes|numeric|min:0',
            'carbs_g'   => 'sometimes|numeric|min:0',
            'fat_g'     => 'sometimes|numeric|min:0',
            'meal_type' => 'required|in:breakfast,lunch,dinner,snack',
            'image_url' => 'sometimes|string|nullable',
        ]);

        $meal = Meal::create($validated);

        return response()->json([
            'message' => 'Meal created successfully',
            'meal'    => $meal,
        ], 201);
    }

    /** PUT /api/admin/meals/{id} */
    public function update(Request $request, $id)
    {
        $meal = Meal::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'sometimes|string|nullable',
            'calories'    => 'sometimes|numeric|min:0',
            'protein_g'   => 'sometimes|numeric|min:0',
            'carbs_g'     => 'sometimes|numeric|min:0',
            'fat_g'       => 'sometimes|numeric|min:0',
            'meal_type'   => 'sometimes|in:breakfast,lunch,dinner,snack',
            'image_url'   => 'sometimes|string|nullable',
        ]);

        $meal->update($validated);

        return response()->json([
            'message' => 'Meal updated successfully',
            'meal'    => $meal->fresh(),
        ]);
    }

    /** DELETE /api/admin/meals/{id} */
    public function destroy($id)
    {
        $meal = Meal::findOrFail($id);
        // Delete stored image file if it exists
        if ($meal->image_url && str_contains($meal->image_url, '/storage/')) {
            $path = str_replace('/storage/', 'public/', parse_url($meal->image_url, PHP_URL_PATH));
            Storage::delete($path);
        }
        $meal->delete();
        return response()->json(['message' => 'Meal deleted successfully']);
    }

    /** POST /api/admin/meals/{id}/image */
    public function uploadImage(Request $request, $id)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $meal = Meal::findOrFail($id);

        // Delete old image file if it was a stored upload
        if ($meal->image_url && str_contains($meal->image_url, '/storage/meal_images/')) {
            $oldPath = 'public/meal_images/' . basename($meal->image_url);
            Storage::delete($oldPath);
        }

        $file = $request->file('image');
        $filename = 'meal_' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
        $file->storeAs('public/meal_images', $filename);

        $url = url('/storage/meal_images/' . $filename);
        $meal->update(['image_url' => $url]);

        return response()->json([
            'message'   => 'Image uploaded successfully',
            'image_url' => $url,
            'meal'      => $meal->fresh(),
        ]);
    }

    /** DELETE /api/admin/meals/{id}/image */
    public function deleteImage($id)
    {
        $meal = Meal::findOrFail($id);

        if ($meal->image_url && str_contains($meal->image_url, '/storage/meal_images/')) {
            $oldPath = 'public/meal_images/' . basename($meal->image_url);
            Storage::delete($oldPath);
        }

        $meal->update(['image_url' => null]);

        return response()->json([
            'message' => 'Image removed successfully',
            'meal'    => $meal->fresh(),
        ]);
    }
}
