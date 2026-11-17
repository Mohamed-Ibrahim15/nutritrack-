<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DietPlan extends Model
{
    protected $fillable = [
        'user_id', 'title', 'description',
        'total_calories', 'start_date', 'end_date', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'start_date'  => 'date',
        'end_date'    => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function meals(): BelongsToMany
    {
        return $this->belongsToMany(Meal::class, 'diet_plan_meals')
                    ->withPivot('day_of_week', 'meal_time')
                    ->withTimestamps();
    }
}
