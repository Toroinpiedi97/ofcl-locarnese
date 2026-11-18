import Link from "next/link";
import {
  ShieldCheck,
  FileCheck,
  UploadCloud,
  MessageSquareText,
  Camera,
  ExternalLink,
  LogOut,
  Lock,
} from "lucide-react";
import { getCuratorSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCuratorSession();

  const authBadge =
    session.mfaLevel === "aal2"
      ? { label: "MFA: AAL2 Attiva", dot: "bg-emerald-400" }
      : session.via === "password"
      ? { label: "Accesso Password", dot: "bg-emerald-400" }
      : session.via === "supabase"
      ? { label: "Sessione Curatore", dot: "bg-cyan-400" }
      : session.via === "dev_sandbox"
      ? { label: "Sandbox E2E", dot: "bg-amber-400" }
      : { label: "Accesso Richiesto", dot: "bg-slate-500" };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Curator Top Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={session.authenticated ? "/admin/queue" : "/admin/login"}
            className="flex items-center gap-2.5 text-white hover:text-cyan-400 transition-colors"
          >
            <div className="p-1.5 bg-cyan-950 border border-cyan-500/40 rounded text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-tight">
                OFCL Curator
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Console di Revisione MCA2
              </span>
            </div>
          </Link>

          {session.authenticated && (
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/admin/queue"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Coda Validazione</span>
              </Link>
              <Link
                href="/admin/upload"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Upload Locarno</span>
              </Link>
              <Link
                href="/admin/tickets"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <MessageSquareText className="w-4 h-4 text-amber-400" />
                <span>Segnalazioni Civiche</span>
              </Link>
              <Link
                href="/admin/social"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-pink-400" />
                <span>Post Instagram</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono">
            <span className={`w-2 h-2 rounded-full ${authBadge.dot}`}></span>
            <span>{authBadge.label}</span>
          </div>

          {session.authenticated &&
            session.via === "supabase" &&
            session.mfaLevel === "aal1" && (
              <Link
                href="/admin/mfa-setup"
                className="hidden lg:inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                title="Abilita autenticazione a 2 fattori TOTP (opzionale)"
              >
                <Lock className="w-3 h-3" />
                <span>Attiva 2FA</span>
              </Link>
            )}

          <Link
            href="/"
            target="_blank"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Portale Pubblico</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {session.authenticated && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Disconnetti"
                aria-label="Disconnetti"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Main Curator Workspace */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
