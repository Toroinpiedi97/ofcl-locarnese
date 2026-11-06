import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CivicLangProvider } from "@/lib/i18n-civic";
import { CivicAppShell } from "@/components/shell/CivicAppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OFCL · Osservatorio Finanze Comunali del Locarnese",
  description:
    "Trasparenza civica sui bilanci Preventivi e Consuntivi MCA2, Controllo Crediti e Cespiti dei 19 Comuni del Locarnese.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#1b2028] font-sans text-slate-900">
        <CivicLangProvider>
          <CivicAppShell>{children}</CivicAppShell>
        </CivicLangProvider>
      </body>
    </html>
  );
}
