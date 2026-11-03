"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { homeFor } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session-context";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { UserMenu } from "./user-menu";

const LINKS = [
  { label: "Marketplace", href: "/explore" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Institutions", href: "/#institutions" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { ready, isAuthenticated, role, isStaff } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav
          className="hidden flex-1 items-center gap-1 md:flex"
          aria-label="Main"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-white/70 transition hover:text-white",
                pathname === l.href && "text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {!ready ? null : isAuthenticated ? (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link href={homeFor(role)}>
                  {isStaff ? "Back office" : "Dashboard"}
                </Link>
              </Button>
              <UserMenu tone="dark" />
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand-light"
              >
                <Link href="/sign-up">Open an account</Link>
              </Button>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="ml-auto rounded-md p-2 hover:bg-white/10 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 border-0 bg-ink p-0 text-white [&>button]:text-white"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-16 items-center border-b border-white/10 px-5">
              <Brand />
            </div>
            <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t border-white/10" />
              {isAuthenticated ? (
                <>
                  <Link
                    href={homeFor(role)}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm text-white hover:bg-white/5"
                  >
                    {isStaff ? "Back office" : "Dashboard"}
                  </Link>
                  <Link
                    href="/logout"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm text-red-300 hover:bg-white/5"
                  >
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm text-white hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                  <Button
                    asChild
                    className="mx-3 mt-2 bg-brand text-brand-foreground hover:bg-brand-light"
                  >
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Open an account
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
