"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/storage";
import { UserTargetConfig, DEFAULT_USER_CONFIG } from "@/lib/constants";
import { getUserConfig, saveUserConfig } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AppContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userConfig: UserTargetConfig;
  updateUserConfig: (config: UserTargetConfig) => void;
  isSupabaseLive: boolean;
  refreshKey: number;
  triggerRefresh: () => void;
  goToToday: () => void;
  changeDateByDays: (delta: number) => void;
  isMounted: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Use a stable default date string during static prerender to prevent Next.js 16 prerender error
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-01");
  const [userConfig, setUserConfigState] = useState<UserTargetConfig>(DEFAULT_USER_CONFIG);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const todayStr = formatDate(new Date());
    setSelectedDate(todayStr);
    setUserConfigState(getUserConfig());
    setIsSupabaseLive(isSupabaseConfigured());
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsSupabaseLive(isSupabaseConfigured());
  }, []);

  const updateUserConfig = useCallback((newConfig: UserTargetConfig) => {
    setUserConfigState(newConfig);
    saveUserConfig(newConfig);
    setRefreshKey((k) => k + 1);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(formatDate(new Date()));
  }, []);

  const changeDateByDays = useCallback(
    (delta: number) => {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const cur = new Date(y, (m || 1) - 1, d || 1);
      cur.setDate(cur.getDate() + delta);
      setSelectedDate(formatDate(cur));
    },
    [selectedDate]
  );

  return (
    <AppContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        userConfig,
        updateUserConfig,
        isSupabaseLive,
        refreshKey,
        triggerRefresh,
        goToToday,
        changeDateByDays,
        isMounted,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
