<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('health_conditions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('type')->nullable(); // e.g. chronic, dietary, lifestyle
            $table->timestamps();
        });

        Schema::create('user_health_conditions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('health_condition_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'health_condition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_health_conditions');
        Schema::dropIfExists('health_conditions');
    }
};
