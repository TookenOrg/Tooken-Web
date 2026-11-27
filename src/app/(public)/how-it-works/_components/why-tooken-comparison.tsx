"use client";

import {
  AlertTriangle,
  Lock,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramMotion } from "./use-diagram-motion";

type RecipientMode = "verified" | "anonymous";

export function WhyTookenComparison() {
  const { reducedMotion } = useDiagramMotion();
  const [recipient, setRecipient] = useState<RecipientMode>("anonymous");
  const [userAnimate, setUserAnimate] = useState<boolean | null>(null);
  const isVerified = recipient === "verified";
  const animating = userAnimate ?? !reducedMotion;

  return (
    <div
      className={cn(
        "border border-border bg-white p-5 sm:p-8",
        !animating && "motion-paused",
        userAnimate === true && "motion-opt-in",
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber-700">
            Interactive simulator · Standard token vs ERC-3643
          </p>
          <h3 className="mt-2 font-editorial text-2xl font-normal tracking-tight text-ink sm:text-3xl">
            Why a standard crypto token is not enough.
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Test sending a tokenized real-estate share to two different wallets
            and observe how each token standard reacts on-chain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <fieldset
            aria-label="Choose recipient wallet profile"
            className="inline-flex shrink-0 border border-border bg-background p-1"
          >
            <legend className="sr-only">Recipient wallet profile</legend>
            <button
              type="button"
              onClick={() => setRecipient("anonymous")}
              aria-pressed={!isVerified}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors",
                !isVerified
                  ? "bg-ink text-white"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              <UserX className="size-3.5" aria-hidden />
              Unverified wallet
            </button>
            <button
              type="button"
              onClick={() => setRecipient("verified")}
              aria-pressed={isVerified}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors",
                isVerified
                  ? "bg-ink text-white"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              <UserCheck className="size-3.5" aria-hidden />
              KYC-verified investor
            </button>
          </fieldset>

          <button
            type="button"
            onClick={() => setUserAnimate(!animating)}
            className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-2 font-mono text-[11px] text-ink hover:bg-muted"
          >
            {animating ? (
              <>
                <Pause className="size-3" aria-hidden /> Pause flow
              </>
            ) : (
              <>
                <Play className="size-3" aria-hidden /> Animate flow
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Track 1: Standard ERC-20 */}
        <div className="flex flex-col justify-between border border-border bg-background p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Standard crypto token (ERC-20)
              </span>
              <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-900">
                UNPERMISSIONED
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Balances move freely between any wallet addresses. The contract
              has no concept of investor identity, jurisdiction, or holding
              limits.
            </p>

            {/* Animated SVG track */}
            <div className="mt-5 border border-border bg-white p-4">
              <svg
                viewBox="0 0 420 96"
                role="img"
                aria-label="ERC-20 transfer path without compliance checks"
                className="h-24 w-full"
              >
                <rect
                  x="8"
                  y="24"
                  width="96"
                  height="48"
                  fill="#fafaf9"
                  stroke="#d8d8d4"
                />
                <text
                  x="56"
                  y="45"
                  textAnchor="middle"
                  className="fill-ink font-sans text-[11px] font-medium"
                >
                  Token
                </text>
                <text
                  x="56"
                  y="60"
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[9px]"
                >
                  transfer(to, 10)
                </text>

                <line
                  x1="104"
                  y1="48"
                  x2="306"
                  y2="48"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  className="animate-dash-flow"
                />

                <rect
                  x="154"
                  y="32"
                  width="102"
                  height="32"
                  rx="2"
                  fill="#fffbeb"
                  stroke="#fcd34d"
                  strokeDasharray="3 3"
                />
                <text
                  x="205"
                  y="52"
                  textAnchor="middle"
                  className="fill-amber-900 font-mono text-[9px]"
                >
                  0 ON-CHAIN CHECKS
                </text>

                <rect
                  x="306"
                  y="24"
                  width="106"
                  height="48"
                  fill="#fffbeb"
                  stroke="#f59e0b"
                />
                <text
                  x="359"
                  y="45"
                  textAnchor="middle"
                  className="fill-ink font-sans text-[11px] font-medium"
                >
                  {isVerified ? "Verified wallet" : "Unknown 0x9f…"}
                </text>
                <text
                  x="359"
                  y="60"
                  textAnchor="middle"
                  className="fill-amber-800 font-mono text-[9px]"
                >
                  +10 TOKENS SENT
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 border-t border-border pt-4 text-xs">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-600"
              aria-hidden
            />
            <p className="leading-relaxed text-muted-foreground">
              {isVerified ? (
                <>
                  <strong className="font-medium text-ink">
                    Transfer succeeds — but nothing protects the next hop.
                  </strong>{" "}
                  That investor could immediately forward shares to an
                  unverified wallet outside the platform.
                </>
              ) : (
                <>
                  <strong className="font-medium text-ink">
                    Problem: an unknown wallet receives regulated shares.
                  </strong>{" "}
                  Without on-chain identity gates, the issuer loses control of
                  who holds the security.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Track 2: Tooken ERC-3643 */}
        <div className="flex flex-col justify-between border border-ink bg-ink p-5 text-white sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-light">
                Tooken security token (ERC-3643)
              </span>
              <span className="inline-flex items-center gap-1 border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-medium text-white">
                <Lock className="size-2.5 text-brand-light" aria-hidden />
                PERMISSIONED
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Every mint and transfer calls the token&apos;s on-chain Identity
              Registry and Modular Compliance contracts in the same transaction.
            </p>

            {/* Animated SVG track */}
            <div className="mt-5 border border-white/15 bg-ink-3 p-4">
              <svg
                viewBox="0 0 420 96"
                role="img"
                aria-label={
                  isVerified
                    ? "ERC-3643 transfer approved after identity and compliance checks"
                    : "ERC-3643 transfer blocked at Identity Registry check"
                }
                className="h-24 w-full"
              >
                {/* Source */}
                <rect
                  x="8"
                  y="24"
                  width="82"
                  height="48"
                  fill="#262435"
                  stroke="rgba(255,255,255,0.22)"
                />
                <text
                  x="49"
                  y="45"
                  textAnchor="middle"
                  className="fill-white font-sans text-[11px] font-medium"
                >
                  T-REX
                </text>
                <text
                  x="49"
                  y="60"
                  textAnchor="middle"
                  className="fill-white/65 font-mono text-[9px]"
                >
                  mint / transfer
                </text>

                {/* Line into Gate 1 */}
                <line
                  x1="90"
                  y1="48"
                  x2="130"
                  y2="48"
                  stroke={isVerified ? "#10b981" : "#f59e0b"}
                  strokeWidth="2.5"
                  className="animate-dash-flow"
                />

                {/* Gate 1: IdentityRegistry */}
                <rect
                  x="130"
                  y="20"
                  width="76"
                  height="56"
                  fill={
                    isVerified
                      ? "rgba(16,185,129,0.14)"
                      : "rgba(220,38,38,0.18)"
                  }
                  stroke={isVerified ? "#10b981" : "#f87171"}
                  strokeWidth="1.5"
                />
                <text
                  x="168"
                  y="42"
                  textAnchor="middle"
                  className="fill-white font-sans text-[10px] font-medium"
                >
                  Identity
                </text>
                <text
                  x="168"
                  y="56"
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[9px]",
                    isVerified ? "fill-emerald-300" : "fill-red-300",
                  )}
                >
                  {isVerified ? "TOPIC 7 OK" : "NO CLAIM"}
                </text>

                {/* Line Gate 1 -> Gate 2 */}
                <line
                  x1="206"
                  y1="48"
                  x2="232"
                  y2="48"
                  stroke={isVerified ? "#10b981" : "rgba(255,255,255,0.18)"}
                  strokeWidth="2.5"
                  className={isVerified ? "animate-dash-flow" : undefined}
                />

                {/* Gate 2: ModularCompliance */}
                <rect
                  x="232"
                  y="20"
                  width="76"
                  height="56"
                  fill={
                    isVerified
                      ? "rgba(16,185,129,0.14)"
                      : "rgba(255,255,255,0.06)"
                  }
                  stroke={isVerified ? "#10b981" : "rgba(255,255,255,0.28)"}
                  strokeWidth="1.5"
                />
                <text
                  x="270"
                  y="42"
                  textAnchor="middle"
                  className={cn(
                    "font-sans text-[10.5px] font-medium",
                    isVerified ? "fill-white" : "fill-white/80",
                  )}
                >
                  Compliance
                </text>
                <text
                  x="270"
                  y="56"
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[9.5px]",
                    isVerified ? "fill-emerald-300" : "fill-white/75",
                  )}
                >
                  {isVerified ? "CAPS OK" : "SKIPPED"}
                </text>

                {/* Line Gate 2 -> Wallet */}
                <line
                  x1="308"
                  y1="48"
                  x2="332"
                  y2="48"
                  stroke={isVerified ? "#10b981" : "rgba(255,255,255,0.22)"}
                  strokeWidth="2.5"
                  className={isVerified ? "animate-dash-flow" : undefined}
                />

                {/* Destination Wallet */}
                <rect
                  x="332"
                  y="24"
                  width="80"
                  height="48"
                  fill={
                    isVerified
                      ? "rgba(16,185,129,0.16)"
                      : "rgba(255,255,255,0.06)"
                  }
                  stroke={isVerified ? "#10b981" : "rgba(255,255,255,0.28)"}
                />
                <text
                  x="372"
                  y="45"
                  textAnchor="middle"
                  className={cn(
                    "font-sans text-[10.5px] font-medium",
                    isVerified ? "fill-white" : "fill-white/80",
                  )}
                >
                  {isVerified ? "Investor" : "0x9f…"}
                </text>
                <text
                  x="372"
                  y="60"
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[9.5px]",
                    isVerified ? "fill-emerald-300" : "fill-red-300",
                  )}
                >
                  {isVerified ? "+10 SHARES" : "0 RECEIVED"}
                </text>
              </svg>
            </div>
          </div>

          <output className="mt-4 flex items-start gap-2.5 border-t border-white/15 pt-4 text-xs">
            {isVerified ? (
              <>
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-400"
                  aria-hidden
                />
                <p className="leading-relaxed text-white/80">
                  <strong className="font-medium text-white">
                    Approved on-chain:
                  </strong>{" "}
                  The investor&apos;s OnchainID holds a valid Topic 7 KYC claim
                  and the order respects supply and per-investor caps.
                </p>
              </>
            ) : (
              <>
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-red-400"
                  aria-hidden
                />
                <p className="leading-relaxed text-white/80">
                  <strong className="font-medium text-white">
                    Blocked on-chain:
                  </strong>{" "}
                  IdentityRegistry rejects the recipient before a single token
                  moves — even if called directly outside Tooken&apos;s UI.
                </p>
              </>
            )}
          </output>
        </div>
      </div>
    </div>
  );
}
