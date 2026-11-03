"use client";

import React, { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";
import { Flame, Mail, Lock, LogIn, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";

export function Login() {
  const { triggerRefresh } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage("Silakan masukkan email dan password.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("Klien Supabase belum dikonfigurasi. Periksa kredensial di Settings atau .env.local");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "Email atau password salah. Pastikan akun sudah dibuat di Supabase Auth > Users."
            : error.message
        );
        setIsLoading(false);
        return;
      }

      if (data?.user?.id) {
        if (typeof window !== "undefined") {
          localStorage.setItem("road_to_jan16_current_user_id", data.user.id);
        }
      }

      triggerRefresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat masuk. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-7 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950 mb-3.5">
            <Flame className="w-7 h-7 text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Road to Jan 16
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cutting & PPL Tracker — Masuk Profil Personal
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Akun
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="misal: adli@diet.local"
                disabled={isLoading}
                autoComplete="email"
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Multi-user note */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-User Isolated Storage (2 Profil)</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Data kalori, makanan, dan latihan terisolasi secara otomatis berdasarkan akun yang sedang aktif.
          </p>
        </div>
      </div>
    </div>
  );
}
