<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatHistory;

class ChatHistoryController extends Controller
{
    /**
     * GET /api/chat-history
     * Returns the authenticated user's chat history in chronological order.
     */
    public function index(Request $request)
    {
        $history = ChatHistory::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'asc')
            ->get(['id', 'role', 'message', 'created_at']);

        return response()->json(['history' => $history]);
    }

    /**
     * DELETE /api/chat-history
     * Permanently deletes all chat messages for the authenticated user.
     */
    public function destroy(Request $request)
    {
        ChatHistory::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Chat history cleared successfully.']);
    }
}
