# Road to Jan 16 - Cutting & PPL Tracker 🏆

A modern, responsive, mobile-first Progressive Web App (PWA) designed for a 2-month disciplined cutting phase leading up to the target wedding date: **January 16, 2027**.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Lucide React**, **Recharts**, and **Supabase (PostgreSQL)**, featuring an **AI Food Scanner powered by Google Gemini 1.5 Flash**.

---

## 🎯 Core Baseline Parameters
- **Starting Weight**: `105 kg` (Height: `178 cm`)
- **Base BMR**: `2056 kcal/day`
- **Daily Calorie Intake Target**: `1600 kcal/day`
- **Daily Protein Target**: `110g - 130g/day` (Threshold alert at `<100g`: Amber/Red, `>=100g`: Green)
- **Target Waist Circumference**: `< 100 cm`
- **Target Event Date**: `2027-01-16` (Wedding Day)

*(All parameters are editable in the Settings page and persist in local storage and Supabase).*

---

## 🚀 Key Modules & Features

### 1. Main Dashboard (`/`)
- **Countdown & Hero Banner**: Real-time days remaining countdown to January 16, 2027, weight delta vs 105 kg start, and waist progress bar towards `<100 cm`.
- **Today's Macro Rings/Bars**:
  - Calorie Intake vs `1600 kcal` target with remaining or surplus indicator.
  - Protein Intake vs `110g` target: strict visual alert (<100g is Red/Amber, >=100g is Green).
  - **Net Calorie Deficit Formula**: `(BMR 2056 + workout_calories_burned) - calories_in`.
- **Daily Habit Quick-Toggles**:
  - Creatine (5g) + Air checkbox.
  - **5-Time Prayer Plank Checklist** (Subuh, Dzuhur, Ashar, Maghrib, Isya) with `X / 5` score.
  - Interactive **60-second Plank Stopwatch / Timer modal** with sound feedback.
- **Synchronized Interactive Chart (Recharts)**:
  - "Pelacakan Kalori Harian: Masuk vs Keluar & Defisit"
  - Bars for **Calories In** (Blue) and **Workout Calories Burned** (Green).
  - Dashed Reference Line at **1600 kcal** (Rose).
  - Line & Dots for **Daily Deficit** (Amber).
  - Strictly typed numeric parsing with zero `#VALUE!` or `NaN` errors.

### 2. AI Food Scanner & Nutrition Logger (`/food`)
- **AI Camera / Image Upload (`POST /api/estimate-food`)**:
  - Mobile camera capture (`capture="environment"`) & gallery image upload.
  - **Storage Optimization**: Images are compressed on client-side to `<500KB` using HTML5 Canvas, converted to Base64 in memory, and sent directly to `/api/estimate-food` via `@google/generative-ai` (`gemini-1.5-flash` with `responseMimeType: "application/json"`). **Zero images stored in Supabase Storage** to keep database cost and size near zero.
  - System prompt trained on Indonesian dishes: ikan kembung, telur rebus/dadar, terong teri, nasi merah, tempe/tahu, dada ayam, sayur bayam, etc.
  - Pre-filled editable review modal before saving.
- **1-Tap Quick-Add Presets**:
  - *"Kent Soy Protein (50g) + Stevia"* -> `+203 kcal`, `+21g Protein`
  - *"2 Telur Ayam Rebus"* -> `+155 kcal`, `+12g Protein`
  - *"1 Ekor Ikan Kembung"* -> `+160 kcal`, `+22g Protein`
  - *"Creatine 5g + Air"* -> `+0 kcal`, marks `creatine_taken = true`
- **Manual Food Logger & Daily Food Entries List**.

### 3. Hybrid PPL Workout & Habit Logger (`/workout`)
- **Split Category Selection**:
  - `Push Day` (Incline DB Press, Flat DB Press, Overhead Press, Lateral Raises, Tricep Rope)
  - `Pull Day` (Lat Pulldowns, Chest Supported Rows, Cable Rows, Face Pulls, Curls)
  - `Legs Day` (Leg Press/Squats, RDL, Split Squats, Leg Extensions, Hamstring Curls, Calves)
  - `Upper / Hybrid` (Incline Press, Pull-ups, Arnold Press, Flyes, Arm Supersets)
  - `Rest / Active Recovery` (Incline Treadmill Walk, Mobility, Foam Rolling)
- Dynamic exercise list: add/delete exercises, adjust sets, reps, weight (kg), and mark completed.
- Pure numeric integer `workout_calories_burned` input and cardio minutes tracking.
- Recovery scale (1 to 5).

### 4. Body Progress & Fasting Tracker (`/progress`)
- Daily weight (kg) and waist circumference (cm) log.
- Intermittent Fasting (16:8) duration tracker.
- Dual interactive Recharts line charts for Weight Loss Trend and Waist Reduction Trend.

### 5. Settings & Seamless Offline/Demo Mode (`/settings`)
- Configurable Supabase credentials with live connection test.
- Configurable Gemini API Key.
- LocalStorage fallback: if Supabase credentials are not provided or offline, the app operates seamlessly in Demo/Offline mode with pre-seeded realistic cutting data.
- JSON data export / backup & reset.

---

## 🛠️ Database Setup (Supabase)

1. Open your project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor**.
3. Open and run the `schema.sql` file provided in the repository root.
4. Copy your **Project URL** and **Anon Public Key**.
5. Create a `.env.local` file or paste them directly in the app's **Settings (`/settings`)** page:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

---

## 🏃 Running the Application

### Development:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build:
```bash
npm run build
npm start
```

---

## 📱 Progressive Web App (PWA) Installation
- On Android (Chrome): Tap the three-dot menu -> **"Install App"** or **"Add to Home screen"**.
- On iOS (Safari): Tap the Share button -> **"Add to Home Screen"**.
