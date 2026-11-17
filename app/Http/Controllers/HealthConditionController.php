<?php

namespace App\Http\Controllers;

use App\Models\HealthCondition;
use Illuminate\Http\Request;

class HealthConditionController extends Controller
{
    /**
     * GET /api/health-conditions
     * List all available health conditions.
     */
    public function index()
    {
        return response()->json([
            'health_conditions' => HealthCondition::orderBy('name')->get(),
        ]);
    }
}
