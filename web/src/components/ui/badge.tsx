import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[#0F3854] text-white border-transparent",
    secondary: "bg-slate-200/80 text-slate-800 border-transparent",
    destructive: "bg-red-600 text-white border-transparent",
    outline: "text-slate-800 border-slate-300",
    success: "bg-emerald-600 text-white border-transparent",
    warning: "bg-amber-500 text-slate-950 border-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
