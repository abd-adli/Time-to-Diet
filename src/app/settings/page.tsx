"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { UserTargetConfig, DEFAULT_USER_CONFIG } from "@/lib/constants";
import { getSupabaseCredentials, isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import {
  Settings,
  Database,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  FileSpreadsheet,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Login } from "@/components/Login";

export default function SettingsPage() {
  const { userConfig, updateUserConfig, triggerRefresh, isSupabaseLive, user, authLoading, signOut } = useApp();

  // Baseline config state
  const [config, setConfig] = useState<UserTargetConfig>(userConfig);
  const [configSaved, setConfigSaved] = useState(false);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [supabaseMessage, setSupabaseMessage] = useState("");

  // Gemini API key state
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiSaved, setGeminiSaved] = useState(false);

  useEffect(() => {
    setConfig(userConfig);

    if (typeof window !== "undefined") {
      const creds = getSupabaseCredentials();
      setSupabaseUrl(creds.url);
      setSupabaseKey(creds.key);

      const savedGemini = localStorage.getItem("road_to_jan16_gemini_key") || "";
      setGeminiKey(savedGemini);
    }
  }, [userConfig]);

  // Handle saving user baseline parameters
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserConfig(config);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    } catch {}
  };

  // Handle saving Supabase credentials & testing connection
  const handleSaveSupabase = async () => {
    setSupabaseTestStatus("testing");
    setSupabaseMessage("Menguji koneksi ke database Supabase...");

    if (typeof window !== "undefined") {
      if (supabaseUrl.trim() && supabaseKey.trim()) {
        localStorage.setItem("road_to_jan16_supabase_url", supabaseUrl.trim());
        localStorage.setItem("road_to_jan16_supabase_key", supabaseKey.trim());
      } else {
        localStorage.removeItem("road_to_jan16_supabase_url");
        localStorage.removeItem("road_to_jan16_supabase_key");
      }
    }

    triggerRefresh();

    // Test ping
    try {
      const client = getSupabaseClient();
      if (!client) {
        setSupabaseTestStatus("idle");
        setSupabaseMessage("Mode Lokal / Demo aktif (kredensial dikosongkan).");
        return;
      }

      const { data, error } = await client.from("daily_logs").select("id").limit(1);
      if (error) {
        throw error;
      }

      setSupabaseTestStatus("success");
      setSupabaseMessage("Koneksi Supabase berhasil! Database PostgreSQL siap digunakan.");
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      console.error("Supabase test error:", err);
      setSupabaseTestStatus("error");
      setSupabaseMessage(`Gagal terhubung: ${err.message || "Pastikan tabel sudah dibuat via schema.sql"}`);
    }
  };

  // Handle saving Gemini Key
  const handleSaveGeminiKey = () => {
    if (typeof window !== "undefined") {
      if (geminiKey.trim()) {
        localStorage.setItem("road_to_jan16_gemini_key", geminiKey.trim());
      } else {
        localStorage.removeItem("road_to_jan16_gemini_key");
      }
    }
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2500);
  };

  // Export Data to JSON
  const handleExportData = () => {
    if (typeof window === "undefined") return;
    const backup = {
      userConfig: localStorage.getItem("road_to_jan16_user_config"),
      dailyLogs: localStorage.getItem("road_to_jan16_daily_logs"),
      foodEntries: localStorage.getItem("road_to_jan16_food_entries"),
      workoutLogs: localStorage.getItem("road_to_jan16_workout_logs"),
      bodyProgress: localStorage.getItem("road_to_jan16_body_progress"),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `road_to_jan16_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset all local storage data
  const handleResetData = () => {
    if (typeof window === "undefined") return;
    if (confirm("Hapus dan reset ulang semua data lokal?")) {
      localStorage.clear();
      window.location.reload();
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

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>Pengaturan & Konfigurasi Baseline</span>
        </h1>
        <p className="text-xs text-slate-400">
          Sesuaikan baseline cutting, target pernikahan, koneksi Supabase, dan API Key Gemini AI.
        </p>
      </div>

      {/* Active User Account Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">{user.email}</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Profil Aktif
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              UID: {user.id}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar (Ganti Akun)</span>
        </button>
      </div>

      {/* 1. Baseline Constants Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Target & Parameter Baseline Pengguna</span>
            </h2>
            <p className="text-xs text-slate-400">
              Parameter hardcoded bawaan yang dapat Anda sesuaikan kapan saja.
            </p>
          </div>
          {configSaved && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tersimpan!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Berat Awal / Starting Weight (kg):
            </label>
            <input
              type="number"
              step="0.5"
              value={config.startingWeight}
              onChange={(e) => setConfig({ ...config, startingWeight: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Tinggi Badan (cm):
            </label>
            <input
              type="number"
              value={config.currentHeight}
              onChange={(e) => setConfig({ ...config, currentHeight: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Base BMR Harian (kcal):
            </label>
            <input
              type="number"
              value={config.baseBmr}
              onChange={(e) => setConfig({ ...config, baseBmr: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Target Asupan Kalori Harian (kcal):
            </label>
            <input
              type="number"
              value={config.dailyCalorieTarget}
              onChange={(e) => setConfig({ ...config, dailyCalorieTarget: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Target Protein Optimal (g/hari):
            </label>
            <input
              type="number"
              value={config.dailyProteinTarget}
              onChange={(e) => setConfig({ ...config, dailyProteinTarget: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400">Batas merah/peringatan: &lt; 100g</span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Target Lingkar Pinggang (cm):
            </label>
            <input
              type="number"
              value={config.targetWaistCm}
              onChange={(e) => setConfig({ ...config, targetWaistCm: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Tanggal Target Acara (Wedding):
            </label>
            <input
              type="date"
              value={config.targetEventDate}
              onChange={(e) => setConfig({ ...config, targetEventDate: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Parameter</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Supabase Configuration Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Database Supabase (PostgreSQL)</h2>
              <p className="text-xs text-slate-400">
                Masukkan URL & Anon Key Supabase. Skema SQL lengkap tersedia di file{" "}
                <code className="text-emerald-400">schema.sql</code>.
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
              isSupabaseLive
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {isSupabaseLive ? "Terkoneksi" : "Mode Offline / Local"}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              NEXT_PUBLIC_SUPABASE_URL:
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY:
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {supabaseMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                supabaseTestStatus === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : supabaseTestStatus === "error"
                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                  : "bg-blue-500/10 border border-blue-500/30 text-blue-300"
              }`}
            >
              {supabaseTestStatus === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : supabaseTestStatus === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{supabaseMessage}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={handleSaveSupabase}
              disabled={supabaseTestStatus === "testing"}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Simpan & Tes Koneksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Gemini API Key Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Google Gemini API Key (AI Food Scanner)</h2>
              <p className="text-xs text-slate-400">
                Digunakan untuk estimasi nutrisi foto hidangan lokal via Gemini 1.5 Flash.
              </p>
            </div>
          </div>
          {geminiSaved && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tersimpan!</span>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              GEMINI_API_KEY:
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Anda juga dapat meletakkannya di file <code className="text-slate-400">.env.local</code>{" "}
              sebagai <code className="text-slate-400">GEMINI_API_KEY</code>.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveGeminiKey}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>Simpan API Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Backup & Reset Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white">Cadangan Data & Reset</h2>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/report"
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Laporan Detail & Download CSV Mingguan</span>
          </Link>

          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data (Backup JSON)</span>
          </button>

          <button
            onClick={handleResetData}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 flex items-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset / Bersihkan Semua Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
