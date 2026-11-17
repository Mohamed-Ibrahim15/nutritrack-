<?php

namespace Database\Seeders;

use App\Models\Advice;
use App\Models\Exercise;
use App\Models\HealthCondition;
use App\Models\Meal;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin accounts ───────────────────────────────────────────────────
        $admins = [
            ['name' => 'System Admin',  'email' => 'admin@healthsystem.com'],
            ['name' => 'Mohamed Ali',   'email' => 'mohamedali@example.com'],
        ];

        foreach ($admins as $adminData) {
            User::firstOrCreate(
                ['email' => $adminData['email']],
                [
                    'name'     => $adminData['name'],
                    'password' => Hash::make('Admin@12345'),
                    'role'     => 'admin',
                    'email_verified_at' => now(),
                ]
            );
        }

        // ── Health Conditions ────────────────────────────────────────────────
        $conditions = [
            ['name' => 'Diabetes',          'type' => 'chronic',   'description' => 'Impaired blood glucose regulation.'],
            ['name' => 'Hypertension',      'type' => 'chronic',   'description' => 'High blood pressure condition.'],
            ['name' => 'Obesity',           'type' => 'lifestyle', 'description' => 'Excess body fat affecting health.'],
            ['name' => 'Asthma',            'type' => 'chronic',   'description' => 'Chronic respiratory condition.'],
            ['name' => 'Heart Disease',     'type' => 'chronic',   'description' => 'Cardiovascular health conditions.'],
            ['name' => 'Celiac Disease',    'type' => 'dietary',   'description' => 'Gluten intolerance causing gut damage.'],
            ['name' => 'Lactose Intolerance','type' => 'dietary',  'description' => 'Inability to digest lactose properly.'],
            ['name' => 'High Cholesterol',  'type' => 'chronic',   'description' => 'Elevated blood cholesterol levels.'],
            ['name' => 'Thyroid Disorder',  'type' => 'chronic',   'description' => 'Thyroid gland dysfunction.'],
            ['name' => 'None',              'type' => 'lifestyle', 'description' => 'No known health conditions.'],
        ];

        foreach ($conditions as $c) {
            HealthCondition::firstOrCreate(['name' => $c['name']], $c);
        }

        // ── Meals ────────────────────────────────────────────────────────────
        $meals = [
            // Breakfast
            ['name' => 'Oatmeal with Berries',     'meal_type' => 'breakfast', 'calories' => 320, 'protein_g' => 10, 'carbs_g' => 58, 'fat_g' => 6,  'description' => 'Warm oats topped with mixed berries and honey.'],
            ['name' => 'Greek Yoghurt & Granola',  'meal_type' => 'breakfast', 'calories' => 280, 'protein_g' => 15, 'carbs_g' => 38, 'fat_g' => 7,  'description' => 'High-protein Greek yoghurt with crunchy granola.'],
            ['name' => 'Scrambled Eggs on Toast',  'meal_type' => 'breakfast', 'calories' => 350, 'protein_g' => 20, 'carbs_g' => 30, 'fat_g' => 14, 'description' => 'Fluffy scrambled eggs on whole-grain toast.'],
            ['name' => 'Banana Smoothie',          'meal_type' => 'breakfast', 'calories' => 260, 'protein_g' => 8,  'carbs_g' => 48, 'fat_g' => 4,  'description' => 'Banana, oat milk, and peanut butter blend.'],
            ['name' => 'Avocado Toast',            'meal_type' => 'breakfast', 'calories' => 310, 'protein_g' => 9,  'carbs_g' => 34, 'fat_g' => 16, 'description' => 'Whole-grain toast with mashed avocado and chilli flakes.'],
            ['name' => 'Pancakes with Maple Syrup','meal_type' => 'breakfast', 'calories' => 420, 'protein_g' => 10, 'carbs_g' => 72, 'fat_g' => 12, 'description' => 'Fluffy pancakes drizzled with maple syrup.'],
            ['name' => 'Fruit Salad',              'meal_type' => 'breakfast', 'calories' => 180, 'protein_g' => 3,  'carbs_g' => 42, 'fat_g' => 1,  'description' => 'Seasonal mixed fruit bowl.'],
            // Lunch
            ['name' => 'Grilled Chicken Salad',   'meal_type' => 'lunch', 'calories' => 420, 'protein_g' => 38, 'carbs_g' => 18, 'fat_g' => 20, 'description' => 'Grilled chicken breast on crisp garden salad.'],
            ['name' => 'Lentil Soup',             'meal_type' => 'lunch', 'calories' => 340, 'protein_g' => 18, 'carbs_g' => 52, 'fat_g' => 5,  'description' => 'Hearty red lentil soup with cumin.'],
            ['name' => 'Tuna Wrap',               'meal_type' => 'lunch', 'calories' => 380, 'protein_g' => 28, 'carbs_g' => 36, 'fat_g' => 12, 'description' => 'Tuna with cucumber and light mayo in a wholemeal wrap.'],
            ['name' => 'Quinoa Bowl',             'meal_type' => 'lunch', 'calories' => 400, 'protein_g' => 16, 'carbs_g' => 58, 'fat_g' => 14, 'description' => 'Quinoa with roasted veggies and tahini dressing.'],
            ['name' => 'Brown Rice & Veggies',    'meal_type' => 'lunch', 'calories' => 360, 'protein_g' => 10, 'carbs_g' => 64, 'fat_g' => 8,  'description' => 'Steamed brown rice with stir-fried vegetables.'],
            ['name' => 'Pasta Primavera',         'meal_type' => 'lunch', 'calories' => 450, 'protein_g' => 14, 'carbs_g' => 68, 'fat_g' => 14, 'description' => 'Whole-wheat pasta with fresh spring vegetables.'],
            ['name' => 'Turkey Sandwich',         'meal_type' => 'lunch', 'calories' => 390, 'protein_g' => 26, 'carbs_g' => 44, 'fat_g' => 12, 'description' => 'Sliced turkey with lettuce and tomato on rye bread.'],
            // Dinner
            ['name' => 'Baked Salmon & Broccoli', 'meal_type' => 'dinner', 'calories' => 520, 'protein_g' => 42, 'carbs_g' => 20, 'fat_g' => 28, 'description' => 'Oven-baked salmon fillet with steamed broccoli.'],
            ['name' => 'Beef Stir-Fry',           'meal_type' => 'dinner', 'calories' => 580, 'protein_g' => 36, 'carbs_g' => 48, 'fat_g' => 24, 'description' => 'Lean beef strips with mixed vegetables and soy sauce.'],
            ['name' => 'Vegetable Curry & Rice',  'meal_type' => 'dinner', 'calories' => 480, 'protein_g' => 14, 'carbs_g' => 76, 'fat_g' => 16, 'description' => 'Aromatic mixed vegetable curry with basmati rice.'],
            ['name' => 'Grilled Tilapia',         'meal_type' => 'dinner', 'calories' => 440, 'protein_g' => 38, 'carbs_g' => 24, 'fat_g' => 18, 'description' => 'Seasoned tilapia fillet with sweet potato mash.'],
            ['name' => 'Chicken & Quinoa Bowl',   'meal_type' => 'dinner', 'calories' => 500, 'protein_g' => 40, 'carbs_g' => 44, 'fat_g' => 16, 'description' => 'Grilled chicken thigh with herbed quinoa.'],
            ['name' => 'Stuffed Bell Peppers',    'meal_type' => 'dinner', 'calories' => 420, 'protein_g' => 22, 'carbs_g' => 52, 'fat_g' => 14, 'description' => 'Bell peppers stuffed with ground turkey and rice.'],
            ['name' => 'Spaghetti Bolognese',     'meal_type' => 'dinner', 'calories' => 560, 'protein_g' => 30, 'carbs_g' => 66, 'fat_g' => 18, 'description' => 'Whole-wheat spaghetti with rich meat sauce.'],
            // Snack
            ['name' => 'Mixed Nuts',              'meal_type' => 'snack', 'calories' => 180, 'protein_g' => 5,  'carbs_g' => 8,  'fat_g' => 15, 'description' => 'A handful of unsalted mixed nuts.'],
            ['name' => 'Apple with Peanut Butter','meal_type' => 'snack', 'calories' => 200, 'protein_g' => 5,  'carbs_g' => 28, 'fat_g' => 8,  'description' => 'Sliced apple dipped in natural peanut butter.'],
            ['name' => 'Hummus & Veggie Sticks',  'meal_type' => 'snack', 'calories' => 150, 'protein_g' => 6,  'carbs_g' => 18, 'fat_g' => 6,  'description' => 'Carrot, cucumber and celery sticks with hummus.'],
            ['name' => 'Protein Bar',             'meal_type' => 'snack', 'calories' => 220, 'protein_g' => 20, 'carbs_g' => 24, 'fat_g' => 6,  'description' => 'High-protein energy bar.'],
            ['name' => 'Cheese & Crackers',       'meal_type' => 'snack', 'calories' => 190, 'protein_g' => 8,  'carbs_g' => 20, 'fat_g' => 9,  'description' => 'Wholegrain crackers with low-fat cheese.'],
            ['name' => 'Boiled Eggs',             'meal_type' => 'snack', 'calories' => 140, 'protein_g' => 12, 'carbs_g' => 1,  'fat_g' => 10, 'description' => 'Two hard-boiled eggs with a pinch of salt.'],
            ['name' => 'Rice Cakes',              'meal_type' => 'snack', 'calories' => 120, 'protein_g' => 2,  'carbs_g' => 24, 'fat_g' => 1,  'description' => 'Light rice cakes with avocado spread.'],
        ];

        foreach ($meals as $m) {
            Meal::firstOrCreate(['name' => $m['name']], $m);
        }

        // ── Exercises ────────────────────────────────────────────────────────
        $exercises = [
            // Easy
            ['name' => 'Brisk Walking',     'difficulty' => 'easy',   'duration_minutes' => 30, 'calories_burned' => 150, 'muscle_group' => 'full body',    'description' => '30-minute brisk outdoor walk.'],
            ['name' => 'Gentle Stretching', 'difficulty' => 'easy',   'duration_minutes' => 20, 'calories_burned' => 60,  'muscle_group' => 'flexibility',  'description' => 'Full-body gentle stretch routine.'],
            ['name' => 'Yoga – Beginner',   'difficulty' => 'easy',   'duration_minutes' => 30, 'calories_burned' => 120, 'muscle_group' => 'full body',    'description' => 'Beginner yoga flow for flexibility and calm.'],
            ['name' => 'Swimming (casual)', 'difficulty' => 'easy',   'duration_minutes' => 30, 'calories_burned' => 200, 'muscle_group' => 'full body',    'description' => 'Leisurely lap swimming session.'],
            ['name' => 'Light Cycling',     'difficulty' => 'easy',   'duration_minutes' => 30, 'calories_burned' => 160, 'muscle_group' => 'legs',         'description' => 'Easy-paced flat-terrain cycling.'],
            ['name' => 'Tai Chi',           'difficulty' => 'easy',   'duration_minutes' => 25, 'calories_burned' => 80,  'muscle_group' => 'full body',    'description' => 'Slow mindful Tai Chi movements.'],
            ['name' => 'Balance Training',  'difficulty' => 'easy',   'duration_minutes' => 20, 'calories_burned' => 70,  'muscle_group' => 'core',         'description' => 'Single-leg balance and stability drills.'],
            // Medium
            ['name' => 'Jogging',           'difficulty' => 'medium', 'duration_minutes' => 30, 'calories_burned' => 300, 'muscle_group' => 'legs/cardio',  'description' => '30-minute steady-pace jog.'],
            ['name' => 'Bodyweight Circuit','difficulty' => 'medium', 'duration_minutes' => 25, 'calories_burned' => 280, 'muscle_group' => 'full body',    'description' => 'Push-ups, squats, and lunges circuit.'],
            ['name' => 'Dumbbell Training', 'difficulty' => 'medium', 'duration_minutes' => 40, 'calories_burned' => 260, 'muscle_group' => 'arms/chest',   'description' => 'Upper-body dumbbell workout.'],
            ['name' => 'Cycling (moderate)','difficulty' => 'medium', 'duration_minutes' => 45, 'calories_burned' => 350, 'muscle_group' => 'legs/cardio',  'description' => 'Moderate-intensity cycling session.'],
            ['name' => 'Rowing Machine',    'difficulty' => 'medium', 'duration_minutes' => 30, 'calories_burned' => 320, 'muscle_group' => 'full body',    'description' => 'Rowing machine cardio and strength.'],
            ['name' => 'Dance Cardio',      'difficulty' => 'medium', 'duration_minutes' => 30, 'calories_burned' => 270, 'muscle_group' => 'full body',    'description' => 'High-energy dance fitness class.'],
            ['name' => 'Pilates',           'difficulty' => 'medium', 'duration_minutes' => 40, 'calories_burned' => 200, 'muscle_group' => 'core',         'description' => 'Core-focused Pilates session.'],
            // Hard
            ['name' => 'HIIT',              'difficulty' => 'hard',   'duration_minutes' => 25, 'calories_burned' => 400, 'muscle_group' => 'full body',    'description' => 'High-intensity interval training circuit.'],
            ['name' => 'Sprint Intervals',  'difficulty' => 'hard',   'duration_minutes' => 20, 'calories_burned' => 380, 'muscle_group' => 'legs/cardio',  'description' => '8 × 30-second all-out sprints.'],
            ['name' => 'CrossFit WOD',      'difficulty' => 'hard',   'duration_minutes' => 45, 'calories_burned' => 500, 'muscle_group' => 'full body',    'description' => 'High-intensity CrossFit workout of the day.'],
            ['name' => 'Barbell Squats',    'difficulty' => 'hard',   'duration_minutes' => 35, 'calories_burned' => 320, 'muscle_group' => 'legs/glutes',  'description' => 'Heavy barbell back squat sets.'],
            ['name' => 'Pull-ups & Dips',   'difficulty' => 'hard',   'duration_minutes' => 30, 'calories_burned' => 280, 'muscle_group' => 'back/chest',   'description' => 'Weighted pull-ups and ring dips.'],
            ['name' => 'Battle Ropes',      'difficulty' => 'hard',   'duration_minutes' => 20, 'calories_burned' => 350, 'muscle_group' => 'arms/cardio',  'description' => 'Intense battle rope conditioning.'],
            ['name' => 'Stair Climbing',    'difficulty' => 'hard',   'duration_minutes' => 30, 'calories_burned' => 370, 'muscle_group' => 'legs/cardio',  'description' => 'Continuous stair-climbing at high pace.'],
        ];

        foreach ($exercises as $e) {
            Exercise::firstOrCreate(['name' => $e['name']], $e);
        }

        // ── Health Advice ────────────────────────────────────────────────────
        $admin = User::where('email', 'admin@healthsystem.com')->first();

        $adviceList = [
            ['title' => 'Stay Hydrated', 'category' => 'general',
             'content' => 'Drink at least 8 glasses of water per day. Proper hydration supports metabolism, aids digestion, and improves energy levels.'],
            ['title' => 'Importance of Sleep', 'category' => 'lifestyle',
             'content' => 'Aim for 7–9 hours of quality sleep each night. Sleep is essential for muscle recovery, hormone regulation, and mental well-being.'],
            ['title' => 'Balanced Nutrition', 'category' => 'nutrition',
             'content' => 'Focus on whole foods: lean proteins, complex carbohydrates, healthy fats, and plenty of fruits and vegetables.'],
            ['title' => 'Consistency Over Intensity', 'category' => 'fitness',
             'content' => 'It is better to exercise moderately 5 days a week than to train intensely once in a while. Consistency builds lasting habits.'],
            ['title' => 'Manage Stress', 'category' => 'lifestyle',
             'content' => 'Chronic stress raises cortisol levels, which can lead to weight gain. Practice mindfulness, meditation, or deep breathing daily.'],
            ['title' => 'Protein for Muscle', 'category' => 'nutrition',
             'content' => 'Consume 1.6–2.2 g of protein per kg of body weight when aiming to build or preserve muscle mass during a calorie deficit.'],
            ['title' => 'Warm Up & Cool Down', 'category' => 'fitness',
             'content' => 'Always spend 5–10 minutes warming up before exercise and cooling down afterwards to prevent injury and improve recovery.'],
            ['title' => 'Track Your Progress', 'category' => 'general',
             'content' => 'Logging your daily food intake and workouts helps identify patterns and keeps you accountable towards your health goals.'],
        ];

        foreach ($adviceList as $a) {
            \App\Models\Advice::firstOrCreate(
                ['title' => $a['title']],
                array_merge($a, ['created_by' => $admin?->id])
            );
        }
    }
}
