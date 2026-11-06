"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ChartFrostSkeleton } from "@/components/ui/ChartFrostSkeleton";

export const DistrictTrendLineChart = dynamic(
  () =>
    import("./DistrictTrendLineChart").then((mod) => mod.DistrictTrendLineChart),
  {
    ssr: false,
    loading: () => <ChartFrostSkeleton height={195} label="Caricamento serie storica..." />,
  }
);

export const SectorPerCapitaBarChart = dynamic(
  () =>
    import("./SectorPerCapitaBarChart").then((mod) => mod.SectorPerCapitaBarChart),
  {
    ssr: false,
    loading: () => <ChartFrostSkeleton height={195} label="Caricamento spesa per settori..." />,
  }
);

export const SelIndicatorsRadarChart = dynamic(
  () =>
    import("./SelIndicatorsRadarChart").then((mod) => mod.SelIndicatorsRadarChart),
  {
    ssr: false,
    loading: () => <ChartFrostSkeleton height={240} label="Caricamento radar 8 indicatori SEL..." />,
  }
);

export const CreditProgressBarChart = dynamic(
  () =>
    import("./CreditProgressBarChart").then((mod) => mod.CreditProgressBarChart),
  {
    ssr: false,
    loading: () => <ChartFrostSkeleton height={220} label="Caricamento avanzamento crediti..." />,
  }
);
