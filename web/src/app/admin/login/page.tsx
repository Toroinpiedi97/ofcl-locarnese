import { Suspense } from "react";
import {
  getConfiguredAdminPassword,
  hasLiveSupabaseConfig,
} from "@/lib/admin-session-edge";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const hasPasswordMode = Boolean(getConfiguredAdminPassword());
  const hasSupabaseAuth = hasLiveSupabaseConfig();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginClient
        hasPasswordMode={hasPasswordMode}
        hasSupabaseAuth={hasSupabaseAuth}
      />
    </Suspense>
  );
}
