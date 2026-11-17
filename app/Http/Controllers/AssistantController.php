<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\ChatHistory;

class AssistantController extends Controller
{
    /**
     * Handle a POST /api/assistant request.
     *
     * Validates the incoming message, enriches it with user profile context,
     * forwards it to Google Gemini, and returns the reply as JSON.
     */
    public function chat(Request $request)
    {
        // ── 1. Validate input ────────────────────────────────────────────────
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $userMessage = trim($validated['message']);

        // ── 2. Read Gemini credentials from .env ─────────────────────────────
        $apiKey = config('services.gemini.key');
        $model  = config('services.gemini.model', 'gemini-2.5-flash');

        if (empty($apiKey)) {
            Log::error('[AssistantController] GEMINI_API_KEY is not set.');
            return response()->json([
                'reply' => 'AI service is not configured. Please contact the administrator.',
            ], 503);
        }

        // ── 3. Build context block from authenticated user (or optional token) ──
        $user    = $request->user('sanctum') ?? $request->user();
        $profile = $request->input('context.profile', []);

        $bmr    = $user?->bmr           ? round($user->bmr)           : ($profile['bmr']            ?? null);
        $tdee   = $user?->tdee          ? round($user->tdee)          : ($profile['tdee']           ?? null);
        $target = $user?->daily_calories ? round($user->daily_calories) : ($profile['targetCalories'] ?? null);
        $goal   = $user?->goal          ?? ($profile['goal']   ?? 'maintain');
        $weight = $user?->weight_kg     ?? ($profile['weightKg'] ?? null);
        $height = $user?->height_cm     ?? ($profile['heightCm'] ?? null);
        $age    = $user?->age           ?? ($profile['age']     ?? null);
        $name   = $user?->name          ?? 'there';

        $contextLines = [];
        if ($bmr)    $contextLines[] = "BMR: {$bmr} kcal/day";
        if ($tdee)   $contextLines[] = "TDEE (maintenance): {$tdee} kcal/day";
        if ($target) $contextLines[] = "Daily calorie target: {$target} kcal/day";
        if ($goal)   $contextLines[] = "Goal: {$goal}";
        if ($weight) $contextLines[] = "Weight: {$weight} kg";
        if ($height) $contextLines[] = "Height: {$height} cm";
        if ($age)    $contextLines[] = "Age: {$age}";

        $contextBlock = empty($contextLines)
            ? 'No profile data available. Encourage the user to visit Track Calories and calculate their BMR.'
            : implode(', ', $contextLines) . '.';

        // ── 4. Build Gemini prompt ────────────────────────────────────────────
        $systemInstruction =
            "You are NutriTrack's friendly, evidence-based nutrition and fitness coach. " .
            "Your name is NutriBot. " .
            "Always respond in the same language the user speaks (Arabic if the user speaks Arabic, English if English). " .
            "Always use the client metrics provided when giving specific advice. " .
            "Keep replies practical, supportive, and concise (under 250 words unless the user explicitly asks for detail). " .
            "Never diagnose medical conditions or replace professional medical advice — encourage consulting a doctor when relevant. " .
            "If the user asks about anything unrelated to health, nutrition, fitness, or wellness, politely redirect them.";

        $fullUserContent =
            "Client profile — {$contextBlock}\n\n" .
            "Client name: {$name}\n\n" .
            "User message: {$userMessage}";

        // ── 5. Call Gemini REST API ───────────────────────────────────────────
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        try {
            $response = Http::timeout(25)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($endpoint, [
                    'system_instruction' => [
                        'parts' => [['text' => $systemInstruction]],
                    ],
                    'contents' => [
                        [
                            'role'  => 'user',
                            'parts' => [['text' => $fullUserContent]],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature'     => 0.7,
                        'topP'            => 0.9,
                    ],
                    'safetySettings' => [
                        ['category' => 'HARM_CATEGORY_HARASSMENT',        'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_HATE_SPEECH',       'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                    ],
                ]);

            // ── 6. Parse Gemini response ──────────────────────────────────────
            if (!$response->successful()) {
                $errorBody = $response->json();
                $errorMsg  = $errorBody['error']['message'] ?? ('Gemini API error ' . $response->status());
                Log::error('[AssistantController] Gemini API error', [
                    'status'  => $response->status(),
                    'body'    => $errorBody,
                ]);
                return response()->json(['reply' => 'Sorry, the AI service returned an error. Please try again.'], 502);
            }

            $body   = $response->json();
            $reply  = $body['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if (empty($reply)) {
                Log::warning('[AssistantController] Gemini returned empty reply', ['body' => $body]);
                return response()->json([
                    'reply' => "I'm sorry, I couldn't generate a response. Please try rephrasing your question.",
                ]);
            }

            $replyText = trim($reply);

            // ── 7. Persist conversation to chat_histories ──────────────────
            try {
                $userId = $user?->id;
                if ($userId) {
                    ChatHistory::create(['user_id' => $userId, 'role' => 'user',      'message' => $userMessage]);
                    ChatHistory::create(['user_id' => $userId, 'role' => 'assistant', 'message' => $replyText]);
                }
            } catch (\Throwable $saveErr) {
                Log::warning('[AssistantController] Could not save chat history', ['error' => $saveErr->getMessage()]);
            }

            return response()->json(['reply' => $replyText]);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('[AssistantController] Gemini connection failed', ['error' => $e->getMessage()]);
            return response()->json([
                'reply' => 'Could not reach the AI service. Please check your connection and try again.',
            ], 503);
        } catch (\Throwable $e) {
            Log::error('[AssistantController] Unexpected error', ['error' => $e->getMessage()]);
            return response()->json([
                'reply' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }
}
