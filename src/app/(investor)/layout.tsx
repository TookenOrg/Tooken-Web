"use client";

import { AppShell } from "@/components/app/app-shell";
import { INVESTOR_NAV } from "@/components/app/navigation";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell sections={INVESTOR_NAV} homeHref="/dashboard">
      {children}
    </AppShell>
  );
}
