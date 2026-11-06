import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classi Tailwind con gestione collisioni via twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizza un valore decimale grezzo MCA2 proveniente da PostgreSQL (numeric/text).
 * Trappola evitata: Number(null) in JS diventa 0!
 * Questa funzione preserva rigorosamente la distinzione tra 0.00 CHF e null/n.d.
 */
export function parseMca2Amount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "" || raw === "n.d.") {
    return null;
  }
  const parsed = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/['’\s]/g, ""));
  if (isNaN(parsed)) {
    return null;
  }
  // Arrotondamento esatto al centesimo (0.01 CHF) per evitare floating-point noise
  return Math.round(parsed * 100) / 100;
}

/**
 * Formatta un valore in CHF con precisione al centesimo esatto (0.01 CHF),
 * separatore svizzero (') e gestione rigorosa di 0.00 CHF vs n.d.
 */
export function formatChfExact(
  val: number | null | undefined,
  options: {
    showUnit?: boolean;
    fallback?: string;
    signDisplay?: "auto" | "always" | "never";
  } = {}
): string {
  const { showUnit = true, fallback = "n.d.", signDisplay = "auto" } = options;

  if (val === null || val === undefined || isNaN(val)) {
    return fallback;
  }

  const sign = val > 0 && signDisplay === "always" ? "+" : "";
  const formatted = val.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}${formatted}${showUnit ? " CHF" : ""}`;
}

/**
 * Formatta un valore sintetico compatto in milioni/migliaia o CHF intero (es. "CHF 4.2M", "CHF 3'120").
 */
export function formatChfCompact(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "n.d.";
  }
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}CHF ${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}CHF ${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}CHF ${Math.round(abs).toLocaleString("de-CH")}`;
  }
  return `${sign}CHF ${abs.toFixed(2)}`;
}
