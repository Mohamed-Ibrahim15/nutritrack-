<?php



use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    $path = public_path('index.html');
    if (file_exists($path)) {
        return response(file_get_contents($path))->header('Content-Type', 'text/html; charset=utf-8');
    }
    return response('NutriTrack is Live', 200);
});

Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
