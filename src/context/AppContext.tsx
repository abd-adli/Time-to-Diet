"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { formatDate, getTodayKey } from "@/lib/storage";
import { UserTargetConfig, DEFAULT_USER_CONFIG } from "@/lib/constants";
import {
  getUserConfig,
  saveUserConfig,
  clearStaleStorageTotals,
  purgeLegacyStorageKeys,
  nukeOldLocalStorageOnDateChange,
  setCurrentUserIdCache,
} from "@/lib/storage";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

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
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [userConfig, setUserConfigState] = useState<UserTargetConfig>(DEFAULT_USER_CONFIG);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const todayStr = getTodayKey();
    setSelectedDate(todayStr);
    setIsMounted(true);
    purgeLegacyStorageKeys();
    nukeOldLocalStorageOnDateChange();
    setIsSupabaseLive(isSupabaseConfigured());

    // Initialize Supabase Auth Session
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session: initSession } }) => {
        setSession(initSession);
        setUser(initSession?.user ?? null);
        if (initSession?.user?.id) {
          setCurrentUserIdCache(initSession.user.id);
          setUserConfigState(getUserConfig(initSession.user.id));
        } else {
          setCurrentUserIdCache(null);
          setUserConfigState(getUserConfig());
        }
        setAuthLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user?.id) {
          setCurrentUserIdCache(currentSession.user.id);
          setUserConfigState(getUserConfig(currentSession.user.id));
        } else {
          setCurrentUserIdCache(null);
          setUserConfigState(getUserConfig());
        }
        setAuthLoading(false);
        setRefreshKey((k) => k + 1);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setUserConfigState(getUserConfig());
      setAuthLoading(false);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsSupabaseLive(isSupabaseConfigured());
  }, []);

  const updateUserConfig = useCallback(
    (newConfig: UserTargetConfig) => {
      setUserConfigState(newConfig);
      saveUserConfig(newConfig, user?.id);
      setRefreshKey((k) => k + 1);
    },
    [user?.id]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUserIdCache(null);
    setUser(null);
    setSession(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(getTodayKey());
  }, []);

  const changeDateByDays = useCallback(
    (delta: number) => {
      const baseDate = selectedDate || formatDate(new Date());
      const [y, m, d] = baseDate.split("-").map(Number);
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
        user,
        session,
        authLoading,
        signOut,
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
