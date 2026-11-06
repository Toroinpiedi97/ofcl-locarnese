"use client";

import { cn } from "@/lib/utils";

interface ChartFrostSkeletonProps {
  height?: number | string;
  className?: string;
  label?: string;
}

export function ChartFrostSkeleton({
  height = 200,
  className,
  label = "Caricamento grafico...",
}: ChartFrostSkeletonProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      className={cn(
        "ofl-skeleton w-full rounded-xl flex items-center justify-center border border-white/60 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-500/80">
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
        <span>{label}</span>
      </div>
    </div>
  );
}
