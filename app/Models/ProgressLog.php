<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgressLog extends Model
{
    protected $fillable = ['user_id', 'weight_kg', 'notes', 'logged_at'];

    protected $casts = [
        'logged_at'  => 'date',
        'weight_kg'  => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
