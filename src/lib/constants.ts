// Baseline Constants & Config for Road to Jan 16 - Cutting & PPL Tracker
// Editable via Settings in the UI or stored in localStorage / database

export interface UserTargetConfig {
  startingWeight: number; // kg
  currentHeight: number; // cm
  baseBmr: number; // kcal/day
  dailyCalorieTarget: number; // kcal/day
  dailyProteinMin: number; // g
  dailyProteinTarget: number; // g
  dailyProteinMax: number; // g
  targetWaistCm: number; // cm
  targetEventDate: string; // YYYY-MM-DD
  targetEventTitle: string;
}

export const DEFAULT_USER_CONFIG: UserTargetConfig = {
  startingWeight: 105,
  currentHeight: 178,
  baseBmr: 2056,
  dailyCalorieTarget: 1600,
  dailyProteinMin: 100, // Threshold alert: < 100g is Red/Amber, >= 100g is Green
  dailyProteinTarget: 110,
  dailyProteinMax: 130,
  targetWaistCm: 100,
  targetEventDate: "2027-01-16",
  targetEventTitle: "Wedding Day Target (16 Jan 2027)",
};

// 1-Tap Quick-Add Presets
export interface FoodPreset {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  isCreatine?: boolean;
  icon?: string;
  badge?: string;
}

export const QUICK_ADD_PRESETS: FoodPreset[] = [
  {
    id: "preset-kent-soy",
    name: "Kent Soy Protein (50g) + Stevia",
    calories: 203,
    protein: 21,
    carbs: 18,
    fat: 3,
    badge: "21g Prot",
  },
  {
    id: "preset-2-telur",
    name: "2 Telur Ayam Rebus",
    calories: 155,
    protein: 12,
    carbs: 1,
    fat: 10,
    badge: "12g Prot",
  },
  {
    id: "preset-ikan-kembung",
    name: "1 Ekor Ikan Kembung",
    calories: 160,
    protein: 22,
    carbs: 0,
    fat: 8,
    badge: "22g Prot",
  },
  {
    id: "preset-creatine",
    name: "Creatine 5g + Air",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    isCreatine: true,
    badge: "Habit",
  },
];

// Additional popular Indonesian cutting food items for quick addition
export const INDONESIAN_CUTTING_FOODS: FoodPreset[] = [
  {
    id: "indo-dada-ayam",
    name: "Dada Ayam Panggang (100g)",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  },
  {
    id: "indo-nasi-merah",
    name: "Nasi Merah Matang (100g)",
    calories: 111,
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
  },
  {
    id: "indo-tempe-kukus",
    name: "Tempe Kukus (100g)",
    calories: 192,
    protein: 19,
    carbs: 9,
    fat: 11,
  },
  {
    id: "indo-tahu-kukus",
    name: "Tahu Putih Kukus (100g)",
    calories: 76,
    protein: 8,
    carbs: 2,
    fat: 4.8,
  },
  {
    id: "indo-sayur-bayam",
    name: "Sayur Bening Bayam (1 Mangkuk)",
    calories: 45,
    protein: 3,
    carbs: 7,
    fat: 0.5,
  },
  {
    id: "indo-terong-teri",
    name: "Terong Balado Teri Sedang (100g)",
    calories: 130,
    protein: 6,
    carbs: 9,
    fat: 7,
  },
];

// Prayer plank checklist items
export interface PrayerPlank {
  key: "plank_subuh" | "plank_dzuhur" | "plank_ashar" | "plank_maghrib" | "plank_isya";
  label: string;
  defaultTime: string;
}

export const PRAYER_PLANKS: PrayerPlank[] = [
  { key: "plank_subuh", label: "Subuh", defaultTime: "04:30" },
  { key: "plank_dzuhur", label: "Dzuhur", defaultTime: "12:00" },
  { key: "plank_ashar", label: "Ashar", defaultTime: "15:15" },
  { key: "plank_maghrib", label: "Maghrib", defaultTime: "18:00" },
  { key: "plank_isya", label: "Isya", defaultTime: "19:15" },
];

// Exercise splits and pre-populated templates
export interface ExerciseTemplate {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
}

export interface SplitCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  defaultCaloriesBurned: number;
  templates: ExerciseTemplate[];
}

