// Core TypeScript types matching Supabase PostgreSQL schema and application state

export interface DailyLog {
  id: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  fasting_hours: number;
  calories_in: number;
  protein_in: number;
  carbs_in: number;
  fat_in: number;
  creatine_taken: boolean;
  water_liters: number;
  notes: string | null;
  created_at?: string;
}

export interface FoodEntry {
  id: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  meal_name: string;
  calories: number;
  protein: number;
  is_ai_estimated: boolean;
  created_at?: string;
}

export type ExerciseCategory =
  | "Gerakan Utama"
  | "Gerakan Pendukung"
  | "Gerakan Isolasi / Lengan"
  | "Finisher / Tambahan";

export interface ExerciseItem {
  name?: string;
  exercise_name?: string;
  category?: ExerciseCategory | string;
  sets: number;
  reps: number;
  weight_kg: number;
  completed?: boolean;
}

export interface WorkoutLog {
  id: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  split_category: string;
  exercises: ExerciseItem[];
  workout_details?: ExerciseItem[];
  cardio_minutes: number;
  plank_subuh: boolean;
  plank_dzuhur: boolean;
  plank_ashar: boolean;
  plank_maghrib: boolean;
  plank_isya: boolean;
  recovery_rating: number; // 1 to 5
  workout_calories_burned: number;
  created_at?: string;
}

export interface BodyProgress {
  id: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  weight_kg: number;
  waist_cm: number;
  created_at?: string;
}

// AI Food Estimate response format from Gemini
export interface FoodEstimateItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
}

export interface FoodEstimateResponse {
  items: FoodEstimateItem[];
  total_calories: number;
  total_protein: number;
  advice: string;
}

// Chart data point for daily tracking
export interface DailyChartDataPoint {
  date: string; // '01 Nov', 'Nov 1'
  fullDate: string; // '2026-11-01'
  caloriesIn: number;
  proteinIn: number;
  protein_in?: number;
  caloriesBurned: number;
  bmr: number;
  totalExpenditure: number; // BMR + caloriesBurned
  netDeficit: number; // totalExpenditure - caloriesIn
  calorieTarget: number;
}
