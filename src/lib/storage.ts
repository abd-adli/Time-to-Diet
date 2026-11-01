import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
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
  SEEDED: "road_to_jan16_seeded_v1",
};

// Seed initial realistic data for LocalStorage/Demo mode if empty
export function seedInitialLocalData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.SEEDED)) return;

  const today = new Date();
  const todayStr = formatDate(today);

  // Body progress seed (last 14 days)
  const bodyProgressSeed: BodyProgress[] = [];
  const weights = [105.0, 104.6, 104.2, 104.0, 103.7, 103.4, 103.0, 102.8, 102.5];
  const waists = [110.0, 109.5, 109.0, 108.6, 108.2, 107.8, 107.5, 107.2, 106.8];

  for (let i = 8; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 2);
    bodyProgressSeed.push({
      id: `seed-bp-${i}`,
      log_date: formatDate(d),
      weight_kg: weights[8 - i],
      waist_cm: waists[8 - i],
      created_at: d.toISOString(),
    });
  }
  localStorage.setItem(KEYS.BODY_PROGRESS, JSON.stringify(bodyProgressSeed));

  // Daily logs and workout logs for the past 7 days
  const dailyLogsSeed: Record<string, DailyLog> = {};
  const workoutLogsSeed: Record<string, WorkoutLog> = {};
  const foodEntriesSeed: FoodEntry[] = [];

  const splits = ["Push Day", "Pull Day", "Legs Day", "Rest / Recovery", "Push Day", "Pull Day", "Legs Day"];
  const caloriesBurnedList = [420, 440, 510, 150, 430, 450, 520];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    const isToday = i === 0;
    const calIn = isToday ? 0 : 0;
    const protIn = isToday ? 0 : 0;

    dailyLogsSeed[dateStr] = {
      id: `seed-dl-${dateStr}`,
      log_date: dateStr,
      fasting_hours: 16.0,
      calories_in: calIn,
      protein_in: protIn,
      carbs_in: 120,
      fat_in: 45,
      creatine_taken: true,
      water_liters: 3.0,
      notes: isToday ? "Feeling strong, intermittent fast smooth" : "Good recovery, hydration on point",
    };

    const splitName = splits[6 - i] || "Push Day";
    const splitConfig = WORKOUT_SPLITS[splitName] || WORKOUT_SPLITS["Push Day"];

    workoutLogsSeed[dateStr] = {
      id: `seed-wl-${dateStr}`,
      log_date: dateStr,
      split_category: splitName,
      exercises: splitConfig.templates.map((t) => ({ ...t, completed: true })),
      cardio_minutes: 20,
      plank_subuh: true,
      plank_dzuhur: true,
      plank_ashar: true,
      plank_maghrib: !isToday || true,
      plank_isya: !isToday,
      recovery_rating: 4,
      workout_calories_burned: caloriesBurnedList[6 - i] || 400,
    };

    if (isToday) {
      foodEntriesSeed.push(
        {
          id: "seed-fe-1",
          log_date: dateStr,
          meal_name: "Kent Soy Protein (50g) + Stevia",
          calories: 203,
          protein: 21,
          is_ai_estimated: false,
        },
        {
          id: "seed-fe-2",
          log_date: dateStr,
          meal_name: "2 Telur Ayam Rebus & Nasi Merah 100g",
          calories: 266,
          protein: 15,
          is_ai_estimated: false,
        },
        {
          id: "seed-fe-3",
          log_date: dateStr,
          meal_name: "1 Ekor Ikan Kembung Bakar + Sayur Bayam",
          calories: 280,
          protein: 26,
          is_ai_estimated: true,
        },
        {
          id: "seed-fe-4",
          log_date: dateStr,
          meal_name: "Dada Ayam Fillet 200g + Sambal Tomat",
          calories: 380,
          protein: 42,
          is_ai_estimated: true,
        },
        {
          id: "seed-fe-5",
          log_date: dateStr,
          meal_name: "Tempe Kukus 120g",
          calories: 251,
          protein: 12,
          is_ai_estimated: false,
        }
      );
    }
  }

  localStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(dailyLogsSeed));
  localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(workoutLogsSeed));
  localStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(foodEntriesSeed));
  localStorage.setItem(KEYS.SEEDED, "true");
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
// DAILY LOGS
// ==========================================
export async function getDailyLog(dateStr: string): Promise<DailyLog> {
  const supabase = getSupabaseClient();
  const defaultLog: DailyLog = {
    id: `dl-${dateStr}`,
    log_date: dateStr,
    fasting_hours: 16.0,
    calories_in: 0,
    protein_in: 0,
    carbs_in: 0,
    fat_in: 0,
    creatine_taken: false,
    water_liters: 0,
    notes: "",
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("log_date", dateStr)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          log_date: data.log_date,
          fasting_hours: Number(data.fasting_hours) || 0,
          calories_in: Number(data.calories_in) || 0,
          protein_in: Number(data.protein_in) || 0,
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
    seedInitialLocalData();
    const stored = localStorage.getItem(KEYS.DAILY_LOGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed[dateStr]) {
          return parsed[dateStr];
        }
      } catch {
        // ignore
      }
    }
  }

  return defaultLog;
}

