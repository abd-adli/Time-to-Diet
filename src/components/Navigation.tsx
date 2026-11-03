"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Dumbbell, TrendingUp, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Navigation() {
  const pathname = usePathname();
  const { user } = useApp();

  if (!user) return null;

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/food",
      label: "Nutrisi & AI",
      icon: UtensilsCrossed,
    },
    {
      href: "/workout",
      label: "PPL Workout",
      icon: Dumbbell,
    },
    {
      href: "/progress",
      label: "Progress",
      icon: TrendingUp,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c1220]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 safe-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`p-1 rounded-lg transition-transform ${isActive ? "scale-110 bg-emerald-500/10" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop / Tablet Navigation Header Links */}
      <div className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
