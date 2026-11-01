"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { DailyChartDataPoint } from "@/lib/types";
import { getDailyChartData } from "@/lib/storage";
import { useApp } from "@/context/AppContext";
import { BarChart3, TrendingDown } from "lucide-react";

export function InteractiveCalorieChart() {
  const { refreshKey, userConfig } = useApp();
  const [daysRange, setDaysRange] = useState<number>(14);
  const [data, setData] = useState<DailyChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const targetCalorie = Number(userConfig.dailyCalorieTarget) || 1600;

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const points = await getDailyChartData(daysRange);
        if (mounted) {
          // Strictly cast every numeric field to guarantee NO #VALUE! or NaN
          const cleaned = points.map((p) => ({
            ...p,
            caloriesIn: Number(p.caloriesIn) || 0,
            caloriesBurned: Number(p.caloriesBurned) || 0,
            bmr: Number(p.bmr) || 2056,
            totalExpenditure: Number(p.totalExpenditure) || 2056,
            netDeficit: Number(p.netDeficit) || 0,
            calorieTarget: Number(p.calorieTarget) || 1600,
          }));
          setData(cleaned);
        }
      } catch (err) {
        console.error("Failed to load chart data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [daysRange, refreshKey, userConfig.dailyCalorieTarget, userConfig.baseBmr]);

  // Average deficit
  const avgDeficit =
    data.length > 0
      ? Math.round(data.reduce((acc, curr) => acc + (Number(curr.netDeficit) || 0), 0) / data.length)
      : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Pelacakan Kalori Harian: Masuk vs Keluar & Defisit
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Grafik kombo sinkron: Bar Kalori Masuk (Biru), Kalori Latihan (Hijau), Target (Garis Putus), & Defisit Harian (Oranye).
          </p>
        </div>

        {/* Range Selector & Deficit Pill */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setDaysRange(days)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  daysRange === days
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {days} Hari
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Rata-rata Defisit: -{avgDeficit} kcal/hari</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            Memuat data kalori...
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            Belum ada data untuk periode ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as DailyChartDataPoint;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-2xl shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-white border-b border-slate-800 pb-1">
                          {d.fullDate} ({label})
                        </div>
                        <div className="flex justify-between text-blue-400">
                          <span>Kalori Masuk:</span>
                          <span className="font-mono font-bold">{d.caloriesIn} kcal</span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Kalori Latihan:</span>
                          <span className="font-mono font-bold">+{d.caloriesBurned} kcal</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>BMR Harian:</span>
                          <span className="font-mono">{d.bmr} kcal</span>
                        </div>
                        <div className="flex justify-between text-amber-400 border-t border-slate-800 pt-1 font-semibold">
                          <span>Net Defisit:</span>
                          <span className="font-mono font-bold">
                            {d.netDeficit > 0 ? `-${d.netDeficit}` : `+${Math.abs(d.netDeficit)}`} kcal
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => {
                  if (value === "caloriesIn") return "Kalori Masuk (In)";
                  if (value === "caloriesBurned") return "Kalori Latihan Burned";
                  if (value === "netDeficit") return "Net Defisit Harian";
                  return value;
                }}
              />

              {/* Dashed Target Calorie Line */}
              <ReferenceLine
                y={targetCalorie}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Target: ${targetCalorie} kcal`,
                  fill: "#f43f5e",
                  fontSize: 10,
                  position: "top",
                }}
              />

              {/* Bars for Calories In (Blue) and Workout Calories Burned (Green) */}
              <Bar
                dataKey="caloriesIn"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="caloriesBurned"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />

              {/* Line and Dots for Daily Deficit (Orange) */}
              <Line
                type="monotone"
                dataKey="netDeficit"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b", strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
