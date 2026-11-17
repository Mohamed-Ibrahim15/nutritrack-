<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class HealthCondition extends Model
{
    protected $fillable = ['name', 'description', 'type'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_health_conditions');
    }
}
