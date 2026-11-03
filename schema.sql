-- ==============================================================================
-- ROAD TO JAN 16: CUTTING & PPL TRACKER - SUPABASE DATABASE SCHEMA
-- Target Date: January 16, 2027
-- Description: Complete multi-user schema for personal nutrition, workout, and cutting tracker
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create table: daily_logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    fasting_hours NUMERIC(4, 2) DEFAULT 0,
    calories_in INTEGER DEFAULT 0,
    protein_in INTEGER DEFAULT 0,
    carbs_in INTEGER DEFAULT 0,
    fat_in INTEGER DEFAULT 0,
    creatine_taken BOOLEAN DEFAULT false,
    water_liters NUMERIC(4, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_logs_user_date_key UNIQUE (user_id, log_date)
);

-- 3. Create table: food_entries
CREATE TABLE IF NOT EXISTS public.food_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein INTEGER NOT NULL,
    is_ai_estimated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create table: workout_logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT workout_logs_user_date_key UNIQUE (user_id, log_date)
);

-- 5. Create table: body_progress
CREATE TABLE IF NOT EXISTS public.body_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    weight_kg NUMERIC(5, 2) NOT NULL,
    waist_cm NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT body_progress_user_date_key UNIQUE (user_id, log_date)
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON public.food_entries(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_progress_user_date ON public.body_progress(user_id, log_date DESC);

-- ==============================================================================
-- AUTOMATIC DAILY LOG SYNC TRIGGER
-- Recalculates calories_in and protein_in on daily_logs whenever food_entries change per user
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_food_entries_to_daily_log()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_user_id UUID;
    sum_calories INTEGER;
    sum_protein INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_date := OLD.log_date;
        target_user_id := OLD.user_id;
    ELSE
        target_date := NEW.log_date;
        target_user_id := NEW.user_id;
    END IF;

    IF target_user_id IS NOT NULL THEN
        -- Ensure daily_logs record exists for this user and date
        INSERT INTO public.daily_logs (user_id, log_date)
        VALUES (target_user_id, target_date)
        ON CONFLICT (user_id, log_date) DO NOTHING;

        -- Compute sums for this user and date
        SELECT COALESCE(SUM(calories), 0), COALESCE(SUM(protein), 0)
        INTO sum_calories, sum_protein
        FROM public.food_entries
        WHERE user_id = target_user_id AND log_date = target_date;

        -- Update daily_logs for this user and date
        UPDATE public.daily_logs
        SET calories_in = sum_calories,
            protein_in = sum_protein
        WHERE user_id = target_user_id AND log_date = target_date;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_food_entries ON public.food_entries;
CREATE TRIGGER trg_sync_food_entries
AFTER INSERT OR UPDATE OR DELETE ON public.food_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_food_entries_to_daily_log();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Isolated user data access via Supabase Auth
-- ==============================================================================
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own daily_logs" ON public.daily_logs;
CREATE POLICY "Users can only access their own daily_logs"
ON public.daily_logs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own food_entries" ON public.food_entries;
CREATE POLICY "Users can only access their own food_entries"
ON public.food_entries FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own workout_logs" ON public.workout_logs;
CREATE POLICY "Users can only access their own workout_logs"
ON public.workout_logs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own body_progress" ON public.body_progress;
CREATE POLICY "Users can only access their own body_progress"
ON public.body_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
