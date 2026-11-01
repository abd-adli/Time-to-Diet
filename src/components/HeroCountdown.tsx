"use client";

import React, { useState, useEffect } from "react";
import { HeartHandshake } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BodyProgress } from "@/lib/types";

interface HeroCountdownProps {
  bodyProgressList: BodyProgress[];
}

export function HeroCountdown({ bodyProgressList }: HeroCountdownProps) {
  const { userConfig } = useApp();
  const [daysRemaining, setDaysRemaining] = useState<number>(75);

  useEffect(() => {
    const targetDate = new Date(userConfig.targetEventDate + "T00:00:00");
    const today = new Date();
    const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysRemaining(Math.max(0, diffDays));
  }, [userConfig.targetEventDate]);

  // Latest weight & waist
  const latestProgress = bodyProgressList[bodyProgressList.length - 1];
  const currentWeight = latestProgress?.weight_kg || userConfig.startingWeight;
  const currentWaist = latestProgress?.waist_cm || 107;

  // Deltas
  const weightDelta = Number((currentWeight - userConfig.startingWeight).toFixed(1));
  const isWeightDown = weightDelta <= 0;

  // Waist progress towards target < 100cm (starting baseline around 110cm)
  const initialWaistEstimate = 110;
  const targetWaist = userConfig.targetWaistCm || 100;
  const totalWaistToLose = Math.max(1, initialWaistEstimate - targetWaist);
  const waistLostSoFar = Math.max(0, initialWaistEstimate - currentWaist);
  const waistProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((waistLostSoFar / totalWaistToLose) * 100))
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-2xl shadow-slate-950/60">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Wedding Event Countdown */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Target: 16 Januari 2027 (Wedding Day)</span>
          </div>

          <div className="flex items-baseline space-x-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
              {daysRemaining}{" "}
              <span className="text-lg sm:text-xl font-normal text-slate-400 font-sans">
                Hari Tersisa
              </span>
            </h1>
          </div>

          <p className="text-xs text-slate-400 max-w-md">
            Fase Cutting disiplin tinggi: Defisit kalori konsisten, target protein 110g+,
            5x plank harian, dan latihan beban PPL terstruktur.
          </p>
        </div>

        {/* Right: Quick Progress Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:min-w-[340px]">
          {/* Weight Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Berat Badan</span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  isWeightDown
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {isWeightDown ? `${weightDelta} kg` : `+${weightDelta} kg`}
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-white">{currentWeight}</span>
              <span className="text-xs text-slate-400">kg</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Mulai: <span className="text-slate-300 font-medium">{userConfig.startingWeight} kg</span>
            </div>
          </div>

          {/* Waist Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Lingkar Pinggang</span>
              <span className="text-[11px] font-bold text-cyan-400">
                Target &lt; {targetWaist} cm
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-white">{currentWaist}</span>
              <span className="text-xs text-slate-400">cm</span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${waistProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Progress: {waistProgressPercent}%</span>
                <span>Sisa: {Math.max(0, currentWaist - targetWaist).toFixed(1)} cm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
