"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { BodyProgress, DailyLog } from "@/lib/types";
import {
  getBodyProgressList,
  saveBodyProgress,
  getDailyLog,
  saveDailyLog,
  formatDate,
  getTodayKey,
} from "@/lib/storage";
import { Login } from "@/components/Login";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  TrendingDown,
  Scale,
  Ruler,
  Clock,
  Plus,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  Dumbbell,
  Percent,
  Flame,
  HeartPulse,
  Activity,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ProgressPage() {
  const { selectedDate, refreshKey, triggerRefresh, userConfig, user, authLoading } = useApp();

  const [progressList, setProgressList] = useState<BodyProgress[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Body log input
  const [inputWeight, setInputWeight] = useState("");
  const [inputWaist, setInputWaist] = useState("");
  const [skeletalMuscle, setSkeletalMuscle] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [trunkFat, setTrunkFat] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [healthScore, setHealthScore] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fasting input
  const [fastingHours, setFastingHours] = useState<number>(16);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const targetDate = selectedDate || getTodayKey();
      const [list, dl] = await Promise.all([
        getBodyProgressList(user.id),
        getDailyLog(targetDate, user.id),
      ]);
      setProgressList(list);
      setDailyLog(dl);
      setFastingHours(dl.fasting_hours !== undefined ? Number(dl.fasting_hours) : 0);

      // Pre-fill inputs if today's entry exists
      const currentEntry = list.find((p) => p.log_date === targetDate);
      if (currentEntry) {
        setInputWeight(String(currentEntry.weight_kg));
        setInputWaist(String(currentEntry.waist_cm));
        setSkeletalMuscle(
          currentEntry.skeletal_muscle !== undefined && currentEntry.skeletal_muscle !== null
            ? String(currentEntry.skeletal_muscle)
            : ""
        );
        setBodyFat(
          currentEntry.body_fat_percentage !== undefined && currentEntry.body_fat_percentage !== null
            ? String(currentEntry.body_fat_percentage)
            : ""
        );
        setTrunkFat(
          currentEntry.trunk_fat !== undefined && currentEntry.trunk_fat !== null
            ? String(currentEntry.trunk_fat)
            : ""
        );
        setVisceralFat(
          currentEntry.visceral_fat !== undefined && currentEntry.visceral_fat !== null
            ? String(currentEntry.visceral_fat)
            : ""
        );
        setHealthScore(
          currentEntry.health_score !== undefined && currentEntry.health_score !== null
            ? String(currentEntry.health_score)
            : ""
        );
      } else {
        const last = list[list.length - 1];
        setInputWeight(last ? String(last.weight_kg) : String(userConfig.startingWeight));
        setInputWaist(last ? String(last.waist_cm) : "107");
        setSkeletalMuscle(
          last?.skeletal_muscle !== undefined && last?.skeletal_muscle !== null
            ? String(last.skeletal_muscle)
            : ""
        );
        setBodyFat(
          last?.body_fat_percentage !== undefined && last?.body_fat_percentage !== null
            ? String(last.body_fat_percentage)
            : ""
        );
        setTrunkFat(
          last?.trunk_fat !== undefined && last?.trunk_fat !== null
            ? String(last.trunk_fat)
            : ""
        );
        setVisceralFat(
          last?.visceral_fat !== undefined && last?.visceral_fat !== null
            ? String(last.visceral_fat)
            : ""
        );
        setHealthScore(
          last?.health_score !== undefined && last?.health_score !== null
            ? String(last.health_score)
            : ""
        );
      }
    } catch (err) {
      console.error("Failed to load progress data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user, userConfig.startingWeight]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Handle Save Body Progress
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputWeight || !inputWaist) return;

    setIsSaving(true);
    try {
      const targetDate = selectedDate || getTodayKey();
      await saveBodyProgress(
        {
          log_date: targetDate,
          weight_kg: parseFloat(inputWeight),
          waist_cm: parseFloat(inputWaist),
          skeletal_muscle: skeletalMuscle ? parseFloat(skeletalMuscle) : undefined,
          body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
          trunk_fat: trunkFat ? parseFloat(trunkFat) : undefined,
          visceral_fat: visceralFat ? parseFloat(visceralFat) : undefined,
          health_score: healthScore ? parseFloat(healthScore) : undefined,
        },
        user.id
      );

      // Also save fasting hours to daily_logs
      if (dailyLog) {
        await saveDailyLog(
          {
            ...dailyLog,
            fasting_hours: Number(fastingHours) || 16,
          },
          user.id
        );
      }

      triggerRefresh();
      loadData();

      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch {}
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

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

  // Metrics
  const startingWeight = userConfig.startingWeight || 105;
  const targetWaist = userConfig.targetWaistCm || 100;
  const latestEntry = progressList[progressList.length - 1];
  const currentWeight = latestEntry ? latestEntry.weight_kg : startingWeight;
  const currentWaist = latestEntry ? latestEntry.waist_cm : 107;
  const currentSkeletalMuscle =
    latestEntry?.skeletal_muscle !== undefined && latestEntry.skeletal_muscle !== null
      ? latestEntry.skeletal_muscle
      : "-";
  const currentBodyFat =
    latestEntry?.body_fat_percentage !== undefined && latestEntry.body_fat_percentage !== null
      ? latestEntry.body_fat_percentage
      : "-";

  const totalWeightLoss = Number((startingWeight - currentWeight).toFixed(1));
  const totalWaistLoss = Number((110 - currentWaist).toFixed(1));

  // Chart data formatting
  const chartData = progressList.map((p) => {
    const d = new Date(p.log_date + "T00:00:00");
    return {
      date: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      fullDate: p.log_date,
      weight: Number(p.weight_kg),
      waist: Number(p.waist_cm),
      skeletal_muscle:
        p.skeletal_muscle !== undefined && p.skeletal_muscle !== null
          ? Number(p.skeletal_muscle)
          : null,
      body_fat_percentage:
        p.body_fat_percentage !== undefined && p.body_fat_percentage !== null
          ? Number(p.body_fat_percentage)
          : null,
      trunk_fat:
        p.trunk_fat !== undefined && p.trunk_fat !== null
          ? Number(p.trunk_fat)
          : null,
      visceral_fat:
        p.visceral_fat !== undefined && p.visceral_fat !== null
          ? Number(p.visceral_fat)
          : null,
      health_score:
        p.health_score !== undefined && p.health_score !== null
          ? Number(p.health_score)
          : null,
    };
  });

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Body Progress & Fasting Tracker</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Wedding Target
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Catat berat badan, lingkar perut, komposisi tubuh, serta durasi intermittent fasting (16:8) harian.
          </p>
        </div>

        <Link
          href="/report"
          className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition shadow"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Laporan Detail & CSV</span>
        </Link>
      </div>

      {/* Overview Stat Cards (Responsive Grid 2 columns mobile, 3 columns desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* 1. Berat Saat Ini */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Berat Saat Ini</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {currentWeight} <span className="text-xs text-slate-400 font-sans font-normal">kg</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            {totalWeightLoss >= 0 ? `-${totalWeightLoss} kg dari awal` : `+${Math.abs(totalWeightLoss)} kg`}
          </div>
        </div>

        {/* 2. Lingkar Pinggang */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Lingkar Pinggang</span>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {currentWaist} <span className="text-xs text-slate-400 font-sans font-normal">cm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Target: &lt; {targetWaist} cm
          </div>
        </div>

        {/* 3. Massa Otot (kg) */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Massa Otot</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {currentSkeletalMuscle} <span className="text-xs text-slate-400 font-sans font-normal">{currentSkeletalMuscle !== "-" ? "kg" : ""}</span>
          </div>
          <div className="text-[10px] text-green-400 font-semibold mt-1">
            Target: Naik perlahan
          </div>
        </div>

        {/* 4. Body Fat (%) */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Body Fat</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {currentBodyFat} <span className="text-xs text-slate-400 font-sans font-normal">{currentBodyFat !== "-" ? "%" : ""}</span>
          </div>
          <div className="text-[10px] text-green-400 font-semibold mt-1">
            Target: &lt; 15%
          </div>
        </div>

        {/* 5. Target Defisit */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Target Defisit</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            1600 <span className="text-xs text-slate-400 font-sans font-normal">kcal</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            BMR: {userConfig.baseBmr} kcal
          </div>
        </div>

        {/* 6. Intermittent Fasting */}
        <div className="bg-[#151A25] border border-gray-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Intermittent Fasting</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {fastingHours} <span className="text-xs text-slate-400 font-sans font-normal">jam</span>
          </div>
          <div className="text-[10px] text-emerald-400/90 mt-1">
            Protokol 16:8 Optimal
          </div>
        </div>
      </div>

      {/* Input Form for Selected Date */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Catat Berat, Pinggang & Jam Puasa ({selectedDate})
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveProgress} className="space-y-4">
          {/* Row 1: Existing Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Berat Badan (kg):
              </label>
              <input
                type="number"
                step="0.1"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                required
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Lingkar Pinggang (cm):
              </label>
              <input
                type="number"
                step="0.5"
                value={inputWaist}
                onChange={(e) => setInputWaist(e.target.value)}
                required
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Durasi Puasa IF (Jam):
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={fastingHours}
                onChange={(e) => setFastingHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Row 2: Gym Scale Body Composition (Massa Otot, Body Fat, Lemak Perut) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Massa Otot (kg):
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 32.5"
                value={skeletalMuscle}
                onChange={(e) => setSkeletalMuscle(e.target.value)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Body Fat (%):
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 18.2"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Lemak Perut (kg):
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 8.5"
                value={trunkFat}
                onChange={(e) => setTrunkFat(e.target.value)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Row 3: Visceral Fat & Health Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Visceral Fat Index:
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 7.0"
                value={visceralFat}
                onChange={(e) => setVisceralFat(e.target.value)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Skor Kesehatan:
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 85"
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
                className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Data"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Dual Interactive Trend Charts: Weight & Waist */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Tren Utama: Berat Badan & Lingkar Pinggang
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Weight Trend */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Tren Penurunan Berat Badan (kg)</h3>
              </div>
              <span className="text-[10px] text-slate-400">Baseline Awal: {startingWeight} kg</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-emerald-400 font-mono font-bold">
                              Berat: {payload[0].value} kg
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={startingWeight}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: "Awal: 105 kg", fill: "#94a3b8", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Waist Circumference Trend */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ruler className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Tren Lingkar Pinggang (cm)</h3>
              </div>
              <span className="text-[10px] text-cyan-400">Target: &lt; {targetWaist} cm</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-cyan-400 font-mono font-bold">
                              Pinggang: {payload[0].value} cm
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={targetWaist}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    label={{ value: "Target: 100 cm", fill: "#06b6d4", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="waist"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#06b6d4" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 5 New Detailed Body Composition Trend Charts (Gym Scale Metrics) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Tren Komposisi Tubuh Detail (Gym Scale)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            5 Grafik Progresif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* a. Tren Massa Otot (kg) - Skeletal Muscle */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Tren Massa Otot (kg)</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">Target: Progresif Naik</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-emerald-400 font-mono font-bold">
                              Massa Otot: {payload[0].value} kg
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={35}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: "Target: 35 kg", fill: "#10b981", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="skeletal_muscle"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* b. Tren Body Fat (%) - Body Fat Percentage */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Tren Body Fat (%)</h3>
              </div>
              <span className="text-[10px] text-rose-400 font-medium">Target: &lt; 15%</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-rose-400 font-mono font-bold">
                              Body Fat: {payload[0].value}%
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={15}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: "Target: 15%", fill: "#f43f5e", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="body_fat_percentage"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f43f5e" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* c. Tren Lemak Perut (kg) - Trunk Fat */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Tren Lemak Perut (kg)</h3>
              </div>
              <span className="text-[10px] text-amber-400 font-medium">Trunk Fat Target Turun</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-amber-400 font-mono font-bold">
                              Lemak Perut: {payload[0].value} kg
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trunk_fat"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* d. Tren Visceral Fat - Visceral Fat Index */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HeartPulse className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Tren Visceral Fat</h3>
              </div>
              <span className="text-[10px] text-purple-400 font-medium">Batas Sehat: &lt; 10</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-purple-400 font-mono font-bold">
                              Visceral Fat: {payload[0].value}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={9}
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    label={{ value: "Batas Sehat: 9", fill: "#a855f7", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visceral_fat"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#a855f7" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* e. Tren Skor Kesehatan - Health Score (Spans 2 columns on lg for prominent wide display) */}
          <div className="bg-[#151A25] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Tren Skor Kesehatan</h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-medium">Target: ≥ 80 / 100</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[50, 100]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-cyan-400 font-mono font-bold">
                              Skor Kesehatan: {payload[0].value} / 100
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    label={{ value: "Optimal: 80", fill: "#06b6d4", fontSize: 9, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="health_score"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#06b6d4" }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
