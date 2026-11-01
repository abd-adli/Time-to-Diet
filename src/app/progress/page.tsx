"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { BodyProgress, DailyLog } from "@/lib/types";
import {
  getBodyProgressList,
  saveBodyProgress,
  getDailyLog,
  saveDailyLog,
  formatDate,
} from "@/lib/storage";
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
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ProgressPage() {
  const { selectedDate, refreshKey, triggerRefresh, userConfig } = useApp();

  const [progressList, setProgressList] = useState<BodyProgress[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Body log input
  const [inputWeight, setInputWeight] = useState("");
  const [inputWaist, setInputWaist] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fasting input
  const [fastingHours, setFastingHours] = useState<number>(16);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dl] = await Promise.all([
        getBodyProgressList(),
        getDailyLog(selectedDate),
      ]);
      setProgressList(list);
      setDailyLog(dl);
      setFastingHours(Number(dl.fasting_hours) || 16);

      // Pre-fill inputs if today's entry exists
      const currentEntry = list.find((p) => p.log_date === selectedDate);
      if (currentEntry) {
        setInputWeight(String(currentEntry.weight_kg));
        setInputWaist(String(currentEntry.waist_cm));
      } else {
        const last = list[list.length - 1];
        setInputWeight(last ? String(last.weight_kg) : String(userConfig.startingWeight));
        setInputWaist(last ? String(last.waist_cm) : "107");
      }
    } catch (err) {
      console.error("Failed to load progress data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, userConfig.startingWeight]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Handle Save Body Progress
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWeight || !inputWaist) return;

    setIsSaving(true);
    try {
      await saveBodyProgress({
        log_date: selectedDate,
        weight_kg: parseFloat(inputWeight),
        waist_cm: parseFloat(inputWaist),
      });

      // Also save fasting hours to daily_logs
      if (dailyLog) {
        await saveDailyLog({
          ...dailyLog,
          fasting_hours: Number(fastingHours) || 16,
        });
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

  // Metrics
  const startingWeight = userConfig.startingWeight || 105;
  const targetWaist = userConfig.targetWaistCm || 100;
  const latestEntry = progressList[progressList.length - 1];
  const currentWeight = latestEntry ? latestEntry.weight_kg : startingWeight;
  const currentWaist = latestEntry ? latestEntry.waist_cm : 107;

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
    };
  });

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Body Progress & Fasting Tracker</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            Wedding Target
          </span>
        </h1>
        <p className="text-xs text-slate-400">
          Catat berat badan, lingkar perut, serta durasi intermittent fasting (16:8) harian.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Berat Saat Ini</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {currentWeight} <span className="text-xs text-slate-400 font-sans font-normal">kg</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            {totalWeightLoss >= 0 ? `-${totalWeightLoss} kg dari awal` : `+${Math.abs(totalWeightLoss)} kg`}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Lingkar Pinggang</span>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {currentWaist} <span className="text-xs text-slate-400 font-sans font-normal">cm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Target: &lt; {targetWaist} cm
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-medium">Target Defisit</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            1600 <span className="text-xs text-slate-400 font-sans font-normal">kcal</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            BMR: {userConfig.baseBmr} kcal
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
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

        <form onSubmit={handleSaveProgress} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
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
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500"
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
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Data"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Dual Interactive Trend Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Weight Trend */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Waist Circumference Trend */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
