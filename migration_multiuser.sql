-- ==============================================================================
-- MIGRATION: UPGRADE EXISTING DATABASE TO MULTI-USER (2 PROFILES)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. In your Supabase Dashboard, go to: Authentication -> Users.
-- 2. Click "Add User" -> "Create User" to create your account (e.g. adli@diet.local)
--    and your partner's account (e.g. partner@diet.local).
-- 3. Copy YOUR user's UID (a UUID string like 'a1b2c3d4-e5f6-7890-abcd-ef1234567890').
-- 4. Replace 'YOUR_USER_UUID_HERE' below with your actual copied UUID.
-- 5. Run this entire script in Supabase Dashboard -> SQL Editor -> Click "Run".
-- ==============================================================================

-- STEP 1: Add user_id column to all tables (nullable first for data migration)
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.body_progress
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 2: CRUCIAL: Assign your existing 2 days of data to your new user_id
-- (REPLACE 'YOUR_USER_UUID_HERE' WITH YOUR ACTUAL COPIED USER UID)
UPDATE public.daily_logs
SET user_id = 'YOUR_USER_UUID_HERE'
WHERE user_id IS NULL;

UPDATE public.food_entries
SET user_id = 'YOUR_USER_UUID_HERE'
WHERE user_id IS NULL;

UPDATE public.workout_logs
SET user_id = 'YOUR_USER_UUID_HERE'
WHERE user_id IS NULL;

UPDATE public.body_progress
SET user_id = 'YOUR_USER_UUID_HERE'
WHERE user_id IS NULL;

-- STEP 3: Drop old single-column unique constraints & foreign keys
-- Drop old foreign key on food_entries that was referencing daily_logs(log_date)
ALTER TABLE public.food_entries DROP CONSTRAINT IF EXISTS food_entries_log_date_fkey;

-- Drop old unique constraints on log_date
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_log_date_key;
ALTER TABLE public.workout_logs DROP CONSTRAINT IF EXISTS workout_logs_log_date_key;
ALTER TABLE public.body_progress DROP CONSTRAINT IF EXISTS body_progress_log_date_key;

-- STEP 4: Add new composite UNIQUE constraints per (user_id, log_date)
-- This allows each user to have their own separate log on the same date!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_user_date_key'
  ) THEN
    ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_date_key UNIQUE (user_id, log_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workout_logs_user_date_key'
  ) THEN
    ALTER TABLE public.workout_logs ADD CONSTRAINT workout_logs_user_date_key UNIQUE (user_id, log_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'body_progress_user_date_key'
  ) THEN
    ALTER TABLE public.body_progress ADD CONSTRAINT body_progress_user_date_key UNIQUE (user_id, log_date);
  END IF;
END $$;

-- STEP 5: Create user_id indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON public.food_entries(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_progress_user_date ON public.body_progress(user_id, log_date DESC);

-- STEP 6: Update automatic trigger to calculate calories & protein per user
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

-- STEP 7: ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can ONLY select, insert, update, or delete their own data!
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

-- Drop legacy open policies if they exist
DROP POLICY IF EXISTS "Allow all access to daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow all access to food_entries" ON public.food_entries;
DROP POLICY IF EXISTS "Allow all access to workout_logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Allow all access to body_progress" ON public.body_progress;

-- Create authenticated user isolation policies
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
