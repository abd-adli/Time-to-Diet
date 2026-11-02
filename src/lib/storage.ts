import { getSupabaseClient } from "./supabase";
import {
  DailyLog,
  FoodEntry,
  WorkoutLog,
  BodyProgress,
  DailyChartDataPoint,
} from "./types";
import { DEFAULT_USER_CONFIG, UserTargetConfig, WORKOUT_SPLITS } from "./constants";

/**
 * Helper to get today's local date string in YYYY-MM-DD format.
 * Uses local browser time to avoid UTC day rollover bugs.
 */
export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Date-specific LocalStorage Key generators
export const STORAGE_KEYS = {
  DAILY_LOG: (dateKey: string) => `daily_logs_${dateKey}`,
  WORKOUT_LOG: (dateKey: string) => `workout_logs_${dateKey}`,
  FOOD_ENTRIES: (dateKey: string) => `food_entries_${dateKey}`,
  USER_CONFIG: "road_to_jan16_user_config",
  BODY_PROGRESS: "road_to_jan16_body_progress",
};

/**
 * Purge all legacy non-date-specific and stale seed keys permanently from LocalStorage.
 * Ensures NO fallback to old keys can ever occur.
 */
export function purgeLegacyStorageKeys(): void {
  if (typeof window === "undefined") return;
  try {
    const legacyKeys = [
      "road_to_jan16_daily_logs",
      "road_to_jan16_workout_logs",
      "road_to_jan16_food_entries",
      "road_to_jan16_seeded_v1",
      "road_to_jan16_seeded",
      "road_to_jan16_total_calories",
      "road_to_jan16_total_protein",
      "totalCalories",
      "totalProtein",
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to purge legacy storage keys:", e);
  }
}

/**
 * Backwards compatibility alias for purging stale keys
 */
export const clearStaleStorageTotals = purgeLegacyStorageKeys;

/**
 * FORCE DELETE / nuke old local storage logs and workout data when the day changes.
 * Compares last_opened_date with new Date().toDateString().
 * Explicitly removes all keys related to logs, workouts, or totals.
 */
export function nukeOldLocalStorageOnDateChange(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const today = new Date().toDateString();
    const lastOpened = localStorage.getItem("last_opened_date");

    if (lastOpened !== today) {
      // Explicitly remove all keys related to logs, workouts, or totals
      const keysToRemove = [
        "daily_logs",
        "workout_logs",
        "food_entries",
        "road_to_jan16_daily_logs",
        "road_to_jan16_workout_logs",
        "road_to_jan16_food_entries",
        "road_to_jan16_seeded_v1",
        "road_to_jan16_seeded",
        "road_to_jan16_total_calories",
        "road_to_jan16_total_protein",
        "totalCalories",
        "totalProtein",
        "workout_calories",
        "workout_calories_burned",
        "my_app_data",
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Remove any date-specific keys not matching today's key
      const todayKey = getTodayKey();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("daily_logs_") ||
            k.startsWith("workout_logs_") ||
            k.startsWith("food_entries_") ||
            k.startsWith("road_to_jan16_workout_") ||
            k.startsWith("road_to_jan16_daily_") ||
            k.includes("total"))
        ) {
          if (!k.endsWith(todayKey)) {
            localStorage.removeItem(k);
          }
        }
      }

      localStorage.setItem("last_opened_date", today);
      return true;
    }
  } catch (e) {
    console.warn("Failed to nuke old local storage on date change:", e);
  }
  return false;
}

// Run purge and date-change check immediately on client import
if (typeof window !== "undefined") {
  purgeLegacyStorageKeys();
  nukeOldLocalStorageOnDateChange();
}

/**
 * Calculates burned calories using standard MET (Metabolic Equivalent of Task) values:
 * - 'weightlifting': 5.5 MET
 * - 'incline_walk': 7.5 MET
 * - 'core': 3.8 MET
 *
 * Formula: Calories Burned = MET * Weight (kg) * (Duration in minutes / 60)
 */
export function calculateWorkoutCalories(
  weightKg: number,
  durationMinutes: number,
  type: "weightlifting" | "incline_walk" | "core"
): number {
  const metValues: Record<"weightlifting" | "incline_walk" | "core", number> = {
    weightlifting: 5.5,
    incline_walk: 7.5,
    core: 3.8,
  };

  const met = metValues[type] ?? 5.5;
  const durationHours = Math.max(0, Number(durationMinutes) || 0) / 60;
  const weight = Math.max(0, Number(weightKg) || 0);

  return Math.round(met * weight * durationHours);
}

