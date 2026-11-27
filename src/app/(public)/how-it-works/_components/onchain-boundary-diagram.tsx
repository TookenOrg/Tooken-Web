"use client";

import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Database,
  FileCheck2,
  Pause,
  Play,
  ReceiptText,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramMotion } from "./use-diagram-motion";

interface BoundaryFlow {
  id: string;
  code: string;
  label: string;
  direction: "to-chain" | "from-chain";
  bridgePayload: string;
  offChainTitle: string;
  offChainDetail: string;
  offChainTag: string;
  onChainTitle: string;
  onChainDetail: string;
  onChainTag: string;
  takeaway: string;
}

const FLOWS: BoundaryFlow[] = [
  {
    id: "publish",
    code: "01",
    label: "Publish offering",
    direction: "to-chain",
    bridgePayload: 'deployTREXSuite("re-<id>", …)',
    offChainTitle: "Property file & economic terms",
    offChainDetail:
      "Photos, architectural description, issuer details, valuation and share price live in PostgreSQL.",
    offChainTag: "PostgreSQL · Asset service",
    onChainTitle: "Dedicated ERC-3643 contract suite",
    onChainDetail:
      "A property-specific Token, IdentityRegistry, topic/issuer registries and ModularCompliance caps are deployed.",
    onChainTag: "EVM · TREXFactory",
    takeaway:
      "Marketing media and legal prose stay off-chain; enforceable share supply and holding caps live on-chain.",
  },
  {
    id: "kyc",
    code: "02",
    label: "Sync investor KYC",
    direction: "to-chain",
    bridgePayload: "OnchainID + Topic 7 + ISO code",
    offChainTitle: "Private KYC review & identity dossier",
    offChainDetail:
      "Passports, proof of address and compliance reviews stay inside Tooken — raw ID documents are never put on-chain.",
    offChainTag: "Private · ID docs off-chain",
    onChainTitle: "OnchainID & shared registry entry",
    onChainDetail:
      "OnchainID holds the signed Topic 7 claim; shared IdentityRegistryStorage maps the wallet to OnchainID + ISO country code.",
    onChainTag: "Shared IdentityRegistryStorage",
    takeaway:
      "Identity documents stay private off-chain; on-chain, contracts only see the wallet–OnchainID link, ISO country code, and signed Topic 7 status.",
  },
  {
    id: "mint",
    code: "03",
    label: "Settle & mint shares",
    direction: "to-chain",
    bridgePayload: "Token.mint(wallet, 50e18)",
    offChainTitle: "Order reservation & bank settlement",
    offChainDetail:
      "Share reservation timers, exact fee calculation and fiat wire confirmation are coordinated in the back office.",
    offChainTag: "Order & delivery service",
    onChainTitle: "Verified share creation (Mint)",
    onChainDetail:
      "The Token contract verifies Topic 7 eligibility and compliance caps before minting shares (18 decimals) to the wallet.",
    onChainTag: "Atomic smart-contract check",
    takeaway:
      "Fiat payment happens through traditional banking rails; share creation is enforced by smart-contract rules.",
  },
  {
    id: "receipt",
    code: "04",
    label: "Confirm delivery",
    direction: "from-chain",
    bridgePayload: "Tx receipt + Transfer event",
    offChainTitle: "Portfolio & order audit trail",
    offChainDetail:
      "Tooken verifies the mined transaction receipt and Transfer event before marking the investor order delivered.",
    offChainTag: "Verified tx hash recorded",
    onChainTitle: "Immutable on-chain balance & log",
    onChainDetail:
      "The blockchain records the wallet's updated token balance and emits Transfer(0x0, investorWallet, amount).",
    onChainTag: "On-chain source of truth",
    takeaway:
      "An order is only marked delivered once the blockchain confirms the Transfer event from address 0x0.",
  },
];

const FLOW_INTERVAL_MS = 4500;

