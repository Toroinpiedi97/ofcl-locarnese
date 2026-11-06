"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CultTabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface CultDirectionTabsProps {
  tabs: CultTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function CultDirectionTabs({
  tabs,
  activeId,
  onChange,
  className,
  size = "sm",
}: CultDirectionTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-xl bg-slate-200/70 p-1 border border-white/60 shadow-xs",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm",
              isActive
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  isActive ? "bg-slate-100 text-slate-800" : "bg-slate-300/60 text-slate-600"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
