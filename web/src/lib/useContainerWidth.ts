"use client";

import { useState, useEffect, type RefObject } from "react";

/**
 * Hook condiviso per monitorare la larghezza del contenitore di card e grafici.
 * Utilizza un singolo ResizeObserver throttlato via requestAnimationFrame
 * per evitare re-render a cascata durante il ridimensionamento della finestra.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const newWidth = Math.round(entry.contentRect.width);

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWidth((prev) => (Math.abs(prev - newWidth) > 4 ? newWidth : prev));
      });
    });

    observer.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref]);

  return width;
}
