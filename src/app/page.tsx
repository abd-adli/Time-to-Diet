"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { DailyLog, WorkoutLog, BodyProgress, FoodEntry } from "@/lib/types";
import {
  getDailyLog,
  getWorkoutLog,
  getBodyProgressList,
  getFoodEntries,
} from "@/lib/storage";
import { HeroCountdown } from "@/components/HeroCountdown";
import { MacroSummary } from "@/components/MacroSummary";
import { InteractiveCalorieChart } from "@/components/InteractiveCalorieChart";
import {
  UtensilsCrossed,
  Dumbbell,
  ArrowRight,
  Camera,
  Plus,
  Flame,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { selectedDate, refreshKey, triggerRefresh } = useApp();

  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [bodyProgressList, setBodyProgressList] = useState<BodyProgress[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dl, wl, bp, fe] = await Promise.all([
        getDailyLog(selectedDate),
        getWorkoutLog(selectedDate),
        getBodyProgressList(),
        getFoodEntries(selectedDate),
      ]);
      setDailyLog(dl);
      setWorkoutLog(wl);
      setBodyProgressList(bp);
      setFoodEntries(fe);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  if (loading || !dailyLog || !workoutLog) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Menyiapkan dashboard cutting...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* 1. Countdown & Hero Banner */}
      <HeroCountdown bodyProgressList={bodyProgressList} />

      {/* 2. Today's Summary Rings / Bars & Daily Habit Toggles */}
      <MacroSummary
        dailyLog={dailyLog}
        workoutLog={workoutLog}
        foodEntries={foodEntries}
        onUpdate={() => {
          loadData();
          triggerRefresh();
        }}
      />

      {/* 3. Quick Action Hub Banner (AI Scanner & Workout Logger Shortcuts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Shortcut to AI Food Scanner */}
        <Link
          href="/food"
          className="group relative overflow-hidden bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-800/50 hover:border-blue-500/50 p-4 rounded-3xl transition-all shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                <span>AI Camera Food Scanner</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Instant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Foto makanan lokal & hitung otomatis kalori & protein
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Shortcut to Workout Log */}
        <Link
          href="/workout"
          className="group relative overflow-hidden bg-gradient-to-r from-emerald-900/40 to-teal-900/40 hover:from-emerald-900/60 hover:to-teal-900/60 border border-emerald-800/50 hover:border-emerald-500/50 p-4 rounded-3xl transition-all shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                <span>PPL Workout & Kardio</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {workoutLog.split_category || "Push Day"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Log beban, repetisi, kardio & habit plank 5 waktu
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* 4. Synchronized Interactive Calorie Chart (Recharts) */}
      <InteractiveCalorieChart />

      {/* 5. Food Entries Log Snippet for Selected Date */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Daftar Makanan ({foodEntries.length} Menu)
            </h3>
          </div>
          <Link
            href="/food"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Buka Logger Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {foodEntries.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">Belum ada makanan dicatat untuk tanggal ini.</p>
            <Link
              href="/food"
              className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Makanan Sekarang</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {foodEntries.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center space-x-2">
                    <span>{item.meal_name}</span>
                    {item.is_ai_estimated && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-medium">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.calories} kcal • {item.protein}g Protein
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    +{item.protein}g Prot
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