export async function saveDailyLog(log: DailyLog): Promise<DailyLog> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const payload = {
        log_date: log.log_date,
        fasting_hours: Number(log.fasting_hours) || 0,
        calories_in: Number(log.calories_in) || 0,
        protein_in: Number(log.protein_in) || 0,
        carbs_in: Number(log.carbs_in) || 0,
        fat_in: Number(log.fat_in) || 0,
        creatine_taken: Boolean(log.creatine_taken),
        water_liters: Number(log.water_liters) || 0,
        notes: log.notes || "",
      };

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(payload, { onConflict: "log_date" })
        .select()
        .single();

      if (!error && data) {
        log = { ...log, id: data.id };
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
      parsed[log.log_date] = log;
      localStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  return log;
}

// ==========================================
// FOOD ENTRIES
// ==========================================
export async function getFoodEntries(dateStr: string): Promise<FoodEntry[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("log_date", dateStr)
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
    seedInitialLocalData();
    const stored = localStorage.getItem(KEYS.FOOD_ENTRIES);
    if (stored) {
      try {
        const all: FoodEntry[] = JSON.parse(stored);
        return all.filter((entry) => entry.log_date === dateStr);
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

  // Ensure daily_logs exists first
  const currentDailyLog = await getDailyLog(entry.log_date);

  if (supabase) {
    try {
      // Ensure daily_logs record exists
      await supabase.from("daily_logs").upsert(
        {
          log_date: entry.log_date,
          fasting_hours: currentDailyLog.fasting_hours,
          calories_in: currentDailyLog.calories_in,
          protein_in: currentDailyLog.protein_in,
        },
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

      // Recalculate daily log calories_in and protein_in
      const dateEntries = all.filter((e) => e.log_date === entry.log_date);
      const sumCalories = dateEntries.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
      const sumProtein = dateEntries.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);

      currentDailyLog.calories_in = sumCalories;
      currentDailyLog.protein_in = sumProtein;
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

        // Recalculate daily log totals
        const dateEntries = filtered.filter((e) => e.log_date === dateStr);
        const sumCalories = dateEntries.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
        const sumProtein = dateEntries.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);

        const currentDailyLog = await getDailyLog(dateStr);
        currentDailyLog.calories_in = sumCalories;
        currentDailyLog.protein_in = sumProtein;
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
export async function getWorkoutLog(dateStr: string): Promise<WorkoutLog> {
  const supabase = getSupabaseClient();
  const defaultLog: WorkoutLog = {
    id: `wl-${dateStr}`,
    log_date: dateStr,
    split_category: "Push Day",
    exercises: (WORKOUT_SPLITS["Push Day"]?.templates || []).map((t) => ({ ...t })),
    cardio_minutes: 0,
    plank_subuh: false,
    plank_dzuhur: false,
    plank_ashar: false,
    plank_maghrib: false,
    plank_isya: false,
    recovery_rating: 3,
    workout_calories_burned: 0,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("log_date", dateStr)
        .maybeSingle();

      if (!error && data) {
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
    seedInitialLocalData();
    const stored = localStorage.getItem(KEYS.WORKOUT_LOGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed[dateStr]) {
          return parsed[dateStr];
        }
      } catch {
        // ignore
      }
    }
  }

  return defaultLog;
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
    seedInitialLocalData();
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

    const dailyLog = await getDailyLog(dateStr);
    const workoutLog = await getWorkoutLog(dateStr);

    const caloriesIn = Number(dailyLog.calories_in) || 0;
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