/**
 * Helper to return a clean empty daily log with all macros & calories set to 0
 */
export function getEmptyDailyLog(dateStr: string = getTodayKey()): DailyLog {
  return {
    id: `dl-${dateStr}`,
    log_date: dateStr,
    fasting_hours: 0,
    calories_in: 0,
    protein_in: 0,
    carbs_in: 0,
    fat_in: 0,
    creatine_taken: false,
    water_liters: 0,
    notes: "",
  };
}

/**
 * Helper to return a clean empty workout log with burned calories set to 0
 */
export function getEmptyWorkoutLog(dateStr: string = getTodayKey()): WorkoutLog {
  return {
    id: `wl-${dateStr}`,
    log_date: dateStr,
    split_category: "Push Day",
    exercises: (WORKOUT_SPLITS["Push Day"]?.templates || []).map((t) => ({ ...t, completed: false })),
    cardio_minutes: 0,
    plank_subuh: false,
    plank_dzuhur: false,
    plank_ashar: false,
    plank_maghrib: false,
    plank_isya: false,
    recovery_rating: 3,
    workout_calories_burned: 0,
  };
}

// ==========================================
// USER CONFIG
// ==========================================
export function getUserConfig(): UserTargetConfig {
  if (typeof window === "undefined") return DEFAULT_USER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_CONFIG);
    if (!raw) return DEFAULT_USER_CONFIG;
    return { ...DEFAULT_USER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_CONFIG;
  }
}

export function saveUserConfig(config: UserTargetConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(config));
}

// ==========================================
// FOOD ENTRIES (DATE-SPECIFIC STORAGE ONLY, NO FALLBACK)
// ==========================================
export async function getFoodEntries(dateStr?: string): Promise<FoodEntry[]> {
  const targetDate = dateStr || getTodayKey();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("log_date", targetDate)
        .order("created_at", { ascending: true });

      if (!error && data) {
        return data
          .filter((item) => item.log_date === targetDate && !item.id?.startsWith("seed-fe-"))
          .map((item) => ({
            id: item.id,
            log_date: item.log_date,
            meal_name: item.meal_name,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            is_ai_estimated: Boolean(item.is_ai_estimated),
            created_at: item.created_at,
          }));
      }
    } catch (e) {
      console.warn("Supabase getFoodEntries failed, checking local:", e);
    }
  }

  // LocalStorage: STRICTLY use date-specific key only (food_entries_YYYY-MM-DD)
  // ABSOLUTELY NO FALLBACK TO OLD UN-DATED KEYS
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.FOOD_ENTRIES(targetDate);
      const raw = localStorage.getItem(specificKey);
      if (!raw) {
        // Does not exist for this date -> returns clean empty array []
        return [];
      }
      const list: FoodEntry[] = JSON.parse(raw);
      return (list || []).filter(
        (entry) => entry.log_date === targetDate && !entry.id?.startsWith("seed-fe-")
      );
    } catch {
      return [];
    }
  }

  return [];
}

