<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Meal extends Model
{
    protected $fillable = [
        'name', 'description', 'calories',
        'protein_g', 'carbs_g', 'fat_g',
        'meal_type', 'image_url',
    ];

    public function dietPlans(): BelongsToMany
    {
        return $this->belongsToMany(DietPlan::class, 'diet_plan_meals')
                    ->withPivot('day_of_week', 'meal_time')
                    ->withTimestamps();
    }
}
