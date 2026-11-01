"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Flame, Database, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Navigation } from "./Navigation";
import { formatDate } from "@/lib/storage";

export function Header() {
  const { selectedDate, setSelectedDate, goToToday, changeDateByDays, isSupabaseLive } = useApp();
  const [todayStr, setTodayStr] = React.useState<string>("");

  React.useEffect(() => {
    setTodayStr(formatDate(new Date()));
  }, []);

  const isToday = todayStr ? selectedDate === todayStr : false;

  // Format selected date nicely
  const formattedSelectedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Brand / Title & Desktop Nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  Road to Jan 16
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cutting & PPL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Wedding Target: 16 Jan 2027</p>
            </div>
          </Link>

          {/* Supabase status indicator on mobile */}
          <div className="sm:hidden flex items-center">
            <Link
              href="/settings"
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-medium border ${
                isSupabaseLive
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-800/60 text-slate-400 border-slate-700/60"
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseLive ? "Supabase" : "Local Mode"}</span>
            </Link>
          </div>
        </div>

        {/* Center / Navigation Links for Desktop */}
        <Navigation />

        {/* Date Navigator & Status for Desktop */}
        <div className="flex items-center justify-between sm:justify-end space-x-2">
          {/* Supabase status for Desktop */}
          <Link
            href="/settings"
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isSupabaseLive
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseLive ? "Supabase Live" : "Local / Demo"}</span>
          </Link>

          {/* Date Controls */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => changeDateByDays(-1)}
              title="Hari Sebelumnya"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative px-2 flex items-center space-x-1.5 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-200 select-none">
                {isToday ? "Hari Ini" : formattedSelectedDate}
              </span>
            </div>

            <button
              onClick={() => changeDateByDays(1)}
              title="Hari Berikutnya"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-2 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
