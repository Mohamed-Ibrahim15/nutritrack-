<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Spatie\OneTimePasswords\Models\Concerns\HasOneTimePasswords;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasOneTimePasswords;

    /** @var array<int,string> */
    protected $fillable = [
        'name', 'email', 'email_verified_at', 'password',
        'provider', 'provider_id', 'avatar',
        'role', 'gender', 'age', 'height_cm', 'weight_kg',
        'activity_level', 'goal', 'bmr', 'daily_calories',
    ];

    /** @var array<int,string> */
    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'bmr'               => 'float',
            'daily_calories'    => 'float',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function healthConditions(): BelongsToMany
    {
        return $this->belongsToMany(
            HealthCondition::class, 'user_health_conditions'
        )->withTimestamps();
    }

    public function dietPlans(): HasMany
    {
        return $this->hasMany(DietPlan::class);
    }

    public function activityPlans(): HasMany
    {
        return $this->hasMany(ActivityPlan::class);
    }

    public function progressLogs(): HasMany
    {
        return $this->hasMany(ProgressLog::class);
    }

    public function feedbacks(): HasMany
    {
        return $this->hasMany(Feedback::class);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Mifflin-St Jeor BMR formula.
     * Returns the BMR value (kcal/day) and saves both bmr and daily_calories.
     */
    public function calculateAndSaveBmr(): float
    {
        $w = (float) $this->weight_kg;
        $h = (float) $this->height_cm;
        $a = (int)   $this->age;

        if ($this->gender === 'female') {
            $bmr = (10 * $w) + (6.25 * $h) - (5 * $a) - 161;
        } else {
            $bmr = (10 * $w) + (6.25 * $h) - (5 * $a) + 5;
        }

        $multipliers = [
            'sedentary'         => 1.2,
            'lightly_active'    => 1.375,
            'moderately_active' => 1.55,
            'very_active'       => 1.725,
            'extra_active'      => 1.9,
        ];

        $multiplier  = $multipliers[$this->activity_level] ?? 1.2;
        $tdee        = round($bmr * $multiplier, 2);

        // Adjust for goal
        $dailyCalories = match ($this->goal) {
            'lose_weight'  => round($tdee - 500, 2),
            'gain_weight'  => round($tdee + 300, 2),
            default        => $tdee,
        };

        $this->bmr            = round($bmr, 2);
        $this->daily_calories = $dailyCalories;
        $this->save();

        return $bmr;
    }
}
