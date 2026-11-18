export const CURATOR_COOKIE_NAME = "ofcl_curator_session";

export interface CuratorCookiePayload {
  sub: string;
  email: string;
  role: "curator" | "admin";
  via: "password";
  exp: number;
}

export function hasLiveSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !key) return false;
  if (url.includes("ofcl-local") || url.includes("<TUO_")) return false;
  if (key.includes("dummy-anon-key") || key.includes("<TUA_")) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

export function isOfflineDevSandbox(): boolean {
  const devFlag =
    process.env.ALLOW_DEV_ADMIN === "true" || process.env.PLAYWRIGHT_TEST === "1";
  if (!devFlag) return false;
  return !hasLiveSupabaseConfig() || process.env.PLAYWRIGHT_TEST === "1";
}

export function getConfiguredAdminPassword(): string | null {
  const pw =
    process.env.CURATOR_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
  return pw.length > 0 ? pw : null;
}

export function getAllowedCuratorEmails(): string[] {
  const raw =
    process.env.CURATOR_EMAILS?.trim() || process.env.ADMIN_EMAILS?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSupabaseUserCurator(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
} | null): boolean {
  if (!user) return false;
  const role = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "";
  if (role === "curator" || role === "admin") return true;

  const allowedEmails = getAllowedCuratorEmails();
  if (allowedEmails.length > 0 && user.email) {
    return allowedEmails.includes(user.email.trim().toLowerCase());
  }
  return false;
}

async function deriveHmacKeyMaterial(): Promise<string | null> {
  const explicit =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.CURATOR_SESSION_SECRET?.trim() ||
    process.env.REVALIDATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (explicit) return explicit;

  const pw = getConfiguredAdminPassword();
  if (pw) {
    return `ofcl-curator-session-v1:${pw}`;
  }
  return null;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Uint8Array | null {
  try {
    const padLen = (4 - (str.length % 4)) % 4;
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importSigningKey(usage: KeyUsage[]): Promise<CryptoKey | null> {
  const secret = await deriveHmacKeyMaterial();
  if (!secret) return null;
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

export async function signCuratorCookieEdge(
  payload: CuratorCookiePayload
): Promise<string | null> {
  const key = await importSigningKey(["sign"]);
  if (!key) return null;
  const enc = new TextEncoder();
  const bodyB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(bodyB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuf));
  return `${bodyB64}.${sigB64}`;
}

export async function verifyCuratorCookieEdge(
  token: string | undefined | null
): Promise<CuratorCookiePayload | null> {
  if (!token || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [bodyB64, sigB64] = parts;
  if (!bodyB64 || !sigB64) return null;

  const key = await importSigningKey(["verify"]);
  if (!key) return null;

  const sigBytes = base64UrlDecode(sigB64);
  if (!sigBytes) return null;

  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer as ArrayBuffer,
    enc.encode(bodyB64)
  );
  if (!valid) return null;

  const bodyBytes = base64UrlDecode(bodyB64);
  if (!bodyBytes) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as CuratorCookiePayload;
    if (
      !parsed ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now() ||
      (parsed.role !== "curator" && parsed.role !== "admin")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
