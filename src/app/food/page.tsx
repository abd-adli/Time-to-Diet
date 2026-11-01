"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { FoodEntry, FoodEstimateResponse, FoodEstimateItem } from "@/lib/types";
import {
  getFoodEntries,
  addFoodEntry,
  deleteFoodEntry,
  getDailyLog,
  saveDailyLog,
} from "@/lib/storage";
import { QUICK_ADD_PRESETS, INDONESIAN_CUTTING_FOODS } from "@/lib/constants";
import { compressImageToBase64 } from "@/lib/image-compress";
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Check,
  Flame,
  AlertCircle,
  HelpCircle,
  Edit2,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function FoodPage() {
  const { selectedDate, refreshKey, triggerRefresh, userConfig } = useApp();

  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI Scanner States
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiResult, setAiResult] = useState<FoodEstimateResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [promptNote, setPromptNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Form State
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load food entries
  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getFoodEntries(selectedDate);
      setFoodEntries(list);
    } catch (err) {
      console.error("Failed to load food entries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  // Compute daily totals
  const totalCalories = foodEntries.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
  const totalProtein = foodEntries.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);
  const proteinTarget = userConfig.dailyProteinTarget || 110;
  const isProteinGood = totalProtein >= (userConfig.dailyProteinMin || 100);

  // Handle Quick Add Preset
  const handleQuickAdd = async (preset: (typeof QUICK_ADD_PRESETS)[0]) => {
    if (preset.isCreatine) {
      const dl = await getDailyLog(selectedDate);
      await saveDailyLog({ ...dl, creatine_taken: true });
      triggerRefresh();
      try {
        confetti({ particleCount: 35, spread: 45, origin: { y: 0.8 } });
      } catch {}
      return;
    }

    await addFoodEntry({
      log_date: selectedDate,
      meal_name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      is_ai_estimated: false,
    });
    triggerRefresh();
    loadEntries();
  };

  // Handle Manual Add
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCalories) return;

    setIsSubmitting(true);
    try {
      await addFoodEntry({
        log_date: selectedDate,
        meal_name: manualName.trim(),
        calories: parseInt(manualCalories, 10) || 0,
        protein: parseInt(manualProtein, 10) || 0,
        is_ai_estimated: false,
      });
      setManualName("");
      setManualCalories("");
      setManualProtein("");
      triggerRefresh();
      loadEntries();
    } catch (err) {
      console.error("Failed to add manual entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Image Selection and Client-Side Compression (<500KB in memory)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiError(null);
    setAiResult(null);

    try {
      setIsScanning(true);
      // Client-side canvas compression down to <500KB
      const { base64, mimeType, sizeKb } = await compressImageToBase64(file, 1200, 0.75);
      setSelectedImagePreview(base64);

      // Read custom API key from localStorage if set in Settings
      const customApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("road_to_jan16_gemini_key") || undefined
          : undefined;

      // Send directly to API route in memory
      const res = await fetch("/api/estimate-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          customApiKey,
          promptNote,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal memproses gambar makanan.");
      }

      const data: FoodEstimateResponse = await res.json();
      setAiResult(data);
    } catch (err: any) {
      console.error("Scan error:", err);
      setAiError(err.message || "Gagal memperkirakan kalori. Periksa koneksi atau API Key.");
    } finally {
      setIsScanning(false);
    }
  };

  // Save all items from AI scan
  const handleSaveAiItems = async () => {
    if (!aiResult || !aiResult.items) return;

    for (const item of aiResult.items) {
      await addFoodEntry({
        log_date: selectedDate,
        meal_name: `${item.name} (${item.portion})`,
        calories: Math.round(Number(item.calories) || 0),
        protein: Math.round(Number(item.protein) || 0),
        is_ai_estimated: true,
      });
    }

    // Reset AI modal state
    setAiResult(null);
    setSelectedImagePreview(null);
    setPromptNote("");
    triggerRefresh();
    loadEntries();

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  // Handle Delete Entry
  const handleDelete = async (id: string) => {
    await deleteFoodEntry(id, selectedDate);
    triggerRefresh();
    loadEntries();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Nutrisi & AI Food Scanner</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Cutting Phase
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Log makanan harian, scan foto hidangan lokal dengan AI, dan penuhi target protein 110g+.
          </p>
        </div>

        {/* Daily Mini Total Pill */}
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Total Hari Ini:</div>
            <div className="text-sm font-black text-white font-mono">
              {totalCalories} <span className="text-xs text-slate-400 font-normal">kcal</span>
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Total Protein:</div>
            <div
              className={`text-sm font-black font-mono ${
                isProteinGood ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {totalProtein} <span className="text-xs font-normal">/ {proteinTarget}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap Quick-Add Presets Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold text-white">
              Quick-Add Presets (1-Tap Buttons)
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">Klik langsung untuk mencatat</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUICK_ADD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleQuickAdd(preset)}
              className="p-3 bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/50 border border-slate-700/60 rounded-2xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                  {preset.name}
                </span>
                {preset.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                    {preset.badge}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-400 font-mono">
                <span>{preset.calories} kcal</span>
                <span className="text-emerald-400 font-bold">+{preset.protein}g P</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Camera & Food Scanner Module */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-blue-900/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Food Scanner (Gemini 1.5 Flash)
                </h2>
                <p className="text-xs text-slate-400">
                  Kompresi client-side (&lt;500KB in memory) tanpa beban Supabase Storage.
                  Mengenali masakan khas Indonesia (ikan kembung, telur, tahu/tempe, nasi merah, dll).
                </p>
              </div>
            </div>
          </div>

          {/* Optional context note input for AI */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Catatan tambahan (misal: '1 ekor kembung bakar tanpa minyak, nasi merah 100g')"
              value={promptNote}
              onChange={(e) => setPromptNote(e.target.value)}
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Camera & Upload Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Direct Camera Capture (Mobile) */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
              className="py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-950 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>{isScanning ? "Memproses AI..." : "Buka Kamera (Foto Makanan)"}</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Gallery Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 border border-slate-700 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Pilih Dari Galeri / Foto</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Scanning spinner */}
          {isScanning && (
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-blue-500/30 flex items-center justify-center space-x-3 text-xs text-blue-300 animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Menganalisis nutrisi hidangan dengan Gemini AI...</span>
            </div>
          )}

          {/* Error Message */}
          {aiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* AI Result Card & Review Modal */}
          {aiResult && (
            <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-4 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Hasil Analisis Gemini AI</span>
                </div>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Advice */}
              {aiResult.advice && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs">
                  <span className="font-semibold">Saran Cutting: </span>
                  {aiResult.advice}
                </div>
              )}

              {/* Itemized Table */}
              <div className="space-y-2">
                {aiResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs gap-2"
                  >
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400">Porsi: {item.portion}</div>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <span className="font-mono text-slate-300">{item.calories} kcal</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{item.protein}g Protein
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-700">
                <div className="text-xs">
                  <span className="text-slate-400">Total Dikenali: </span>
                  <span className="font-mono font-bold text-white">
                    {aiResult.total_calories} kcal
                  </span>{" "}
                  •{" "}
                  <span className="font-mono font-bold text-emerald-400">
                    {aiResult.total_protein}g Protein
                  </span>
                </div>
                <button
                  onClick={handleSaveAiItems}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan ke Log Harian</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Food Logger Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Tambah Makanan Manual</span>
        </h2>

        <form onSubmit={handleManualAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Nama Makanan (misal: Dada Ayam Panggang 150g)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Kalori (kcal)"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
              required
              min="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Protein (g)"
              value={manualProtein}
              onChange={(e) => setManualProtein(e.target.value)}
              min="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors shrink-0"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>

      {/* Log Makanan Hari Ini (List of Today's Food Entries) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">
              Log Makanan Tanggal Ini ({foodEntries.length})
            </h2>
            <p className="text-xs text-slate-400">
              Total Asupan: {totalCalories} kcal • Protein: {totalProtein}g
            </p>
          </div>
        </div>

        {foodEntries.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400">
            Belum ada makanan dicatat untuk tanggal ini. Gunakan AI Scanner atau tombol Quick-Add di atas!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {foodEntries.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-white flex items-center space-x-2">
                    <span>{item.meal_name}</span>
                    {item.is_ai_estimated && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-medium border border-blue-500/30">
                        AI Scan
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {item.calories} kcal • {item.protein}g Protein
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{item.protein}g P
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Hapus entri"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
