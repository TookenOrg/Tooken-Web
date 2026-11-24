"use client";

import Link from "next/link";
import { homeFor } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session-context";
import { Brand } from "./brand";

export function PublicFooter() {
  const { ready, isAuthenticated, isStaff, role } = useSession();

  return (
    <footer className="border-t border-border bg-background text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Brand tone="dark" />
          <p className="max-w-xs text-sm leading-relaxed">
            Real-world assets. Digital ownership. Infrastructure for asset
            tokenization, built on ERC-3643.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-medium text-ink">Platform</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore" className="hover:text-ink">
                Marketplace
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-ink">
                How it works
              </Link>
            </li>
            {!(isAuthenticated && role === "USER") ? (
              <li>
                <Link href="/#institutions" className="hover:text-ink">
                  For issuers &amp; asset managers
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-medium text-ink">Account</h3>
          <ul className="space-y-2 text-sm">
            {ready ? (
              isAuthenticated ? (
                <>
                  <li>
                    <Link href={homeFor(role)} className="hover:text-ink">
                      {isStaff ? "Back office" : "Dashboard"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={isStaff ? "/profile" : "/favorites"}
                      className="hover:text-ink"
                    >
                      {isStaff ? "Profile" : "Watchlist"}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/sign-in" className="hover:text-ink">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href="/sign-up" className="hover:text-ink">
                      Open an account
                    </Link>
                  </li>
                </>
              )
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Tooken. All rights reserved.</span>
          <span className="max-w-xl leading-relaxed">
            Investing in unlisted securities carries a risk of capital loss and
            limited liquidity.
          </span>
        </div>
      </div>
    </footer>
  );
}
