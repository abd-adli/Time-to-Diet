"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { WorkoutLog, ExerciseItem } from "@/lib/types";
import {
  getWorkoutLog,
  saveWorkoutLog,
  calculateWorkoutCalories,
  getEmptyWorkoutLog,
  getTodayKey,
} from "@/lib/storage";
import { WORKOUT_SPLITS, PRAYER_PLANKS } from "@/lib/constants";
import { PlankTimerModal } from "@/components/PlankTimerModal";
import { Login } from "@/components/Login";
import {
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Flame,
  Timer,
  HeartPulse,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function WorkoutPage() {
  const { selectedDate, refreshKey, triggerRefresh, userConfig, user, authLoading } = useApp();

  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePlankTimer, setActivePlankTimer] = useState<string | null>(null);

  // New exercise quick input
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState(10);
  const [newExWeight, setNewExWeight] = useState(20);

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const targetDate = selectedDate || getTodayKey();
      const log = await getWorkoutLog(targetDate, user.id);
      const cleanLog = log && log.log_date === targetDate ? log : getEmptyWorkoutLog(targetDate, user.id);
      setWorkoutLog(cleanLog);
    } catch (err) {
      console.error("Failed to load workout log:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, user]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Memeriksa autentikasi profil...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (isLoading || !workoutLog) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Memuat log latihan PPL...</span>
      </div>
    );
  }

  // Handle Split Change
  const handleSplitChange = (newSplit: string) => {
    const splitConfig = WORKOUT_SPLITS[newSplit];
    if (!splitConfig) return;

    const updated: WorkoutLog = {
      ...workoutLog,
      split_category: newSplit,
      exercises: splitConfig.templates.map((t) => ({ ...t, completed: false })),
      workout_calories_burned:
        workoutLog.workout_calories_burned > 0
          ? workoutLog.workout_calories_burned
          : 0,
    };
    setWorkoutLog(updated);
  };

  // Exercise item updates
  const handleExerciseChange = (index: number, field: keyof ExerciseItem, value: any) => {
    const exercises = [...workoutLog.exercises];
    exercises[index] = { ...exercises[index], [field]: value };
    setWorkoutLog({ ...workoutLog, exercises });
  };

  const handleToggleExerciseComplete = (index: number) => {
    const exercises = [...workoutLog.exercises];
    exercises[index] = { ...exercises[index], completed: !exercises[index].completed };
    setWorkoutLog({ ...workoutLog, exercises });
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const exercises = [
      ...workoutLog.exercises,
      {
        name: newExName.trim(),
        sets: Number(newExSets) || 3,
        reps: Number(newExReps) || 10,
        weight_kg: Number(newExWeight) || 0,
        completed: false,
      },
    ];
    setWorkoutLog({ ...workoutLog, exercises });
    setNewExName("");
  };

  const handleDeleteExercise = (index: number) => {
    const exercises = workoutLog.exercises.filter((_, i) => i !== index);
    setWorkoutLog({ ...workoutLog, exercises });
  };

  // Toggle Plank
  const handleTogglePlank = (key: keyof WorkoutLog) => {
    const updated = { ...workoutLog, [key]: !workoutLog[key] };
    setWorkoutLog(updated);
  };

  // Save Workout Log (Filters only checked / completed exercises)
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Filter only checked / completed exercises so unselected preset items are not inserted into Supabase
      const selectedExercises = (workoutLog.exercises || []).filter(
        (ex) => Boolean(ex.completed || (ex as any).checked)
      );

      const payload: WorkoutLog = {
        ...workoutLog,
        exercises: selectedExercises,
      };

      await saveWorkoutLog(payload, user.id);
      setWorkoutLog(payload);
      triggerRefresh();
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
      } catch {}
    } catch (err) {
      console.error("Failed to save workout:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const completedPlankCount = [
    workoutLog.plank_subuh,
    workoutLog.plank_dzuhur,
    workoutLog.plank_ashar,
    workoutLog.plank_maghrib,
    workoutLog.plank_isya,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Hybrid PPL Workout & Habit Logger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Cutting Hypertrophy
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Push, Pull, Legs terstruktur untuk mempertahankan massa otot & habit plank 5 waktu sholat.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center space-x-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Menyimpan..." : "Simpan Workout"}</span>
        </button>
      </div>

      {/* Split Selector & Burned Calories Top Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Split Dropdown */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Kategori Split Hari Ini:
            </label>
            <div className="relative">
              <select
                value={workoutLog.split_category}
                onChange={(e) => handleSplitChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 text-xs font-semibold appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {Object.keys(WORKOUT_SPLITS).map((key) => (
                  <option key={key} value={key}>
                    {WORKOUT_SPLITS[key].name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400">
              {WORKOUT_SPLITS[workoutLog.split_category]?.description}
            </p>
          </div>

          {/* Workout Calories Burned (Pure numeric integer) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kalori Terbakar (Burned):</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                step="10"
                value={workoutLog.workout_calories_burned}
                onChange={(e) =>
                  setWorkoutLog({
                    ...workoutLog,
                    workout_calories_burned: Math.round(Number(e.target.value) || 0),
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-3.5 py-3 text-xs font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-medium">kcal</span>
            </div>
            <p className="text-[10px] text-slate-400">Nilai murni integer untuk kalkulasi defisit.</p>
            {/* Quick MET-based Auto-Calculator */}
            <div className="pt-1.5">
              <span className="text-[10px] text-slate-400 block mb-1">
                Kalkulator MET Otomatis (BB: {userConfig.startingWeight} kg):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const burned = calculateWorkoutCalories(userConfig.startingWeight, 60, "weightlifting");
                    setWorkoutLog({ ...workoutLog, workout_calories_burned: burned });
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-400 font-semibold rounded-lg border border-slate-700 transition-colors"
                  title="5.5 MET x Berat x 60 menit"
                >
                  Beban 60m (5.5 MET)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mins = workoutLog.cardio_minutes > 0 ? workoutLog.cardio_minutes : 30;
                    const burned = calculateWorkoutCalories(userConfig.startingWeight, mins, "incline_walk");
                    setWorkoutLog({ ...workoutLog, workout_calories_burned: burned, cardio_minutes: mins });
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-blue-400 font-semibold rounded-lg border border-slate-700 transition-colors"
                  title="7.5 MET x Berat x menit"
                >
                  Incline Walk {workoutLog.cardio_minutes > 0 ? `${workoutLog.cardio_minutes}m` : "30m"} (7.5 MET)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const burned = calculateWorkoutCalories(userConfig.startingWeight, 15, "core");
                    setWorkoutLog({
                      ...workoutLog,
                      workout_calories_burned: (workoutLog.workout_calories_burned || 0) + burned,
                    });
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-400 font-semibold rounded-lg border border-slate-700 transition-colors"
                  title="3.8 MET x Berat x 15 menit"
                >
                  Core/Plank 15m (3.8 MET)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cardio Minutes & Recovery Scale */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          {/* Cardio Minutes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              <span>Durasi Kardio LISS / Incline Walk:</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                value={workoutLog.cardio_minutes}
                onChange={(e) =>
                  setWorkoutLog({
                    ...workoutLog,
                    cardio_minutes: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">Menit</span>
            </div>
          </div>

          {/* Recovery Rating Scale (1 to 5) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Tingkat Pemulihan (Recovery 1 - 5):</span>
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setWorkoutLog({ ...workoutLog, recovery_rating: lvl })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    workoutLog.recovery_rating === lvl
                      ? "bg-rose-500 text-white shadow-md shadow-rose-950 scale-105"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>1: Capek/Lelah</span>
              <span>3: Normal</span>
              <span>5: Prima/Segar</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Time Prayer Plank Checklist & Timer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Habit Plank 5 Waktu Sholat ({completedPlankCount} / 5)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Target 1 menit plank setiap selesai sholat untuk aktivasi transversus abdominis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {PRAYER_PLANKS.map((plank) => {
            const isDone = Boolean(workoutLog[plank.key]);
            return (
              <div
                key={plank.key}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDone
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                    : "bg-slate-800/40 border-slate-700/50 text-slate-300"
                }`}
              >
                <button
                  onClick={() => handleTogglePlank(plank.key)}
                  className="flex items-center space-x-2 flex-1 text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                      isDone ? "bg-emerald-400 text-slate-950" : "border border-slate-600"
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{plank.label}</div>
                    <div className="text-[10px] text-slate-400">{plank.defaultTime}</div>
                  </div>
                </button>

                <button
                  onClick={() => setActivePlankTimer(plank.key)}
                  title="Mulai Stopwatch 60 Detik"
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors ml-1"
                >
                  <Timer className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercise Logs Table / List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Daftar Gerakan Latihan ({workoutLog.exercises.length})
            </h3>
          </div>
          <button
            onClick={() => {
              const defaultTemplates = WORKOUT_SPLITS[workoutLog.split_category]?.templates || [];
              setWorkoutLog({
                ...workoutLog,
                exercises: defaultTemplates.map((t) => ({ ...t, completed: false })),
              });
            }}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Template</span>
          </button>
        </div>

        {/* Exercises Table */}
        <div className="space-y-2.5">
          {workoutLog.exercises.map((ex, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                ex.completed
                  ? "bg-slate-800/30 border-slate-800/80 opacity-70"
                  : "bg-slate-800/70 border-slate-700/60"
              }`}
            >
              {/* Exercise Name and Complete check */}
              <div className="flex items-center space-x-3 flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleExerciseComplete(idx)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    ex.completed
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-slate-600 hover:border-emerald-400 text-transparent"
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => handleExerciseChange(idx, "name", e.target.value)}
                  className={`bg-transparent text-xs sm:text-sm font-semibold focus:outline-none focus:border-b border-emerald-400 flex-1 ${
                    ex.completed ? "line-through text-slate-400" : "text-white"
                  }`}
                />
              </div>

              {/* Sets, Reps, Weight inputs */}
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400">Sets:</span>
                  <input
                    type="number"
                    min="1"
                    value={ex.sets}
                    onChange={(e) => handleExerciseChange(idx, "sets", Number(e.target.value))}
                    className="w-10 bg-transparent text-center font-mono text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400">Reps:</span>
                  <input
                    type="number"
                    min="1"
                    value={ex.reps}
                    onChange={(e) => handleExerciseChange(idx, "reps", Number(e.target.value))}
                    className="w-10 bg-transparent text-center font-mono text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400">Beban:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={ex.weight_kg}
                    onChange={(e) => handleExerciseChange(idx, "weight_kg", Number(e.target.value))}
                    className="w-12 bg-transparent text-center font-mono text-xs font-bold text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">kg</span>
                </div>

                <button
                  onClick={() => handleDeleteExercise(idx)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Exercise Form */}
        <form
          onSubmit={handleAddExercise}
          className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2.5"
        >
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Nama variasi gerakan baru..."
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Sets"
              value={newExSets}
              onChange={(e) => setNewExSets(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Reps"
              value={newExReps}
              onChange={(e) => setNewExReps(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Kg"
              value={newExWeight}
              onChange={(e) => setNewExWeight(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 text-emerald-400 rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Plank Modal */}
      {activePlankTimer && (
        <PlankTimerModal
          isOpen={Boolean(activePlankTimer)}
          onClose={() => setActivePlankTimer(null)}
          prayerName={
            PRAYER_PLANKS.find((p) => p.key === activePlankTimer)?.label || activePlankTimer
          }
          onComplete={() => {
            const updated = { ...workoutLog, [activePlankTimer]: true };
            setWorkoutLog(updated);
            saveWorkoutLog(updated, user?.id);
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
}
