import { getSupabaseClient } from "./supabase";
import {
  DailyLog,
  FoodEntry,
  WorkoutLog,
  BodyProgress,
  DailyChartDataPoint,
} from "./types";
import { DEFAULT_USER_CONFIG, UserTargetConfig, WORKOUT_SPLITS } from "./constants";

// Helper: Format date as YYYY-MM-DD
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

// LocalStorage Keys
const KEYS = {
  USER_CONFIG: "road_to_jan16_user_config",
  DAILY_LOGS: "road_to_jan16_daily_logs",
  FOOD_ENTRIES: "road_to_jan16_food_entries",
  WORKOUT_LOGS: "road_to_jan16_workout_logs",
  BODY_PROGRESS: "road_to_jan16_body_progress",
};

/**
 * Clear any existing state or local storage keys that hold hardcoded/stale total values.
 * Removes legacy ghost/seed entries and recalculates stored daily log totals strictly from
 * the food entries array via .reduce().
 */
export function clearStaleStorageTotals(): void {
  if (typeof window === "undefined") return;
  try {
    // 1. Remove legacy / stale seed keys
    const staleKeys = [
      "road_to_jan16_seeded_v1",
      "road_to_jan16_seeded",
      "road_to_jan16_total_calories",
      "road_to_jan16_total_protein",
      "totalCalories",
      "totalProtein",
    ];
    staleKeys.forEach((key) => localStorage.removeItem(key));

    // 2. Load food entries and remove any legacy dummy seed items (e.g. id starting with 'seed-fe-')
    const storedFood = localStorage.getItem(KEYS.FOOD_ENTRIES);
    let allFood: FoodEntry[] = storedFood ? JSON.parse(storedFood) : [];
    const cleanedFood = allFood.filter((item) => !item.id?.startsWith("seed-fe-"));

    if (cleanedFood.length !== allFood.length) {
      localStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(cleanedFood));
    }

    // 3. Clean up daily logs so calories_in and protein_in strictly match food entries for every date
    const storedLogs = localStorage.getItem(KEYS.DAILY_LOGS);
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs);
      if (typeof parsedLogs === "object" && parsedLogs !== null) {
        for (const dateKey of Object.keys(parsedLogs)) {
          const dayEntries = cleanedFood.filter((e) => e.log_date === dateKey);
          const trueCalories = dayEntries.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
          const trueProtein = dayEntries.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);

          parsedLogs[dateKey] = {
            ...parsedLogs[dateKey],
            calories_in: trueCalories,
            protein_in: trueProtein,
          };
        }
        localStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(parsedLogs));
      }
    }
  } catch (e) {
    console.warn("Error clearing stale storage totals:", e);
  }
}

// Auto-run cleanup on client load
if (typeof window !== "undefined") {
  clearStaleStorageTotals();
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
export function getEmptyDailyLog(dateStr: string = formatDate(new Date())): DailyLog {
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
export function getEmptyWorkoutLog(dateStr: string = formatDate(new Date())): WorkoutLog {
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
    const raw = localStorage.getItem(KEYS.USER_CONFIG);
    if (!raw) return DEFAULT_USER_CONFIG;
    return { ...DEFAULT_USER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_CONFIG;
  }
}

export function saveUserConfig(config: UserTargetConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.USER_CONFIG, JSON.stringify(config));
}

// ==========================================
// DAILY LOGS (TOTALS CALCULATED DYNAMICALLY ON THE FLY FROM FOOD ENTRIES)
// ==========================================
export async function getDailyLog(dateStr?: string): Promise<DailyLog> {
  const targetDate = dateStr || formatDate(new Date());
  const todayDateStr = formatDate(new Date());
  const todayLocaleDateStr = new Date().toLocaleDateString();

  // Dynamically calculate total calories and total protein on the fly from food entries array
  const foodEntries = await getFoodEntries(targetDate);
  const dynamicCaloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const dynamicProteinIn = foodEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

  const baseEmptyLog: DailyLog = {
    ...getEmptyDailyLog(targetDate),
    calories_in: dynamicCaloriesIn,
    protein_in: dynamicProteinIn,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("log_date", targetDate)
        .maybeSingle();

      if (!error && data) {
        const isTargetToday = targetDate === todayDateStr || targetDate === todayLocaleDateStr;
        if (isTargetToday && data.log_date !== todayDateStr && data.log_date !== todayLocaleDateStr) {
          return baseEmptyLog;
        }

        return {
          id: data.id,
          log_date: data.log_date,
          fasting_hours: Number(data.fasting_hours) || 0,
          calories_in: dynamicCaloriesIn, // Always dynamic from foodEntries.reduce()
          protein_in: dynamicProteinIn,   // Always dynamic from foodEntries.reduce()
          carbs_in: Number(data.carbs_in) || 0,
          fat_in: Number(data.fat_in) || 0,
          creatine_taken: Boolean(data.creatine_taken),
          water_liters: Number(data.water_liters) || 0,
          notes: data.notes || "",
          created_at: data.created_at,
        };
      }
    } catch (e) {
      console.warn("Supabase getDailyLog failed, falling back to local:", e);
    }
  }

  // Fallback to LocalStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(KEYS.DAILY_LOGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        let record: DailyLog | undefined = parsed[targetDate];

        if (!record && parsed.log_date) {
          record = parsed;
        }

        if (record) {
          const isTargetToday = targetDate === todayDateStr || targetDate === todayLocaleDateStr;
          if (
            isTargetToday &&
            record.log_date !== todayDateStr &&
            record.log_date !== todayLocaleDateStr
          ) {
            return baseEmptyLog;
          }

          if (record.log_date !== targetDate) {
            return baseEmptyLog;
          }

          return {
            id: record.id || `dl-${targetDate}`,
            log_date: record.log_date || targetDate,
            fasting_hours: Number(record.fasting_hours) || 0,
            calories_in: dynamicCaloriesIn, // Always dynamic from foodEntries.reduce()
            protein_in: dynamicProteinIn,   // Always dynamic from foodEntries.reduce()
            carbs_in: Number(record.carbs_in) || 0,
            fat_in: Number(record.fat_in) || 0,
            creatine_taken: Boolean(record.creatine_taken),
            water_liters: Number(record.water_liters) || 0,
            notes: record.notes || "",
            created_at: record.created_at,
          };
        }
      } catch {
        // ignore
      }
    }
  }

  return baseEmptyLog;
}

