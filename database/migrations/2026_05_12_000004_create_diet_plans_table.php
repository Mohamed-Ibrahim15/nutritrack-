<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diet_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('total_calories', 8, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('diet_plan_meals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diet_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('meal_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1=Mon … 7=Sun
            $table->enum('meal_time', ['breakfast', 'lunch', 'dinner', 'snack'])->default('lunch');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diet_plan_meals');
        Schema::dropIfExists('diet_plans');
    }
};
