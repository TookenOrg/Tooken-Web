"use client";

import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { HealthIndicator } from "./health-indicator";
import { roleLabel, UserAvatar, UserMenu } from "./user-menu";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match only the exact path, not its children. */
  exact?: boolean;
  /** Hide the item unless the predicate passes. */
  visible?: (session: ReturnType<typeof useSession>) => boolean;
  badge?: React.ReactNode;
};

export type NavSection = { title?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const session = useSession();
  return (
    <nav
      className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
      aria-label="Main"
    >
      {sections.map((section, si) => {
        const items = section.items.filter(
          (i) => !i.visible || i.visible(session),
        );
        if (!items.length) return null;
        return (
          <div key={section.title ?? si}>
            {section.title ? (
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                {section.title}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                        active
                          ? "bg-white/[0.07] font-medium text-white"
                          : "text-sidebar-foreground hover:bg-white/[0.04] hover:text-white",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                          aria-hidden
                        />
                      ) : null}
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-brand"
                            : "text-white/45 group-hover:text-white/80",
                        )}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { user, claims, role } = useSession();
  const name = user?.full_name ?? claims?.email ?? "";
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <UserAvatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">
            {name || "…"}
          </div>
          <div className="truncate text-[11px] text-white/50">
            {roleLabel(role)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  sections,
  brandSuffix,
  homeHref,
  onNavigate,
}: {
  sections: NavSection[];
  brandSuffix?: string;
  homeHref: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Brand href={homeHref} suffix={brandSuffix} />
      </div>
      <SidebarNav sections={sections} onNavigate={onNavigate} />
      <SidebarFooter />
    </div>
  );
}

/**
 * Authenticated layout: fixed dark sidebar on desktop, drawer on mobile, and
 * a light content area where every page renders its own PageHeader.
 */
export function AppShell({
  sections,
  brandSuffix,
  homeHref,
  topbarExtra,
  children,
}: {
  sections: NavSection[];
  brandSuffix?: string;
  homeHref: string;
  topbarExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent
          sections={sections}
          brandSuffix={brandSuffix}
          homeHref={homeHref}
        />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="-ml-1 rounded-md p-2 text-ink hover:bg-muted lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-0 p-0 [&>button]:text-white"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                sections={sections}
                brandSuffix={brandSuffix}
                homeHref={homeHref}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <Brand href={homeHref} tone="dark" />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {topbarExtra}
            <HealthIndicator />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