export async function addFoodEntry(entry: Omit<FoodEntry, "id" | "created_at">): Promise<FoodEntry> {
  const targetDate = entry.log_date || getTodayKey();
  const supabase = getSupabaseClient();
  const newId = `food-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullEntry: FoodEntry = {
    ...entry,
    log_date: targetDate,
    id: newId,
    created_at: new Date().toISOString(),
    calories: Number(entry.calories) || 0,
    protein: Number(entry.protein) || 0,
  };

  if (supabase) {
    try {
      await supabase.from("daily_logs").upsert(
        { log_date: targetDate },
        { onConflict: "log_date" }
      );

      const { data, error } = await supabase
        .from("food_entries")
        .insert({
          log_date: targetDate,
          meal_name: entry.meal_name,
          calories: fullEntry.calories,
          protein: fullEntry.protein,
          is_ai_estimated: fullEntry.is_ai_estimated,
        })
        .select()
        .single();

      if (!error && data) {
        fullEntry.id = data.id;
      }
    } catch (e) {
      console.warn("Supabase addFoodEntry failed, saving local:", e);
    }
  }

  // LocalStorage: Save ONLY to date-specific key: food_entries_YYYY-MM-DD
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.FOOD_ENTRIES(targetDate);
      const raw = localStorage.getItem(specificKey);
      const list: FoodEntry[] = raw ? JSON.parse(raw) : [];
      list.push(fullEntry);
      localStorage.setItem(specificKey, JSON.stringify(list));

      // Calculate dynamic totals directly from today's list
      const dynamicCalories = list.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
      const dynamicProtein = list.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

      const currentDaily = await getDailyLog(targetDate);
      currentDaily.calories_in = dynamicCalories;
      currentDaily.protein_in = dynamicProtein;
      await saveDailyLog(currentDaily);
    } catch (e) {
      console.warn("LocalStorage addFoodEntry error:", e);
    }
  }

  return fullEntry;
}

export async function deleteFoodEntry(id: string, dateStr: string): Promise<void> {
  const targetDate = dateStr || getTodayKey();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase.from("food_entries").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase deleteFoodEntry failed:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.FOOD_ENTRIES(targetDate);
      const raw = localStorage.getItem(specificKey);
      if (raw) {
        const list: FoodEntry[] = JSON.parse(raw);
        const filtered = list.filter((e) => e.id !== id);
        localStorage.setItem(specificKey, JSON.stringify(filtered));

        // Recalculate dynamic totals
        const dynamicCalories = filtered.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
        const dynamicProtein = filtered.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

        const currentDaily = await getDailyLog(targetDate);
        currentDaily.calories_in = dynamicCalories;
        currentDaily.protein_in = dynamicProtein;
        await saveDailyLog(currentDaily);
      }
    } catch (e) {
      console.warn("LocalStorage deleteFoodEntry error:", e);
    }
  }
}

// ==========================================
// DAILY LOGS (DATE-SPECIFIC STORAGE ONLY, NO FALLBACK)
// ==========================================
export async function getDailyLog(dateStr?: string): Promise<DailyLog> {
  const targetDate = dateStr || getTodayKey();
  const emptyLog = getEmptyDailyLog(targetDate);

  // Compute calories and protein dynamically on the fly from date-specific food entries
  const foodEntries = await getFoodEntries(targetDate);
  const dynamicCaloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const dynamicProteinIn = foodEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

  emptyLog.calories_in = dynamicCaloriesIn;
  emptyLog.protein_in = dynamicProteinIn;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("log_date", targetDate)
        .maybeSingle();

      if (!error && data && data.log_date === targetDate) {
        return {
          id: data.id,
          log_date: targetDate,
          fasting_hours: Number(data.fasting_hours) || 0,
          calories_in: dynamicCaloriesIn,
          protein_in: dynamicProteinIn,
          carbs_in: Number(data.carbs_in) || 0,
          fat_in: Number(data.fat_in) || 0,
          creatine_taken: Boolean(data.creatine_taken),
          water_liters: Number(data.water_liters) || 0,
          notes: data.notes || "",
          created_at: data.created_at,
        };
      }
    } catch (e) {
      console.warn("Supabase getDailyLog failed, checking local:", e);
    }
  }

  // LocalStorage: STRICTLY use date-specific key only (daily_logs_YYYY-MM-DD)
  // ABSOLUTELY NO FALLBACK TO OLD UN-DATED KEYS
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.DAILY_LOG(targetDate);
      const raw = localStorage.getItem(specificKey);
      if (!raw) {
        // Key does not exist for this date -> returns clean 0s
        return emptyLog;
      }

      const record = JSON.parse(raw);
      if (record && record.log_date === targetDate) {
        return {
          id: record.id || `dl-${targetDate}`,
          log_date: targetDate,
          fasting_hours: Number(record.fasting_hours) || 0,
          calories_in: dynamicCaloriesIn,
          protein_in: dynamicProteinIn,
          carbs_in: Number(record.carbs_in) || 0,
          fat_in: Number(record.fat_in) || 0,
          creatine_taken: Boolean(record.creatine_taken),
          water_liters: Number(record.water_liters) || 0,
          notes: record.notes || "",
          created_at: record.created_at,
        };
      }
    } catch {
      return emptyLog;
    }
  }

  return emptyLog;
}

export async function saveDailyLog(log: DailyLog): Promise<DailyLog> {
  const targetDate = log.log_date || getTodayKey();

  // Dynamically compute totals from food entries
  const foodEntries = await getFoodEntries(targetDate);
  const dynamicCaloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const dynamicProteinIn = foodEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

  const cleanLog: DailyLog = {
    ...log,
    log_date: targetDate,
    calories_in: dynamicCaloriesIn,
    protein_in: dynamicProteinIn,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = {
        log_date: cleanLog.log_date,
        fasting_hours: Number(cleanLog.fasting_hours) || 0,
        calories_in: cleanLog.calories_in,
        protein_in: cleanLog.protein_in,
        carbs_in: Number(cleanLog.carbs_in) || 0,
        fat_in: Number(cleanLog.fat_in) || 0,
        creatine_taken: Boolean(cleanLog.creatine_taken),
        water_liters: Number(cleanLog.water_liters) || 0,
        notes: cleanLog.notes || "",
      };

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(payload, { onConflict: "log_date" })
        .select()
        .single();

      if (!error && data) {
        cleanLog.id = data.id;
      }
    } catch (e) {
      console.warn("Supabase saveDailyLog failed, saving local:", e);
    }
  }

  // LocalStorage: Save ONLY to date-specific key: daily_logs_YYYY-MM-DD
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.DAILY_LOG(targetDate);
      localStorage.setItem(specificKey, JSON.stringify(cleanLog));
    } catch (e) {
      console.warn("LocalStorage saveDailyLog error:", e);
    }
  }

  return cleanLog;
}

// ==========================================
// WORKOUT LOGS (DATE-SPECIFIC STORAGE ONLY, NO FALLBACK)
// ==========================================
export async function getWorkoutLog(dateStr?: string): Promise<WorkoutLog> {
  const targetDate = dateStr || getTodayKey();
  const emptyLog = getEmptyWorkoutLog(targetDate);
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("log_date", targetDate)
        .maybeSingle();

      if (!error && data && data.log_date === targetDate) {
        return {
          id: data.id,
          log_date: targetDate,
          split_category: data.split_category || "Push Day",
          exercises: Array.isArray(data.exercises) ? data.exercises : [],
          cardio_minutes: Number(data.cardio_minutes) || 0,
          plank_subuh: Boolean(data.plank_subuh),
          plank_dzuhur: Boolean(data.plank_dzuhur),
          plank_ashar: Boolean(data.plank_ashar),
          plank_maghrib: Boolean(data.plank_maghrib),
          plank_isya: Boolean(data.plank_isya),
          recovery_rating: Number(data.recovery_rating) || 3,
          workout_calories_burned: Number(data.workout_calories_burned) || 0,
          created_at: data.created_at,
        };
      }
    } catch (e) {
      console.warn("Supabase getWorkoutLog failed, checking local:", e);
    }
  }

  // LocalStorage: STRICTLY use date-specific key only (workout_logs_YYYY-MM-DD)
  // ABSOLUTELY NO FALLBACK TO OLD UN-DATED KEYS
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.WORKOUT_LOG(targetDate);
      const raw = localStorage.getItem(specificKey);
      if (!raw) {
        // Key does not exist for this date -> returns clean 0s
        return emptyLog;
      }

      const record = JSON.parse(raw);
      if (record && record.log_date === targetDate) {
        return {
          id: record.id || `wl-${targetDate}`,
          log_date: targetDate,
          split_category: record.split_category || "Push Day",
          exercises: Array.isArray(record.exercises) ? record.exercises : [],
          cardio_minutes: Number(record.cardio_minutes) || 0,
          plank_subuh: Boolean(record.plank_subuh),
          plank_dzuhur: Boolean(record.plank_dzuhur),
          plank_ashar: Boolean(record.plank_ashar),
          plank_maghrib: Boolean(record.plank_maghrib),
          plank_isya: Boolean(record.plank_isya),
          recovery_rating: Number(record.recovery_rating) || 3,
          workout_calories_burned: Number(record.workout_calories_burned) || 0,
          created_at: record.created_at,
        };
      }
    } catch {
      return emptyLog;
    }
  }

  return emptyLog;
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<WorkoutLog> {
  const targetDate = log.log_date || getTodayKey();
  const cleanLog: WorkoutLog = { ...log, log_date: targetDate };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = {
        log_date: cleanLog.log_date,
        split_category: cleanLog.split_category,
        exercises: cleanLog.exercises || [],
        cardio_minutes: Number(cleanLog.cardio_minutes) || 0,
        plank_subuh: Boolean(cleanLog.plank_subuh),
        plank_dzuhur: Boolean(cleanLog.plank_dzuhur),
        plank_ashar: Boolean(cleanLog.plank_ashar),
        plank_maghrib: Boolean(cleanLog.plank_maghrib),
        plank_isya: Boolean(cleanLog.plank_isya),
        recovery_rating: Number(cleanLog.recovery_rating) || 3,
        workout_calories_burned: Number(cleanLog.workout_calories_burned) || 0,
      };

      const { data, error } = await supabase
        .from("workout_logs")
        .upsert(payload, { onConflict: "log_date" })
        .select()
        .single();

      if (!error && data) {
        cleanLog.id = data.id;
      }
    } catch (e) {
      console.warn("Supabase saveWorkoutLog failed, saving local:", e);
    }
  }

  // LocalStorage: Save ONLY to date-specific key: workout_logs_YYYY-MM-DD
  if (typeof window !== "undefined") {
    try {
      const specificKey = STORAGE_KEYS.WORKOUT_LOG(targetDate);
      localStorage.setItem(specificKey, JSON.stringify(cleanLog));
    } catch (e) {
      console.warn("LocalStorage saveWorkoutLog error:", e);
    }
  }

  return cleanLog;
}

// ==========================================
// BODY PROGRESS
// ==========================================
export async function getBodyProgressList(): Promise<BodyProgress[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("body_progress")
        .select("*")
        .order("log_date", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((item) => ({
          id: item.id,
          log_date: item.log_date,
          weight_kg: Number(item.weight_kg) || 0,
          waist_cm: Number(item.waist_cm) || 0,
          created_at: item.created_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getBodyProgressList failed, checking local:", e);
    }
  }

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEYS.BODY_PROGRESS);
    if (raw) {
      try {
        const list: BodyProgress[] = JSON.parse(raw);
        return list.sort((a, b) => a.log_date.localeCompare(b.log_date));
      } catch {
        // ignore
      }
    }
  }

  return [];
}

export async function saveBodyProgress(entry: {
  log_date: string;
  weight_kg: number;
  waist_cm: number;
}): Promise<BodyProgress> {
  const targetDate = entry.log_date || getTodayKey();
  const newEntry: BodyProgress = {
    id: `bp-${targetDate}`,
    log_date: targetDate,
    weight_kg: Number(entry.weight_kg) || 0,
    waist_cm: Number(entry.waist_cm) || 0,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("body_progress")
        .upsert(
          {
            log_date: targetDate,
            weight_kg: newEntry.weight_kg,
            waist_cm: newEntry.waist_cm,
          },
          { onConflict: "log_date" }
        )
        .select()
        .single();

      if (!error && data) {
        newEntry.id = data.id;
      }
    } catch (e) {
      console.warn("Supabase saveBodyProgress failed, saving local:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BODY_PROGRESS);
      const list: BodyProgress[] = raw ? JSON.parse(raw) : [];
      const index = list.findIndex((p) => p.log_date === targetDate);
      if (index >= 0) {
        list[index] = newEntry;
      } else {
        list.push(newEntry);
      }
      list.sort((a, b) => a.log_date.localeCompare(b.log_date));
      localStorage.setItem(STORAGE_KEYS.BODY_PROGRESS, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  return newEntry;
}

// ==========================================
// MONTHLY / HISTORICAL COMBINED CHART DATA
// Strictly enforces numeric types to prevent `#VALUE!` or `NaN`
// ==========================================
export async function getDailyChartData(daysBack: number = 14): Promise<DailyChartDataPoint[]> {
  const config = getUserConfig();
  const bmr = Number(config.baseBmr) || 2056;
  const calorieTarget = Number(config.dailyCalorieTarget) || 1600;

  const result: DailyChartDataPoint[] = [];
  const today = new Date();

  // Load daily logs and workout logs strictly for each specific date key
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateStr = formatDate(d);

    const foodEntries = await getFoodEntries(dateStr);
    const workoutLog = await getWorkoutLog(dateStr);

    const caloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    const caloriesBurned = Number(workoutLog.workout_calories_burned) || 0;
    const totalExpenditure = bmr + caloriesBurned;
    const netDeficit = totalExpenditure - caloriesIn;

    const dateLabel = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });

    result.push({
      date: dateLabel,
      fullDate: dateStr,
      caloriesIn: Math.round(caloriesIn),
      caloriesBurned: Math.round(caloriesBurned),
      bmr: Math.round(bmr),
      totalExpenditure: Math.round(totalExpenditure),
      netDeficit: Math.round(netDeficit),
      calorieTarget: Math.round(calorieTarget),
    });
  }

  return result;
}
