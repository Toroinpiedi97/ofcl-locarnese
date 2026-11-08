"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Scale, Building2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useCivicLang();

  // Escludi console curatore /admin
  if (pathname?.startsWith("/admin")) return null;

  const items = [
    {
      id: "dashboard",
      href: "/",
      label: t.navDashboard,
      icon: BarChart3,
      isActive: pathname === "/",
    },
    {
      id: "confronta",
      href: "/confronta",
      label: t.navConfronta,
      icon: Scale,
      isActive: pathname === "/confronta",
    },
    {
      id: "comuni",
      href: "/comuni/locarno",
      label: t.navComuni,
      icon: Building2,
      isActive: pathname.startsWith("/comuni"),
    },
    {
      id: "segnala",
      href: "/segnala",
      label: t.navSegnala,
      icon: Ticket,
      isActive: pathname === "/segnala",
      isAmber: true,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-t border-slate-200/90 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around lg:hidden shadow-lg select-none"
      aria-label="Navigazione rapida mobile"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[56px] min-h-[44px] justify-center transition-all",
              item.isActive
                ? item.isAmber
                  ? "text-amber-600 font-bold"
                  : "text-sky-700 font-bold"
                : item.isAmber
                ? "text-amber-700/80 hover:text-amber-900"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                item.isActive && !item.isAmber && "stroke-[2.5]"
              )}
            />
            <span className="text-[10px] leading-none tracking-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
