"use client";

import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";

export function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  USER: "Investor",
  MANAGER: "Asset manager",
  ADMIN: "Administrator",
};

export function roleLabel(role: string | undefined | null): string {
  return ROLE_LABEL[role ?? ""] ?? "Member";
}

export function UserAvatar({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-semibold text-ink-3",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Signed-in account summary shown at the bottom of dark navigation drawers. */
export function AccountSummary({ className }: { className?: string }) {
  const { user, claims, role } = useSession();
  const name = user?.full_name ?? claims?.email ?? "";
  return (
    <div className={cn("border-t border-white/10 p-3", className)}>
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

export function UserMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { ready, user, claims, role, isStaff, isInvestor } = useSession();
  const name = user?.full_name ?? claims?.email ?? "Account";
  // The session only exists in the browser: rendering the menu during SSR
  // would produce mismatching Radix ids on hydration.
  if (!ready) {
    return <span className="size-8 rounded-full bg-muted" aria-hidden />;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand",
          tone === "dark" ? "hover:bg-white/10" : "hover:bg-muted",
        )}
      >
        <UserAvatar name={name} />
        <span className="hidden min-w-0 md:block">
          <span
            className={cn(
              "block max-w-40 truncate text-sm font-medium",
              tone === "dark" ? "text-white" : "text-ink",
            )}
          >
            {name}
          </span>
          <span
            className={cn(
              "block text-[11px]",
              tone === "dark" ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {roleLabel(role)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden size-4 md:block",
            tone === "dark" ? "text-white/60" : "text-muted-foreground",
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-ink/70">{roleLabel(role)}</div>
          <div className="truncate text-xs text-muted-foreground">
            {user?.email ?? claims?.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isInvestor ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard /> Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/verification">
                <ShieldCheck /> Identity verification
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {isStaff ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard /> Back office
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/explore">
            <Store /> Marketplace
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-red-600 focus:text-red-700 [&_svg]:text-red-600"
        >
          <Link href="/logout">
            <LogOut /> Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