export function OnchainBoundaryDiagram() {
  const { reducedMotion, visible } = useDiagramMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userAutoPlay, setUserAutoPlay] = useState<boolean | null>(null);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const wantsAutoPlay = userAutoPlay ?? !reducedMotion;
  const running = wantsAutoPlay && visible && !interactionPaused;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => (current + 1) % FLOWS.length);
    }, FLOW_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const active = FLOWS[selectedIndex] ?? FLOWS[0];

  return (
    <figure
      aria-label="Off-chain and on-chain architecture explorer"
      className={cn(
        "border border-border bg-white p-5 sm:p-8",
        !wantsAutoPlay && "motion-paused",
        userAutoPlay === true && "motion-opt-in",
      )}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteractionPaused(false);
        }
      }}
    >
      {/* Top bar: flow selector + play/pause */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <fieldset
          aria-label="Off-chain and on-chain synchronization flows"
          className="flex flex-wrap gap-2"
        >
          <legend className="sr-only">
            Off-chain and on-chain synchronization flows
          </legend>
          {FLOWS.map((flow, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={flow.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedIndex(index);
                  setUserAutoPlay(false);
                }}
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-2 text-xs font-medium transition-colors",
                  isSelected
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-background text-muted-foreground hover:border-ink/40 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isSelected ? "text-brand-light" : "text-amber-700",
                  )}
                >
                  {flow.code}
                </span>
                {flow.label}
              </button>
            );
          })}
        </fieldset>

        <button
          type="button"
          onClick={() => setUserAutoPlay(!wantsAutoPlay)}
          className="inline-flex items-center gap-2 self-start border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-ink hover:bg-muted lg:self-auto"
        >
          {wantsAutoPlay ? (
            <>
              <Pause className="size-3" aria-hidden /> Pause cycle
            </>
          ) : (
            <>
              <Play className="size-3" aria-hidden /> Auto-cycle
            </>
          )}
        </button>
      </div>

      {/* Three-column architecture map */}
      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-[1fr_240px_1fr]">
        {/* Left column: Off-chain */}
        <div className="flex flex-col justify-between border border-border bg-background p-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-ink" aria-hidden />
                <h3 className="text-sm font-semibold text-ink">
                  Off-Chain · Tooken Platform
                </h3>
              </div>
              <span className="border border-border bg-white px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                Go API + PostgreSQL
              </span>
            </div>

            <ul className="mt-4 space-y-2.5">
              {FLOWS.map((flow, index) => {
                const isCurrent = index === selectedIndex;
                return (
                  <li key={flow.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndex(index);
                        setUserAutoPlay(false);
                      }}
                      className={cn(
                        "w-full border p-3.5 text-left transition-all",
                        isCurrent
                          ? "border-ink bg-white shadow-xs"
                          : "border-transparent bg-white/50 opacity-70 hover:opacity-100",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink">
                          {flow.offChainTitle}
                        </span>
                        <span className="font-mono text-[10px] text-amber-700">
                          {flow.offChainTag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {flow.offChainDetail}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <Shield className="size-3.5 shrink-0 text-ink" aria-hidden />
            <span>
              Private personal data &amp; fiat banking stay off-chain.
            </span>
          </div>
        </div>

        {/* Center column: Animated synchronization bridge */}
        <div className="flex flex-col items-center justify-center border border-dashed border-border bg-muted/40 px-4 py-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Go-Ethereum Bridge
          </span>

          <div className="my-4 w-full">
            <svg
              viewBox="0 0 200 84"
              role="img"
              aria-label={`${active.label}: ${active.bridgePayload}`}
              className="h-20 w-full"
            >
              <line
                x1="12"
                y1="42"
                x2="188"
                y2="42"
                stroke={active.direction === "to-chain" ? "#f59e0b" : "#10b981"}
                strokeWidth="3"
                className={
                  active.direction === "to-chain"
                    ? "animate-dash-flow"
                    : "animate-dash-flow-reverse"
                }
              />
              {active.direction === "to-chain" ? (
                <polygon points="184,35 196,42 184,49" fill="#f59e0b" />
              ) : (
                <polygon points="16,35 4,42 16,49" fill="#10b981" />
              )}
              <rect
                x="20"
                y="10"
                width="160"
                height="22"
                rx="2"
                fill="#2d2b3d"
              />
              <text
                x="100"
                y="24"
                textAnchor="middle"
                className="fill-white font-mono text-[8.5px]"
              >
                {active.bridgePayload}
              </text>
              <text
                x="100"
                y="66"
                textAnchor="middle"
                fill="#57534e"
                className="font-mono text-[9px]"
              >
                {active.direction === "to-chain"
                  ? "SIGNED EVM TRANSACTION →"
                  : "← VERIFIED BLOCK RECEIPT"}
              </text>
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 border border-border bg-white px-2.5 py-1 font-mono text-[10px] text-ink">
            {active.direction === "to-chain" ? (
              <>
                Off-chain <ArrowRight className="size-3 text-amber-600" />{" "}
                On-chain
              </>
            ) : (
              <>
                Off-chain <ArrowLeft className="size-3 text-emerald-600" />{" "}
                On-chain
              </>
            )}
          </div>
        </div>

        {/* Right column: On-chain */}
        <div className="flex flex-col justify-between border border-ink bg-ink p-5 text-white">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <Blocks className="size-4 text-brand-light" aria-hidden />
                <h3 className="text-sm font-semibold text-white">
                  On-Chain · EVM Blockchain
                </h3>
              </div>
              <span className="border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] text-brand-light">
                ERC-3643 Solidity
              </span>
            </div>

            <ul className="mt-4 space-y-2.5">
              {FLOWS.map((flow, index) => {
                const isCurrent = index === selectedIndex;
                return (
                  <li key={flow.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndex(index);
                        setUserAutoPlay(false);
                      }}
                      className={cn(
                        "w-full border p-3.5 text-left transition-all",
                        isCurrent
                          ? "border-brand bg-ink-2"
                          : "border-white/10 bg-white/[0.03] opacity-65 hover:opacity-100",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-white">
                          {flow.onChainTitle}
                        </span>
                        <span className="font-mono text-[10px] text-brand-light">
                          {flow.onChainTag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                        {flow.onChainDetail}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 text-[11px] text-white/75">
            <FileCheck2
              className="size-3.5 shrink-0 text-emerald-400"
              aria-hidden
            />
            <span>
              Eligibility proofs, supply caps &amp; token balances live
              on-chain.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom takeaway banner */}
      <div
        aria-live={running ? "off" : "polite"}
        className="mt-5 flex items-start gap-3 border-t border-border pt-4 text-sm text-ink"
      >
        <ReceiptText
          className="mt-0.5 size-4 shrink-0 text-amber-700"
          aria-hidden
        />
        <p>
          <strong className="font-medium">
            Bridge {active.code} — {active.label}:
          </strong>{" "}
          <span className="text-muted-foreground">{active.takeaway}</span>
        </p>
      </div>
    </figure>
  );
}