export const WORKOUT_SPLITS: Record<string, SplitCategory> = {
  "Push Day": {
    id: "Push Day",
    name: "Push Day (Chest, Shoulders, Triceps)",
    description: "Incline focus, lateral delts, and tricep extension volume",
    color: "from-blue-500 to-indigo-600",
    defaultCaloriesBurned: 420,
    templates: [
      { name: "Incline Dumbbell Press", sets: 4, reps: 10, weight_kg: 24 },
      { name: "Flat Dumbbell Press / Machine Press", sets: 3, reps: 12, weight_kg: 26 },
      { name: "Standing Overhead DB Shoulder Press", sets: 3, reps: 10, weight_kg: 16 },
      { name: "Dumbbell Lateral Raises (Strict)", sets: 4, reps: 15, weight_kg: 8 },
      { name: "Tricep Rope Pushdowns", sets: 4, reps: 12, weight_kg: 22 },
      { name: "Overhead Cable Tricep Extension", sets: 3, reps: 12, weight_kg: 18 },
    ],
  },
  "Pull Day": {
    id: "Pull Day",
    name: "Pull Day (Back, Rear Delts, Biceps)",
    description: "Lat width, upper back thickness, and bicep peaks",
    color: "from-emerald-500 to-teal-600",
    defaultCaloriesBurned: 440,
    templates: [
      { name: "Lat Pulldown (Neutral or Wide Grip)", sets: 4, reps: 10, weight_kg: 55 },
      { name: "Chest Supported Dumbbell Row", sets: 4, reps: 10, weight_kg: 22 },
      { name: "Seated Cable Row", sets: 3, reps: 12, weight_kg: 50 },
      { name: "Face Pulls (Rope Cable)", sets: 4, reps: 15, weight_kg: 18 },
      { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: 12, weight_kg: 12 },
      { name: "Dumbbell Hammer Curls", sets: 3, reps: 12, weight_kg: 12 },
    ],
  },
  "Legs Day": {
    id: "Legs Day",
    name: "Legs Day (Quads, Hamstrings, Calves)",
    description: "Lower body strength, metabolic burn, and knee stability",
    color: "from-rose-500 to-red-600",
    defaultCaloriesBurned: 520,
    templates: [
      { name: "Leg Press / Barbell Squats", sets: 4, reps: 10, weight_kg: 120 },
      { name: "Romanian Deadlift (Dumbbell or Barbell)", sets: 4, reps: 10, weight_kg: 60 },
      { name: "Bulgarian Split Squats (each leg)", sets: 3, reps: 10, weight_kg: 14 },
      { name: "Leg Extensions (Quads)", sets: 3, reps: 15, weight_kg: 45 },
      { name: "Seated Hamstring Leg Curls", sets: 4, reps: 12, weight_kg: 40 },
      { name: "Standing Calf Raises", sets: 4, reps: 20, weight_kg: 60 },
    ],
  },
  "Upper / Hybrid": {
    id: "Upper / Hybrid",
    name: "Upper / Hybrid Day",
    description: "Compound upper body and high-density metabolic training",
    color: "from-amber-500 to-orange-600",
    defaultCaloriesBurned: 460,
    templates: [
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight_kg: 24 },
      { name: "Pull-ups / Neutral Grip Pulldowns", sets: 4, reps: 8, weight_kg: 60 },
      { name: "Dumbbell Arnold Press", sets: 3, reps: 12, weight_kg: 14 },
      { name: "Cable Chest Flyes", sets: 3, reps: 15, weight_kg: 15 },
      { name: "Dumbbell Bicep & Tricep Superset", sets: 3, reps: 12, weight_kg: 14 },
    ],
  },
  "Rest / Recovery": {
    id: "Rest / Recovery",
    name: "Rest & Active Recovery",
    description: "Incline walk, full body mobility, and neuromuscular recovery",
    color: "from-slate-500 to-zinc-600",
    defaultCaloriesBurned: 150,
    templates: [
      { name: "Incline Treadmill Walk (Speed 4.5, Incline 8)", sets: 1, reps: 30, weight_kg: 0 },
      { name: "Hamstring & Hip Flexor Mobility Routine", sets: 1, reps: 15, weight_kg: 0 },
      { name: "Thoracic Spine Foam Rolling", sets: 1, reps: 10, weight_kg: 0 },
    ],
  },
};
