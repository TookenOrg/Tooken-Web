import Link from "next/link";
import { Brand } from "./brand";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-ink-3 text-white/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-3 md:col-span-2">
          <Brand />
          <p className="max-w-sm text-sm">
            Regulated-grade infrastructure to tokenize, distribute and settle
            real estate securities on ERC-3643 rails.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/80">
            Platform
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore" className="hover:text-white">
                Marketplace
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#institutions" className="hover:text-white">
                For institutions
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/80">
            Account
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/sign-in" className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/sign-up" className="hover:text-white">
                Open an account
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Tooken. All rights reserved.</span>
          <span>
            Investing in unlisted securities carries a risk of capital loss and
            limited liquidity.
          </span>
        </div>
      </div>
    </footer>
  );
}
