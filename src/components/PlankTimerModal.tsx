"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, RotateCcw, CheckCircle2, ShieldAlert } from "lucide-react";

interface PlankTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayerName: string;
  onComplete: () => void;
}

export function PlankTimerModal({ isOpen, onClose, prayerName, onComplete }: PlankTimerModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(60);
      setIsRunning(false);
      setIsFinished(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            try {
              // Play simple completion beep if audio context available
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
            } catch {
              // Audio context might be restricted before user gesture
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const progressPercent = ((60 - secondsLeft) / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">
          Plank Habit: {prayerName}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Pertahankan postur core netral, kunci perut, dan bernapas stabil selama 60 detik.
        </p>

        {/* Circular Progress & Timer */}
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center mb-6">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-emerald-400 transition-all duration-300"
              strokeWidth="10"
              strokeDasharray={477.5}
              strokeDashoffset={477.5 - (477.5 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
              00:{String(secondsLeft).padStart(2, "0")}
            </span>
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-widest mt-1">
              {isFinished ? "Selesai!" : isRunning ? "Tahan Core!" : "Siap"}
            </span>
          </div>
        </div>

        {/* Controls */}
        {!isFinished ? (
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => {
                setSecondsLeft(60);
                setIsRunning(false);
              }}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isRunning
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-950/50"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>{secondsLeft === 60 ? "Mulai Plank (60s)" : "Lanjutkan"}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Mantap! Plank {prayerName} tercapai!</span>
            </div>
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-colors shadow-lg shadow-emerald-950"
            >
              Centang Plank & Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
