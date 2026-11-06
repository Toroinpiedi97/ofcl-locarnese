/**
 * Guardrail di quota giornaliera (Vercel / Supabase / Cloudflare R2).
 *
 * Ogni "bucket" ha un budget giornaliero (UTC) e un limite per-IP al minuto.
 * Superato il budget si risponde 429/503 con Retry-After fino a mezzanotte UTC,
 * invece di consumare quota a pagamento.
 *
 * LIMITE NOTO: i contatori sono in memoria per istanza serverless/edge
 * (best-effort). Il budget effettivo globale e' quindi <= budget * n. istanze
 * calde. Per un tetto rigido e globale sostituire `store` con Upstash/Vercel KV
 * mantenendo la stessa interfaccia. Le risposte cacheabili (s-maxage) sono
 * comunque servite dalla CDN senza toccare questi contatori.
 *
 * Override via env: OFCL_BUDGET_<BUCKET>_DAY, OFCL_BUDGET_<BUCKET>_IP_MIN.
 */

export type GuardBucket =
  | "api" // Vercel: invocazioni /api/v1/*, feed
  | "download" // Vercel/CDN: banda file open data
  | "supabase_write" // Supabase: scritture (ticket civici)
  | "r2_presign"; // Cloudflare R2: operazioni Class B (URL firmati)

interface BucketConfig {
  perDay: number;
  perIpPerMinute: number;
}

// Default prudenziali: ~1/3 dei limiti free-tier giornalizzati, cosi' i
// tre servizi non si saturano insieme.
const DEFAULTS: Record<GuardBucket, BucketConfig> = {
  api: { perDay: 20000, perIpPerMinute: 60 },
  download: { perDay: 3000, perIpPerMinute: 10 },
  supabase_write: { perDay: 300, perIpPerMinute: 3 },
  r2_presign: { perDay: 2000, perIpPerMinute: 20 },
};

function configFor(bucket: GuardBucket): BucketConfig {
  const key = bucket.toUpperCase();
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    perDay: num(process.env[`OFCL_BUDGET_${key}_DAY`], DEFAULTS[bucket].perDay),
    perIpPerMinute: num(
      process.env[`OFCL_BUDGET_${key}_IP_MIN`],
      DEFAULTS[bucket].perIpPerMinute
    ),
  };
}

const MAX_IP_ENTRIES = 5000;

const store = {
  day: "",
  daily: new Map<GuardBucket, number>(),
  ip: new Map<string, { windowStart: number; count: number }>(),
};

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function secondsToUtcMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now) / 1000));
}

export type GuardResult =
  | { ok: true; remainingToday: number }
  | { ok: false; reason: "ip_rate" | "daily_budget"; retryAfter: number };

export function consume(
  bucket: GuardBucket,
  ip: string,
  now: number = Date.now()
): GuardResult {
  const cfg = configFor(bucket);
  const today = utcDay(now);
  if (store.day !== today) {
    store.day = today;
    store.daily.clear();
  }

  // 1. Limite per IP (finestra fissa di 60s)
  const ipKey = `${bucket}:${ip}`;
  const entry = store.ip.get(ipKey);
  if (!entry || now - entry.windowStart >= 60_000) {
    if (store.ip.size >= MAX_IP_ENTRIES) {
      for (const [k, v] of store.ip) {
        if (now - v.windowStart >= 60_000) store.ip.delete(k);
      }
      if (store.ip.size >= MAX_IP_ENTRIES) store.ip.clear();
    }
    store.ip.set(ipKey, { windowStart: now, count: 1 });
  } else {
    if (entry.count >= cfg.perIpPerMinute) {
      return {
        ok: false,
        reason: "ip_rate",
        retryAfter: Math.max(1, Math.ceil((60_000 - (now - entry.windowStart)) / 1000)),
      };
    }
    entry.count += 1;
  }

  // 2. Budget giornaliero globale del bucket
  const used = store.daily.get(bucket) ?? 0;
  if (used >= cfg.perDay) {
    return { ok: false, reason: "daily_budget", retryAfter: secondsToUtcMidnight(now) };
  }
  store.daily.set(bucket, used + 1);
  return { ok: true, remainingToday: cfg.perDay - used - 1 };
}

/** Solo per i test. */
export function __resetGuardrails() {
  store.day = "";
  store.daily.clear();
  store.ip.clear();
}

export function clientIpFrom(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Classifica un path pubblico nel bucket di quota corrispondente. */
export function bucketForPath(pathname: string): GuardBucket | null {
  if (pathname.startsWith("/data/opendata/")) return "download";
  if (pathname.startsWith("/api/v1/") || pathname === "/feed.xml") return "api";
  return null;
}
