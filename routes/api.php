<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HealthConditionController;
use App\Http\Controllers\DietPlanController;
use App\Http\Controllers\ActivityPlanController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\AdviceController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\ChatHistoryController;
use App\Http\Controllers\Admin\UserController    as AdminUserController;
use App\Http\Controllers\Admin\MealController    as AdminMealController;
use App\Http\Controllers\Admin\ExerciseController as AdminExerciseController;
use App\Http\Controllers\Admin\ReportController   as AdminReportController;
use App\Models\User;

// ── Health check ────────────────────────────────────────────────────────────
Route::get('/test', fn () => response()->json(['message' => 'API is working', 'version' => '2.0']));

// ── Public Content (Advice & Articles) ───────────────────────────────────────
Route::get('/advice',       [AdviceController::class, 'index']);
Route::get('/advice/{id}',  [AdviceController::class, 'show']);

// ── AI Assistant (Public / Guest & Authenticated with optional token) ──────
Route::post('/assistant', [AssistantController::class, 'chat']);

// ── Auth (public) ────────────────────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Google OAuth
Route::get('/auth/google/redirect',  [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback',  [AuthController::class, 'handleGoogleCallback']);

// ── Password reset (public) ──────────────────────────────────────────────────
Route::prefix('password')->group(function () {
    Route::post('/send-otp',   [PasswordController::class, 'sendOtp']);
    Route::post('/verify-otp', [PasswordController::class, 'verifyOtp']);
    Route::post('/reset',      [PasswordController::class, 'reset']);
});

// ── Authenticated user routes ────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    fn (\Illuminate\Http\Request $r) => response()->json([
        'user' => array_merge(
            $r->user()->load('healthConditions:id,name')->toArray(),
            ['health_condition_ids' => $r->user()->healthConditions->pluck('id')]
        )
    ]));

    // Profile
    Route::get('/profile',                   [ProfileController::class, 'show']);
    Route::put('/profile',                   [ProfileController::class, 'update']);
    Route::post('/profile/health-info',      [ProfileController::class, 'submitHealthInfo']);
    Route::patch('/profile/password',        [ProfileController::class, 'changePassword']);
    Route::delete('/user',                   [ProfileController::class, 'deleteAccount']);

    // Chat history
    Route::get('/chat-history',        [ChatHistoryController::class, 'index']);
    Route::delete('/chat-history',     [ChatHistoryController::class, 'destroy']);

    // Health Conditions (lookup list)
    Route::get('/health-conditions',         [HealthConditionController::class, 'index']);

    // Meals (read-only for users)
    Route::get('/meals',       [AdminMealController::class, 'index']);
    Route::get('/meals/{id}',  [AdminMealController::class, 'show']);

    // Exercises (read-only for users)
    Route::get('/exercises',       [AdminExerciseController::class, 'index']);
    Route::get('/exercises/{id}',  [AdminExerciseController::class, 'show']);

    // Diet Plan
    Route::get('/diet-plan',          [DietPlanController::class, 'show']);
    Route::post('/diet-plan/generate',[DietPlanController::class, 'generate']);

    // Activity Plan
    Route::get('/activity-plan',          [ActivityPlanController::class, 'show']);
    Route::post('/activity-plan/generate',[ActivityPlanController::class, 'generate']);

    // Progress
    Route::get('/progress',        [ProgressController::class, 'index']);
    Route::post('/progress',       [ProgressController::class, 'store']);
    Route::delete('/progress/{id}',[ProgressController::class, 'destroy']);

    // Feedback
    Route::get('/feedback',  [FeedbackController::class, 'index']);
    Route::post('/feedback', [FeedbackController::class, 'store']);

    // ── Admin-only routes ────────────────────────────────────────────────────
    Route::middleware('admin')->prefix('admin')->group(function () {

        // Dashboard stats
        Route::get('/stats',           [AdminUserController::class, 'stats']);

        // User management
        Route::get('/users',           [AdminUserController::class, 'index']);
        Route::get('/users/{id}',      [AdminUserController::class, 'show']);
        Route::put('/users/{id}',      [AdminUserController::class, 'update']);
        Route::delete('/users/{id}',   [AdminUserController::class, 'destroy']);

        // User diet/activity plans
        Route::get('/users/{userId}/diet-plan',     [DietPlanController::class,      'adminShowForUser']);
        Route::get('/users/{userId}/activity-plan', [ActivityPlanController::class,  'adminShowForUser']);

        // Diet plans management
        Route::get('/diet-plans',          [DietPlanController::class,     'adminIndex']);
        Route::put('/diet-plans/{id}',     [DietPlanController::class,     'adminUpdate']);

        // Activity plans management
        Route::get('/activity-plans',      [ActivityPlanController::class, 'adminIndex']);
        Route::put('/activity-plans/{id}', [ActivityPlanController::class, 'adminUpdate']);

        // Meals CRUD
        Route::post('/meals',               [AdminMealController::class, 'store']);
        Route::put('/meals/{id}',           [AdminMealController::class, 'update']);
        Route::delete('/meals/{id}',        [AdminMealController::class, 'destroy']);
        Route::post('/meals/{id}/image',    [AdminMealController::class, 'uploadImage']);
        Route::delete('/meals/{id}/image',  [AdminMealController::class, 'deleteImage']);

        // Exercises CRUD
        Route::post('/exercises',         [AdminExerciseController::class, 'store']);
        Route::put('/exercises/{id}',     [AdminExerciseController::class, 'update']);
        Route::delete('/exercises/{id}',  [AdminExerciseController::class, 'destroy']);

        // Advice CRUD
        Route::post('/advice',         [AdviceController::class, 'store']);
        Route::put('/advice/{id}',     [AdviceController::class, 'update']);
        Route::delete('/advice/{id}',  [AdviceController::class, 'destroy']);

        // Feedback (admin view)
        Route::get('/feedback',        [FeedbackController::class, 'adminIndex']);

        // Reports
        Route::get('/reports/progress',             [AdminReportController::class, 'progressReport']);
        Route::get('/reports/progress/{userId}',    [AdminReportController::class, 'userProgressReport']);
    });
});
