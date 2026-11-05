"use client";

import { AppShell } from "@/components/app/app-shell";
import { ADMIN_NAV } from "@/components/app/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell sections={ADMIN_NAV} homeHref="/admin" brandSuffix="Back office">
      {children}
    </AppShell>
  );
}