export async function saveDailyLog(log: DailyLog): Promise<DailyLog> {
  // Always derive calories_in and protein_in dynamically from food entries
  const foodEntries = await getFoodEntries(log.log_date);
  const dynamicCaloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const dynamicProteinIn = foodEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

  const cleanLog: DailyLog = {
    ...log,
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
      console.warn("Supabase saveDailyLog failed, caching local:", e);
    }
  }

  // Always mirror to LocalStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(KEYS.DAILY_LOGS);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[cleanLog.log_date] = cleanLog;
      localStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  return cleanLog;
}

// ==========================================
// FOOD ENTRIES
// ==========================================
export async function getFoodEntries(dateStr?: string): Promise<FoodEntry[]> {
  const targetDate = dateStr || formatDate(new Date());
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("log_date", targetDate)
        .order("created_at", { ascending: true });

      if (!error && data) {
        return data.map((item) => ({
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
      console.warn("Supabase getFoodEntries failed, falling back to local:", e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(KEYS.FOOD_ENTRIES);
    if (stored) {
      try {
        const all: FoodEntry[] = JSON.parse(stored);
        // Exclude any ghost seed entries
        return all.filter((entry) => entry.log_date === targetDate && !entry.id?.startsWith("seed-fe-"));
      } catch {
        // ignore
      }
    }
  }

  return [];
}

export async function addFoodEntry(entry: Omit<FoodEntry, "id" | "created_at">): Promise<FoodEntry> {
  const supabase = getSupabaseClient();
  const newId = `food-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullEntry: FoodEntry = {
    ...entry,
    id: newId,
    created_at: new Date().toISOString(),
    calories: Number(entry.calories) || 0,
    protein: Number(entry.protein) || 0,
  };

  if (supabase) {
    try {
      // Ensure daily_logs record exists
      await supabase.from("daily_logs").upsert(
        { log_date: entry.log_date },
        { onConflict: "log_date" }
      );

      const { data, error } = await supabase
        .from("food_entries")
        .insert({
          log_date: entry.log_date,
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

  // LocalStorage mirror
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(KEYS.FOOD_ENTRIES);
      const all: FoodEntry[] = stored ? JSON.parse(stored) : [];
      all.push(fullEntry);
      localStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(all));

      // Calculate totals dynamically on the fly from the updated array
      const dateEntries = all.filter((e) => e.log_date === entry.log_date && !e.id?.startsWith("seed-fe-"));
      const dynamicCalories = dateEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
      const dynamicProtein = dateEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

      const currentDailyLog = await getDailyLog(entry.log_date);
      currentDailyLog.calories_in = dynamicCalories;
      currentDailyLog.protein_in = dynamicProtein;
      await saveDailyLog(currentDailyLog);
    } catch {
      // ignore
    }
  }

  return fullEntry;
}

export async function deleteFoodEntry(id: string, dateStr: string): Promise<void> {
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
      const stored = localStorage.getItem(KEYS.FOOD_ENTRIES);
      if (stored) {
        const all: FoodEntry[] = JSON.parse(stored);
        const filtered = all.filter((e) => e.id !== id);
        localStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(filtered));

        // Calculate totals dynamically on the fly from remaining items
        const dateEntries = filtered.filter((e) => e.log_date === dateStr && !e.id?.startsWith("seed-fe-"));
        const dynamicCalories = dateEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
        const dynamicProtein = dateEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);

        const currentDailyLog = await getDailyLog(dateStr);
        currentDailyLog.calories_in = dynamicCalories;
        currentDailyLog.protein_in = dynamicProtein;
        await saveDailyLog(currentDailyLog);
      }
    } catch {
      // ignore
    }
  }
}

// ==========================================
// WORKOUT LOGS
// ==========================================
export async function getWorkoutLog(dateStr?: string): Promise<WorkoutLog> {
  const targetDate = dateStr || formatDate(new Date());
  const todayDateStr = formatDate(new Date());
  const todayLocaleDateStr = new Date().toLocaleDateString();

  const emptyLog = getEmptyWorkoutLog(targetDate);
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("log_date", targetDate)
        .maybeSingle();

      if (!error && data) {
        const isTargetToday = targetDate === todayDateStr || targetDate === todayLocaleDateStr;
        if (isTargetToday && data.log_date !== todayDateStr && data.log_date !== todayLocaleDateStr) {
          return emptyLog;
        }

        return {
          id: data.id,
          log_date: data.log_date,
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
      console.warn("Supabase getWorkoutLog failed, falling back to local:", e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(KEYS.WORKOUT_LOGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        let record = parsed[targetDate];

        if (!record && parsed.log_date) {
          record = parsed;
        }

        if (record) {
          const isTargetToday = targetDate === todayDateStr || targetDate === todayLocaleDateStr;
          if (
            isTargetToday &&
            record.log_date !== todayDateStr &&
            record.log_date !== todayLocaleDateStr
          ) {
            return emptyLog;
          }

          if (record.log_date !== targetDate) {
            return emptyLog;
          }

          return {
            id: record.id || `wl-${targetDate}`,
            log_date: record.log_date || targetDate,
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
        // ignore
      }
    }
  }

  return emptyLog;
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<WorkoutLog> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const payload = {
        log_date: log.log_date,
        split_category: log.split_category,
        exercises: log.exercises || [],
        cardio_minutes: Number(log.cardio_minutes) || 0,
        plank_subuh: Boolean(log.plank_subuh),
        plank_dzuhur: Boolean(log.plank_dzuhur),
        plank_ashar: Boolean(log.plank_ashar),
        plank_maghrib: Boolean(log.plank_maghrib),
        plank_isya: Boolean(log.plank_isya),
        recovery_rating: Number(log.recovery_rating) || 3,
        workout_calories_burned: Number(log.workout_calories_burned) || 0,
      };

      const { data, error } = await supabase
        .from("workout_logs")
        .upsert(payload, { onConflict: "log_date" })
        .select()
        .single();

      if (!error && data) {
        log = { ...log, id: data.id };
      }
    } catch (e) {
      console.warn("Supabase saveWorkoutLog failed, saving local:", e);
    }
  }

  // LocalStorage mirror
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(KEYS.WORKOUT_LOGS);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[log.log_date] = log;
      localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  return log;
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
      console.warn("Supabase getBodyProgressList failed, falling back to local:", e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(KEYS.BODY_PROGRESS);
    if (stored) {
      try {
        const list: BodyProgress[] = JSON.parse(stored);
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
  const supabase = getSupabaseClient();
  const newEntry: BodyProgress = {
    id: `bp-${entry.log_date}`,
    log_date: entry.log_date,
    weight_kg: Number(entry.weight_kg) || 0,
    waist_cm: Number(entry.waist_cm) || 0,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("body_progress")
        .upsert(
          {
            log_date: entry.log_date,
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
      const stored = localStorage.getItem(KEYS.BODY_PROGRESS);
      const list: BodyProgress[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((p) => p.log_date === entry.log_date);
      if (index >= 0) {
        list[index] = newEntry;
      } else {
        list.push(newEntry);
      }
      list.sort((a, b) => a.log_date.localeCompare(b.log_date));
      localStorage.setItem(KEYS.BODY_PROGRESS, JSON.stringify(list));
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

  // Load all daily logs and workout logs
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    const foodEntries = await getFoodEntries(dateStr);
    const workoutLog = await getWorkoutLog(dateStr);

    // Calculate caloriesIn dynamically from food entries
    const caloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    const caloriesBurned = Number(workoutLog.workout_calories_burned) || 0;
    const totalExpenditure = bmr + caloriesBurned;
    const netDeficit = totalExpenditure - caloriesIn;

    // Display formatted date (e.g. "01 Nov")
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
