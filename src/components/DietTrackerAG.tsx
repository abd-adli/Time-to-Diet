"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "@/context/AppContext";
import { Login } from "@/components/Login";
import { getDailyLog, getFoodEntries, getWorkoutLog, formatDate } from "@/lib/storage";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Flame,
  Dumbbell,
  Clock,
  RefreshCw,
  AlertCircle,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import confetti from "canvas-confetti";

export default function DietTrackerAG() {
  const { user, authLoading } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysRange, setDaysRange] = useState<number>(7);
  const [dateBounds, setDateBounds] = useState<{ start: string; end: string }>({ start: "", end: "" });

  const fetchWeeklyLogs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Setting rentang hari (default: 7 hari terakhir)
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - daysRange);

    const start = pastDate.toISOString().split("T")[0];
    const end = today.toISOString().split("T")[0];
    setDateBounds({ start, end });

    let dailyData: any[] = [];
    let foodData: any[] = [];
    let workoutData: any[] = [];

    try {
      // Narik dari 3 tabel barengan biar cepet
      let dailyQuery = supabase.from("daily_logs").select("*").gte("log_date", start).lte("log_date", end);
      let foodQuery = supabase.from("food_entries").select("*").gte("log_date", start).lte("log_date", end);
      let workoutQuery = supabase.from("workout_logs").select("*").gte("log_date", start).lte("log_date", end);

      if (user?.id) {
        dailyQuery = dailyQuery.eq("user_id", user.id);
        foodQuery = foodQuery.eq("user_id", user.id);
        workoutQuery = workoutQuery.eq("user_id", user.id);
      }

      const [dailyRes, foodRes, workoutRes] = await Promise.all([
        dailyQuery,
        foodQuery,
        workoutQuery,
      ]);

      dailyData = dailyRes.data || [];
      foodData = foodRes.data || [];
      workoutData = workoutRes.data || [];
    } catch (err) {
      console.warn("Supabase fetch error, fallback to local storage:", err);
    }

    // Jika Supabase kosong (misal local storage mode), pull dari LocalStorage
    if (dailyData.length === 0 && foodData.length === 0 && workoutData.length === 0) {
      const localLogs: any[] = [];
      for (let i = 0; i <= daysRange; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const [dl, fe, wl] = await Promise.all([
          getDailyLog(dateStr, user?.id),
          getFoodEntries(dateStr, user?.id),
          getWorkoutLog(dateStr, user?.id),
        ]);

        if (fe.length > 0 || wl.workout_calories_burned > 0 || dl.calories_in > 0) {
          dailyData.push(dl);
          foodData.push(...fe);
          workoutData.push(wl);
        }
      }
    }

    // Mengumpulkan semua tanggal unik dari 3 tabel
    const allDates = Array.from(
      new Set([
        ...dailyData.map((d: any) => d.log_date),
        ...foodData.map((f: any) => f.log_date),
        ...workoutData.map((w: any) => w.log_date),
      ])
    ).filter(Boolean);

    // Menggabungkan data berdasarkan log_date
    const mergedData = allDates.map((dateStr) => {
      const day = dailyData.find((d: any) => d.log_date === dateStr) || {
        id: `dl-${dateStr}`,
        log_date: dateStr,
        fasting_hours: 0,
        calories_in: 0,
        protein_in: 0,
        notes: "",
      };

      // Cari makanan di tanggal yang sama
      const dateFoods = foodData.filter((f: any) => f.log_date === dateStr);
      const foodList = dateFoods.map((f: any) => f.meal_name).join(" + ");

      // Dynamic sums jika dailyData belum ter-update
      const calculatedCalories = dateFoods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
      const calculatedProtein = dateFoods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);

      // Cari latihan di tanggal yang sama
      const dateWorkouts = workoutData.filter((w: any) => w.log_date === dateStr);
      const workoutList = dateWorkouts
        .map((w: any) => {
          let exercisesStr = "";
          if (w.exercises && Array.isArray(w.exercises)) {
            exercisesStr = w.exercises.map((ex: any) => ex.name).join(", ");
          }
          const cat = w.split_category || "Latihan";
          return exercisesStr ? `[${cat}] ${exercisesStr}` : `[${cat}]`;
        })
        .join(" | ");

      return {
        ...day,
        log_date: dateStr,
        calories_in: day.calories_in || calculatedCalories || 0,
        protein_in: day.protein_in || calculatedProtein || 0,
        food_details: foodList || "Tidak ada catatan makanan",
        workout_details: workoutList || "Rest Day / Tidak ada latihan",
      };
    }).sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    setLogs(mergedData);
    setLoading(false);
  }, [user, daysRange]);

  useEffect(() => {
    fetchWeeklyLogs();
  }, [fetchWeeklyLogs]);

  const downloadCSV = () => {
    if (logs.length === 0) return alert("Data kosong bre!");

    // Header CSV ditambahin Makanan & Latihan Detail
    const headers = [
      "Tanggal",
      "Puasa (Jam)",
      "Kalori (kcal)",
      "Protein (g)",
      "Menu Makanan Detail",
      "Latihan Detail",
      "Catatan Harian",
    ];

    // Mapping baris dengan sanitasi tanda kutip ganda
    const rows = logs.map((log) => [
      log.log_date,
      log.fasting_hours || 0,
      log.calories_in || 0,
      log.protein_in || 0,
      `"${String(log.food_details || "").replace(/"/g, '""')}"`,
      `"${String(log.workout_details || "").replace(/"/g, '""')}"`,
      `"${String(log.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Detail_Diet_Latihan_AG_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  // Helper formatting for chart XAxis (e.g. "06 Nov")
  const formatShortDate = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      const str = String(dateVal);
      const d = new Date(str.includes("T") ? str : `${str}T00:00:00`);
      if (isNaN(d.getTime())) {
        return str;
      }
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } catch {
      return String(dateVal);
    }
  };

  // Chronological order for charts (oldest to newest)
  const chartLogs = [...logs].sort(
    (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
  );

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Memeriksa autentikasi profil...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Laporan & Ekspor Lengkap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dashboard Time to Diet (Full Detail)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Riwayat harian terintegrasi: Makanan detail, sesi latihan PPL, kalori & jam fasting.
          </p>
        </div>

        {/* Action button */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadCSV}
            disabled={loading || logs.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-950/50 flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menarik Data...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download CSV Lengkap</span>
              </>
            )}
          </button>

          <button
            onClick={() => fetchWeeklyLogs()}
            title="Refresh Data"
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter range buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Rentang Waktu:</span>
          {dateBounds.start && dateBounds.end && (
            <span className="text-slate-200 font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded-md">
              {dateBounds.start} s/d {dateBounds.end}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                daysRange === d
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50"
              }`}
            >
              {d} Hari
            </button>
          ))}
        </div>
      </div>

      {/* 1. Existing Calorie / Deficit Tracking Chart */}
      <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Pelacakan Kalori Harian (Masuk vs Target 1600 kcal)
              </h3>
              <p className="text-[11px] text-gray-400">
                Kalori Masuk harian vs Target 1600 kcal
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
            Target: 1600 kcal
          </span>
        </div>

        <div className="w-full h-64 sm:h-72 pt-2">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
              Memuat grafik kalori...
            </div>
          ) : chartLogs.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
              Belum ada data kalori pada rentang ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartLogs} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="log_date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={formatShortDate}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  domain={[0, (dataMax: number) => Math.max(1800, Math.ceil(dataMax * 1.1))]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const cal = Number(item.calories_in) || 0;
                      return (
                        <div className="bg-[#0f172a] border border-gray-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold text-white border-b border-gray-800 pb-1">
                            {formatShortDate(label)} ({label})
                          </div>
                          <div className="flex justify-between items-center space-x-3 text-blue-400">
                            <span>Kalori Masuk:</span>
                            <span className="font-mono font-bold">{cal} kcal</span>
                          </div>
                          <div className="text-[10px] text-gray-400 pt-0.5">
                            Target: 1600 kcal ({cal <= 1600 ? "✓ Dalam Batas Target" : "⚠ Melebihi Target"})
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={1600}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Target: 1600 kcal",
                    fill: "#ef4444",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Bar
                  dataKey="calories_in"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  name="Kalori Masuk"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Daily Protein Tracking Chart (Positioned right below existing Calorie/Deficit chart) */}
      <div className="mt-6 bg-[#0f172a] p-4 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-bold text-white">
              🍗 Pelacakan Protein Harian (Target: 110g)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Target: 110g
          </span>
        </div>

        <div className="w-full h-64 sm:h-72 pt-2">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
              Memuat grafik protein...
            </div>
          ) : chartLogs.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
              Belum ada data protein pada rentang ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartLogs} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="log_date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={formatShortDate}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  domain={[0, (dataMax: number) => Math.max(140, Math.ceil(dataMax * 1.15))]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const prot = Number(item.protein_in) || 0;
                      const isOptimal = prot >= 110;
                      return (
                        <div className="bg-[#0f172a] border border-gray-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-bold text-white border-b border-gray-800 pb-1">
                            {formatShortDate(label)} ({label})
                          </div>
                          <div className="flex justify-between items-center space-x-3 text-emerald-400">
                            <span>Asupan Protein:</span>
                            <span className="font-mono font-bold">{prot}g</span>
                          </div>
                          <div className="text-[10px] text-gray-400 pt-0.5">
                            Status:{" "}
                            <span className={isOptimal ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                              {isOptimal ? "✓ Target Tercapai (≥110g)" : "⚠ Kurang dari 110g"}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={110}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Target: 110g",
                    fill: "#ef4444",
                    fontSize: 11,
                    position: "top",
                  }}
                />
                <Bar
                  dataKey="protein_in"
                  fill="#34d399"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  name="Protein (g)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Preview Tabel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Preview Tabel Ringkasan ({logs.length} Hari)</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Profil: <strong className="text-emerald-400 font-mono">{user.email?.split("@")[0]}</strong>
          </span>
        </div>

        {loading ? (
          <div className="min-h-[200px] flex flex-col items-center justify-center space-y-2 p-8">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Menarik data dari Supabase...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-500" />
            <p>Belum ada data tercatat dalam rentang waktu ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/90 text-slate-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Kalori & Protein</th>
                  <th className="p-3.5">Menu Makanan Detail</th>
                  <th className="p-3.5">Sesi Latihan PPL</th>
                  <th className="p-3.5">Fasting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id || log.log_date} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-medium text-slate-200">
                      <span className="font-mono text-xs">{log.log_date}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-amber-400 font-bold">{log.calories_in} kcal</span>
                      <br />
                      <span className="text-emerald-400 font-medium text-xs">{log.protein_in}g protein</span>
                    </td>
                    <td className="p-3.5 text-slate-300 max-w-xs sm:max-w-md truncate" title={log.food_details}>
                      {log.food_details}
                    </td>
                    <td className="p-3.5 text-blue-300 max-w-xs sm:max-w-md truncate" title={log.workout_details}>
                      {log.workout_details}
                    </td>
                    <td className="p-3.5 text-slate-400 text-xs">
                      {log.fasting_hours ? `${log.fasting_hours} jam` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
