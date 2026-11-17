<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ActivityPlan extends Model
{
    protected $fillable = [
        'user_id', 'title', 'description',
        'start_date', 'end_date', 'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function exercises(): BelongsToMany
    {
        return $this->belongsToMany(Exercise::class, 'activity_plan_exercises')
                    ->withPivot('day_of_week', 'sets', 'reps')
                    ->withTimestamps();
    }
}
