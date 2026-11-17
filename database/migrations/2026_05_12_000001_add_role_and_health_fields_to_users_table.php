<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['user', 'admin'])->default('user')->after('email');
            }
            if (! Schema::hasColumn('users', 'gender')) {
                $table->string('gender')->nullable()->after('role');
            }
            if (! Schema::hasColumn('users', 'age')) {
                $table->unsignedTinyInteger('age')->nullable()->after('gender');
            }
            if (! Schema::hasColumn('users', 'height_cm')) {
                $table->decimal('height_cm', 5, 2)->nullable()->after('age');
            }
            if (! Schema::hasColumn('users', 'weight_kg')) {
                $table->decimal('weight_kg', 5, 2)->nullable()->after('height_cm');
            }
            if (! Schema::hasColumn('users', 'activity_level')) {
                $table->enum('activity_level', [
                    'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'
                ])->nullable()->after('weight_kg');
            }
            if (! Schema::hasColumn('users', 'goal')) {
                $table->enum('goal', ['lose_weight', 'maintain', 'gain_weight'])->nullable()->after('activity_level');
            }
            if (! Schema::hasColumn('users', 'bmr')) {
                $table->decimal('bmr', 8, 2)->nullable()->after('goal');
            }
            if (! Schema::hasColumn('users', 'daily_calories')) {
                $table->decimal('daily_calories', 8, 2)->nullable()->after('bmr');
            }
            if (! Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable()->after('daily_calories');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = ['role', 'gender', 'age', 'height_cm', 'weight_kg',
                     'activity_level', 'goal', 'bmr', 'daily_calories', 'avatar'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
