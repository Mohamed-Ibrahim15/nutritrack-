<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Exercise extends Model
{
    protected $fillable = [
        'name', 'description', 'duration_minutes',
        'calories_burned', 'difficulty', 'muscle_group',
    ];

    public function activityPlans(): BelongsToMany
    {
        return $this->belongsToMany(ActivityPlan::class, 'activity_plan_exercises')
                    ->withPivot('day_of_week', 'sets', 'reps')
                    ->withTimestamps();
    }

    public function feedbacks()
    {
        return $this->hasMany(Feedback::class);
    }
}
