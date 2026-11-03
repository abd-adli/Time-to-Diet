"use client";

import React, { useState } from "react";
import { Check, Flame, Zap, Droplets, Dumbbell, Award, Timer, ShieldAlert } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DailyLog, WorkoutLog, FoodEntry } from "@/lib/types";
import { saveDailyLog, saveWorkoutLog } from "@/lib/storage";
import { PRAYER_PLANKS } from "@/lib/constants";
import { PlankTimerModal } from "./PlankTimerModal";
import confetti from "canvas-confetti";

interface MacroSummaryProps {
  dailyLog: DailyLog;
  workoutLog: WorkoutLog;
  foodEntries?: FoodEntry[];
  onUpdate: () => void;
}

export function MacroSummary({
  dailyLog,
  workoutLog,
  foodEntries = [],
  onUpdate,
}: MacroSummaryProps) {
  const { userConfig, user } = useApp();
  const [activePlankTimer, setActivePlankTimer] = useState<string | null>(null);

  // Targets
  const calorieTarget = userConfig.dailyCalorieTarget || 1600;
  const proteinTarget = userConfig.dailyProteinTarget || 110;
  const proteinMinThreshold = userConfig.dailyProteinMin || 100;
  const bmr = userConfig.baseBmr || 2056;

  // Calculate total calories and total protein dynamically on the fly using .reduce() on foodEntries array
  const caloriesIn = foodEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const proteinIn = foodEntries.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);
  const workoutBurned = Number(workoutLog.workout_calories_burned) || 0;

  // Net Calorie Deficit Calculation: (BMR + workout_calories_burned) - calories_in
  const totalExpenditure = bmr + workoutBurned;
  const netDeficit = totalExpenditure - caloriesIn;

  // Protein color condition strictly requested:
  // "Turn bar RED/AMBER if under 100g, GREEN if >= 100g"
  const isProteinAdequate = proteinIn >= proteinMinThreshold;
  const isProteinOptimal = proteinIn >= proteinTarget;

  // Calorie progress
  const caloriePercent = Math.min(100, Math.round((caloriesIn / calorieTarget) * 100));
  const proteinPercent = Math.min(150, Math.round((proteinIn / proteinTarget) * 100));

  // Count active planks
  const completedPlanksCount = [
    workoutLog.plank_subuh,
    workoutLog.plank_dzuhur,
    workoutLog.plank_ashar,
    workoutLog.plank_maghrib,
    workoutLog.plank_isya,
  ].filter(Boolean).length;

  // Toggle Creatine
  const handleToggleCreatine = async () => {
    const updated = { ...dailyLog, creatine_taken: !dailyLog.creatine_taken };
    await saveDailyLog(updated, user?.id);
    onUpdate();
  };

  // Toggle Prayer Plank
  const handleTogglePlank = async (key: keyof WorkoutLog) => {
    const updated = { ...workoutLog, [key]: !workoutLog[key] };
    await saveWorkoutLog(updated, user?.id);
    onUpdate();

    // Trigger celebratory confetti if this completes all 5!
    const newCount = [
      key === "plank_subuh" ? !workoutLog.plank_subuh : workoutLog.plank_subuh,
      key === "plank_dzuhur" ? !workoutLog.plank_dzuhur : workoutLog.plank_dzuhur,
      key === "plank_ashar" ? !workoutLog.plank_ashar : workoutLog.plank_ashar,
      key === "plank_maghrib" ? !workoutLog.plank_maghrib : workoutLog.plank_maghrib,
      key === "plank_isya" ? !workoutLog.plank_isya : workoutLog.plank_isya,
    ].filter(Boolean).length;

    if (newCount === 5) {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
    }
  };

  const handleCompletePlankFromTimer = async (key: string) => {
    const updated = { ...workoutLog, [key]: true };
    await saveWorkoutLog(updated, user?.id);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* 3 Main Summary Ring / Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Calorie Intake vs 1600 Target */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Asupan Kalori</span>
            </div>
            <span className="text-xs text-slate-400">Target: {calorieTarget} kcal</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-white font-mono">{caloriesIn}</span>
                <span className="text-xs text-slate-400">/ {calorieTarget} kcal</span>
              </div>
              <span
                className={`text-xs font-bold ${
                  caloriesIn > calorieTarget ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {caloriesIn <= calorieTarget
                  ? `Sisa ${calorieTarget - caloriesIn} kcal`
                  : `Lebih +${caloriesIn - calorieTarget} kcal`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  caloriesIn > calorieTarget
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-blue-500 to-cyan-400"
                }`}
                style={{ width: `${Math.min(100, caloriePercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Protein Intake (Red/Amber if <100g, Green if >=100g) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  isProteinAdequate
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Target Protein Harian</span>
            </div>
            <span className="text-xs text-slate-400">
              Min: {proteinMinThreshold}g | Opt: {proteinTarget}g
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-white font-mono">{proteinIn}</span>
                <span className="text-xs text-slate-400">/ {proteinTarget}g</span>
              </div>

              {/* Threshold Status Badge */}
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isProteinAdequate
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse"
                }`}
              >
                {isProteinOptimal
                  ? "Target Optimal!"
                  : isProteinAdequate
                  ? "Cukup (>=100g)"
                  : `Kurang ${proteinMinThreshold - proteinIn}g lagi!`}
              </span>
            </div>

            {/* Protein Progress Bar with STRICT RED/AMBER vs GREEN styling */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  isProteinAdequate
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-rose-500 to-amber-500"
                }`}
                style={{ width: `${Math.min(100, (proteinIn / proteinTarget) * 100)}%` }}
              />
            </div>
            {!isProteinAdequate && (
              <p className="text-[10px] text-amber-400/90 font-medium">
                Peringatan: Protein di bawah 100g dapat mengurangi massa otot saat cutting.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Net Calorie Deficit Calculation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Net Calorie Deficit</span>
            </div>
            <span className="text-[11px] text-slate-400">BMR ({bmr}) + Latihan</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-3xl font-black font-mono ${
                    netDeficit >= 500 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {netDeficit > 0 ? `-${netDeficit}` : `+${Math.abs(netDeficit)}`}
                </span>
                <span className="text-xs text-slate-400">kcal deficit</span>
              </div>
              <span className="text-[11px] font-bold text-slate-300">
                Out: {totalExpenditure} kcal
              </span>
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-800/40 p-2 rounded-xl flex items-center justify-between">
              <span>BMR: {bmr} kcal</span>
              <span>+ Latihan: {workoutBurned} kcal</span>
              <span>- Masuk: {caloriesIn} kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Habit Quick-Toggles: Creatine (5g) & 5-Time Prayer Planks */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>Daily Habits: Creatine & 5-Time Prayer Planks</span>
            </h3>
            <p className="text-xs text-slate-400">
              Disiplin harian: 5g creatine untuk retensi kekuatan & 1 menit plank setiap waktu sholat.
            </p>
          </div>

          {/* Creatine Quick-Toggle */}
          <button
            onClick={handleToggleCreatine}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl border transition-all text-xs font-semibold ${
              dailyLog.creatine_taken
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950"
                : "bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                dailyLog.creatine_taken ? "bg-emerald-500 text-slate-950" : "border border-slate-600"
              }`}
            >
              {dailyLog.creatine_taken && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <span>Creatine (5g) + Air</span>
          </button>
        </div>

        {/* 5-Time Prayer Planks with Score (X / 5) and 60s Timer Trigger */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Prayer Plank Checklist:{" "}
              <span className="text-emerald-400 font-bold font-mono">
                {completedPlanksCount} / 5 Selesai
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Klik ikon stopwatch untuk timer 60 detik
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRAYER_PLANKS.map((plank) => {
              const isDone = Boolean(workoutLog[plank.key]);
              return (
                <div
                  key={plank.key}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                      : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {/* Click checkbox to toggle */}
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
                      <div className="text-xs font-semibold">{plank.label}</div>
                      <div className="text-[10px] text-slate-400">{plank.defaultTime}</div>
                    </div>
                  </button>

                  {/* Stopwatch Button to trigger 60s timer modal */}
                  <button
                    onClick={() => setActivePlankTimer(plank.key)}
                    title={`Mulai 60 detik Plank ${plank.label}`}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors ml-1"
                  >
                    <Timer className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal for 60s Plank Timer */}
      {activePlankTimer && (
        <PlankTimerModal
          isOpen={Boolean(activePlankTimer)}
          onClose={() => setActivePlankTimer(null)}
          prayerName={
            PRAYER_PLANKS.find((p) => p.key === activePlankTimer)?.label || activePlankTimer
          }
          onComplete={() => handleCompletePlankFromTimer(activePlankTimer)}
        />
      )}
    </div>
  );
}
