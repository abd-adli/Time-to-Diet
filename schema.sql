-- ==============================================================================
-- ROAD TO JAN 16: CUTTING & PPL TRACKER - SUPABASE DATABASE SCHEMA
-- Target Date: January 16, 2027
-- Description: Complete schema for personal nutrition, workout, and cutting tracker
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create table: daily_logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE UNIQUE NOT NULL,
    fasting_hours NUMERIC(4, 2) DEFAULT 0,
    calories_in INTEGER DEFAULT 0,
    protein_in INTEGER DEFAULT 0,
    carbs_in INTEGER DEFAULT 0,
    fat_in INTEGER DEFAULT 0,
    creatine_taken BOOLEAN DEFAULT false,
    water_liters NUMERIC(4, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table: food_entries
CREATE TABLE IF NOT EXISTS public.food_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE NOT NULL REFERENCES public.daily_logs(log_date) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein INTEGER NOT NULL,
    is_ai_estimated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create table: workout_logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE UNIQUE NOT NULL,
    split_category TEXT, -- 'Push Day', 'Pull Day', 'Legs Day', 'Upper / Hybrid', 'Rest / Recovery'
    exercises JSONB DEFAULT '[]'::jsonb, -- Array of { name: string, sets: number, reps: number, weight_kg: number }
    cardio_minutes INTEGER DEFAULT 0,
    plank_subuh BOOLEAN DEFAULT false,
    plank_dzuhur BOOLEAN DEFAULT false,
    plank_ashar BOOLEAN DEFAULT false,
    plank_maghrib BOOLEAN DEFAULT false,
    plank_isya BOOLEAN DEFAULT false,
    recovery_rating INTEGER DEFAULT 3 CHECK (recovery_rating BETWEEN 1 AND 5),
    workout_calories_burned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create table: body_progress
CREATE TABLE IF NOT EXISTS public.body_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE UNIQUE NOT NULL,
    weight_kg NUMERIC(5, 2) NOT NULL,
    waist_cm NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_date ON public.food_entries(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON public.workout_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_progress_date ON public.body_progress(log_date DESC);

-- ==============================================================================
-- AUTOMATIC DAILY LOG SYNC TRIGGER
-- Recalculates calories_in and protein_in on daily_logs whenever food_entries change
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_food_entries_to_daily_log()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    sum_calories INTEGER;
    sum_protein INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_date := OLD.log_date;
    ELSE
        target_date := NEW.log_date;
    END IF;

    -- Ensure daily_logs record exists for this date
    INSERT INTO public.daily_logs (log_date)
    VALUES (target_date)
    ON CONFLICT (log_date) DO NOTHING;

    -- Compute sums
    SELECT COALESCE(SUM(calories), 0), COALESCE(SUM(protein), 0)
    INTO sum_calories, sum_protein
    FROM public.food_entries
    WHERE log_date = target_date;

    -- Update daily_logs
    UPDATE public.daily_logs
    SET calories_in = sum_calories,
        protein_in = sum_protein
    WHERE log_date = target_date;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_food_entries ON public.food_entries;
CREATE TRIGGER trg_sync_food_entries
AFTER INSERT OR UPDATE OR DELETE ON public.food_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_food_entries_to_daily_log();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Configure access for personal tracker use (Anon & Authenticated access)
-- ==============================================================================
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated users full access for personal tracker single-user / family use
DROP POLICY IF EXISTS "Allow all access to daily_logs" ON public.daily_logs;
CREATE POLICY "Allow all access to daily_logs" ON public.daily_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to food_entries" ON public.food_entries;
CREATE POLICY "Allow all access to food_entries" ON public.food_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to workout_logs" ON public.workout_logs;
CREATE POLICY "Allow all access to workout_logs" ON public.workout_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to body_progress" ON public.body_progress;
CREATE POLICY "Allow all access to body_progress" ON public.body_progress FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED INITIAL SAMPLE DATA (Starting checkpoint & Today's baseline)
-- Starting Baseline: 105 kg, Waist: 110 cm
-- ==============================================================================
INSERT INTO public.body_progress (log_date, weight_kg, waist_cm)
VALUES 
    (CURRENT_DATE - INTERVAL '14 days', 105.0, 110.0),
    (CURRENT_DATE - INTERVAL '7 days', 103.8, 108.5),
    (CURRENT_DATE, 102.5, 107.0)
ON CONFLICT (log_date) DO NOTHING;

INSERT INTO public.daily_logs (log_date, fasting_hours, calories_in, protein_in, carbs_in, fat_in, creatine_taken, water_liters, notes)
VALUES 
    (CURRENT_DATE, 16.0, 1480, 118, 120, 42, true, 3.2, 'Energy feeling high, 16h fast smooth.')
ON CONFLICT (log_date) DO NOTHING;

INSERT INTO public.food_entries (log_date, meal_name, calories, protein, is_ai_estimated)
VALUES
    (CURRENT_DATE, 'Kent Soy Protein (50g) + Stevia', 203, 21, false),
    (CURRENT_DATE, '2 Telur Ayam Rebus + Nasi Merah 100g', 265, 15, false),
    (CURRENT_DATE, '1 Ekor Ikan Kembung Bakar + Sayur Bayam', 280, 26, true),
    (CURRENT_DATE, 'Dada Ayam Panggang 150g + Terong Teri', 450, 42, true),
    (CURRENT_DATE, 'Tempe Kukus 100g & Sambal Tomat', 282, 14, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.workout_logs (
    log_date, split_category, exercises, cardio_minutes, 
    plank_subuh, plank_dzuhur, plank_ashar, plank_maghrib, plank_isya, 
    recovery_rating, workout_calories_burned
)
VALUES (
    CURRENT_DATE,
    'Push Day',
    '[
        {"name": "Incline Dumbbell Press", "sets": 4, "reps": 10, "weight_kg": 24},
        {"name": "Flat Dumbbell Bench", "sets": 3, "reps": 12, "weight_kg": 26},
        {"name": "Standing Dumbbell Overhead Press", "sets": 3, "reps": 10, "weight_kg": 16},
        {"name": "Dumbbell Lateral Raises", "sets": 4, "reps": 15, "weight_kg": 8},
        {"name": "Tricep Rope Pushdowns", "sets": 4, "reps": 12, "weight_kg": 22}
    ]'::jsonb,
    25,
    true, true, true, false, false,
    4,
    450
)
ON CONFLICT (log_date) DO NOTHING;
