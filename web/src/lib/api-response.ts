import { NextResponse } from "next/server";

export interface ApiMeta {
  disclaimer: string;
  source: string;
  license: string;
  timestamp: string;
}

export const OFCL_META: ApiMeta = {
  disclaimer:
    "Fanno fede unicamente gli atti ufficiali esposti all'Albo comunale ex art. 192 LOC. I dati armonizzati MCA2 operano con precisione al centesimo esatto (0.01 CHF).",
  source: "Osservatorio Finanze Comunali del Locarnese (OFCL)",
  license: "CC-BY-4.0",
  timestamp: new Date().toISOString(),
};

export function apiSuccess<T>(data: T, customMeta?: Partial<ApiMeta>, status: number = 200) {
  const meta: ApiMeta = {
    ...OFCL_META,
    ...customMeta,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      data,
      meta,
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

export function apiOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
