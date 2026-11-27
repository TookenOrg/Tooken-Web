"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Pause,
  Play,
  Rocket,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramMotion } from "./use-diagram-motion";

interface StoryStep {
  actIndex: 0 | 1 | 2;
  subIndex: number;
  code: string;
  title: string;
  description: string;
  stateLabel: string;
}

const ACTS = [
  {
    id: "tokenization",
    number: "01",
    title: "Tokenization",
    subtitle: "Asset → programmable parameters",
    icon: Building2,
  },
  {
    id: "emission",
    number: "02",
    title: "Token emission",
    subtitle: "Deploy ERC-3643 suite (0 supply)",
    icon: Rocket,
  },
  {
    id: "mint",
    number: "03",
    title: "On-chain mint",
    subtitle: "Verify, create & deliver shares",
    icon: Coins,
  },
] as const;

const STORY_STEPS: StoryStep[] = [
  // Act 1: Tokenization
  {
    actIndex: 0,
    subIndex: 0,
    code: "1.1",
    title: "Divide the asset into digital shares",
    description:
      "The issuer defines the real-estate offering in Tooken: for example a €2,500,000 valuation divided into 25,000 shares at €100 each.",
    stateLabel: "Draft offering · 25,000 target shares",
  },
  {
    actIndex: 0,
    subIndex: 1,
    code: "1.2",
    title: "Configure supply & per-identity caps",
    description:
      "Total share supply (25,000) and max shares per investor identity (e.g. 2,500 across all wallets tied to one OnchainID) are converted into 18-decimal base units.",
    stateLabel: "Caps locked · Max 2,500 / identity",
  },
  {
    actIndex: 0,
    subIndex: 2,
    code: "1.3",
    title: "Bind mandatory KYC eligibility rules",
    description:
      "The offering requires Claim Topic 7 (KYC verification) signed by Tooken's trusted ClaimIssuer before any wallet can receive shares.",
    stateLabel: "Blueprint ready for blockchain publication",
  },
  // Act 2: Token Emission
  {
    actIndex: 1,
    subIndex: 0,
    code: "2.1",
    title: "Call TREXFactory.deployTREXSuite",
    description:
      "When the offering is published, Tooken's Go backend calls TREXFactory.deployTREXSuite with deterministic salt re-<assetId> to deploy an isolated token suite.",
    stateLabel: "Broadcasting TREXFactory deployment…",
  },
  {
    actIndex: 1,
    subIndex: 1,
    code: "2.2",
    title: "Wire registries to shared identity storage",
    description:
      "The new Property Token and IdentityRegistry link to ClaimTopicsRegistry (Topic 7), TrustedIssuersRegistry, and Tooken's shared IdentityRegistryStorage.",
    stateLabel: "Registries linked · Shared KYC active",
  },
  {
    actIndex: 1,
    subIndex: 2,
    code: "2.3",
    title: "Publish suite (0 supply), then open fundraising",
    description:
      "MaxBalanceModule, SupplyLimitModule and TransferRestrictModule are bound on-chain. Publishing sets the offering to published with 0 minted supply; fundraising opens next.",
    stateLabel: "Published · Supply: 0 / 25,000 shares",
  },
  // Act 3: Mint
  {
    actIndex: 2,
    subIndex: 0,
    code: "3.1",
    title: "Approve KYC & issue OnchainID claim",
    description:
      'Compliance approves the investor off-chain. Tooken creates their wallet and OnchainID proxy, signs Topic 7 = "OK", and registers wallet + ISO country code on-chain.',
    stateLabel: "Investor wallet verified on-chain",
  },
  {
    actIndex: 2,
    subIndex: 1,
    code: "3.2",
    title: "Reserve shares & confirm fiat settlement",
    description:
      "Once fundraising opens, the verified investor subscribes to 50 shares (€5,000). Tooken locks the reservation off-chain until bank payment is confirmed.",
    stateLabel: "Order settled · Ready for delivery",
  },
  {
    actIndex: 2,
    subIndex: 2,
    code: "3.3",
    title: "Execute atomic Token.mint(wallet, 50 × 10¹⁸)",
    description:
      "Tooken converts 50 shares into 18-decimal base units and calls mint. Atomically, the Token contract checks IdentityRegistry.isVerified(wallet) and ModularCompliance.canTransfer.",
    stateLabel: "On-chain gates passed · Minting…",
  },
  {
    actIndex: 2,
    subIndex: 3,
    code: "3.4",
    title: "Credit shares & confirm Transfer receipt",
    description:
      "50 new share tokens are created from address 0x0 in the investor's wallet. Tooken verifies the mined receipt and Transfer(0x0, wallet, 50e18) event before marking delivered.",
    stateLabel: "Delivered · Supply: 50 / 25,000 shares",
  },
];

const STEP_DURATION_MS = 4200;

export function LifecycleStoryboard() {
  const { reducedMotion, visible } = useDiagramMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const wantsPlaying = userPlaying ?? !reducedMotion;
  const running = wantsPlaying && visible && !interactionPaused;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STORY_STEPS.length);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const current = STORY_STEPS[stepIndex] ?? STORY_STEPS[0];
  const actSteps = STORY_STEPS.filter((s) => s.actIndex === current.actIndex);

  const goToAct = (actIndex: 0 | 1 | 2) => {
    const firstIndex = STORY_STEPS.findIndex((s) => s.actIndex === actIndex);
    if (firstIndex >= 0) {
      setStepIndex(firstIndex);
      setUserPlaying(false);
    }
  };

  return (
    <figure
      aria-label="End-to-end tokenization, emission, and mint storyboard"
      className={cn(
        "border border-border bg-white",
        !wantsPlaying && "motion-paused",
        userPlaying === true && "motion-opt-in",
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
      {/* Top 3-Act selector */}
      <fieldset
        aria-label="Token lifecycle stages"
        className="grid divide-y divide-border border-b border-border md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <legend className="sr-only">Token lifecycle stages</legend>
        {ACTS.map((act, index) => {
          const Icon = act.icon;
          const isCurrentAct = current.actIndex === index;
          return (
            <button
              key={act.id}
              type="button"
              aria-pressed={isCurrentAct}
              onClick={() => goToAct(index as 0 | 1 | 2)}
              className={cn(
                "flex items-start gap-4 p-5 text-left transition-colors sm:p-6",
                isCurrentAct
                  ? "bg-ink text-white"
                  : "bg-background text-ink hover:bg-muted/70",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center border",
                  isCurrentAct
                    ? "border-brand/50 bg-brand/15 text-brand-light"
                    : "border-border bg-white text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.16em]",
                    isCurrentAct ? "text-brand-light" : "text-amber-700",
                  )}
                >
                  Act {act.number}
                </p>
                <h3
                  className={cn(
                    "mt-1 text-base font-semibold",
                    isCurrentAct ? "text-white" : "text-ink",
                  )}
                >
                  {act.title}
                </h3>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    isCurrentAct ? "text-white/75" : "text-muted-foreground",
                  )}
                >
                  {act.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </fieldset>

      {/* Animated SVG Canvas + Step narrative */}
      <div className="p-5 sm:p-8">
        <div className="overflow-x-auto border border-border bg-ink-3 p-4 text-white sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-light">
              Step {current.code} · {ACTS[current.actIndex].title}
            </span>
            <span className="border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10.5px] text-white">
              {current.stateLabel}
            </span>
          </div>

          {current.actIndex === 0 ? (
            <TokenizationCanvas subIndex={current.subIndex} />
          ) : current.actIndex === 1 ? (
            <EmissionCanvas subIndex={current.subIndex} />
          ) : (
            <MintCanvas subIndex={current.subIndex} />
          )}
        </div>

        {/* Sub-steps inside current Act + Playback bar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actSteps.map((step) => {
              const globalIdx = STORY_STEPS.indexOf(step);
              const isCurrent = globalIdx === stepIndex;
              const isDone = globalIdx < stepIndex;
              return (
                <button
                  key={step.code}
                  type="button"
                  onClick={() => {
                    setStepIndex(globalIdx);
                    setUserPlaying(false);
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex flex-col justify-between border p-4 text-left transition-all",
                    isCurrent
                      ? "border-ink bg-background shadow-xs"
                      : isDone
                        ? "border-border bg-white"
                        : "border-border bg-white/60 opacity-75 hover:opacity-100",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-amber-700">
                        Step {step.code}
                      </span>
                      {isCurrent ? (
                        <span className="size-2 rounded-full bg-brand" />
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-ink">
                      {step.title}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous step"
              onClick={() => {
                setStepIndex(
                  (prev) =>
                    (prev - 1 + STORY_STEPS.length) % STORY_STEPS.length,
                );
                setUserPlaying(false);
              }}
              className="inline-flex size-9 items-center justify-center border border-border bg-background text-ink hover:bg-muted"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setUserPlaying(!wantsPlaying)}
              className="inline-flex h-9 items-center gap-2 border border-ink bg-ink px-4 font-mono text-xs text-white hover:bg-ink-2"
            >
              {wantsPlaying ? (
                <>
                  <Pause className="size-3.5" aria-hidden /> Pause
                </>
              ) : (
                <>
                  <Play className="size-3.5" aria-hidden /> Play all
                </>
              )}
            </button>
            <button
              type="button"
              aria-label="Next step"
              onClick={() => {
                setStepIndex((prev) => (prev + 1) % STORY_STEPS.length);
                setUserPlaying(false);
              }}
              className="inline-flex size-9 items-center justify-center border border-border bg-background text-ink hover:bg-muted"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Detailed explanation for active step */}
        <div
          aria-live={running ? "off" : "polite"}
          className="mt-5 block border-t border-border pt-5"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="shrink-0 font-mono text-xs font-medium text-amber-700">
              [{current.code} / {STORY_STEPS.length} steps]
            </span>
            <div>
              <h4 className="text-base font-semibold text-ink">
                {current.title}
              </h4>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {current.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function TokenizationCanvas({ subIndex }: { subIndex: number }) {
  const shareCells = Array.from({ length: 16 }, (_, idx) => idx);

  return (
    <svg
      viewBox="0 0 840 240"
      role="img"
      aria-label="Tokenization diagram: structuring real estate into digital shares and rules"
      className="mx-auto block h-auto min-w-[640px] w-full"
    >
      {/* Left: Real-world building card */}
      <rect
        x="24"
        y="34"
        width="200"
        height="172"
        rx="4"
        fill="#262435"
        stroke="#fbbf24"
        strokeWidth="1.75"
      />
      <text
        x="124"
        y="60"
        textAnchor="middle"
        className="fill-brand-light font-mono text-[9.5px]"
      >
        REAL-ESTATE ASSET
      </text>
      {/* Minimalist architectural facade */}
      <rect
        x="74"
        y="74"
        width="100"
        height="72"
        fill="#1f1d2b"
        stroke="rgba(255,255,255,0.35)"
      />
      {[88, 112, 136].map((wx) =>
        [86, 108, 128].map((wy) => (
          <rect
            key={`${wx}-${wy}`}
            x={wx}
            y={wy}
            width="14"
            height="10"
            fill="rgba(251,191,36,0.35)"
          />
        )),
      )}
      <text
        x="124"
        y="168"
        textAnchor="middle"
        className="fill-white font-sans text-[12px] font-semibold"
      >
        Valuation: €2,500,000
      </text>
      <text
        x="124"
        y="186"
        textAnchor="middle"
        className="fill-white/70 font-mono text-[10px]"
      >
        €100 per share
      </text>

      {/* Connector 1: Asset -> Share grid */}
      <line
        x1="224"
        y1="120"
        x2="306"
        y2="120"
        stroke="#f59e0b"
        strokeWidth="2.5"
        className="animate-dash-flow"
      />
      <text
        x="265"
        y="108"
        textAnchor="middle"
        className="fill-white/70 font-mono text-[9px]"
      >
        FRACTIONALIZE
      </text>

      {/* Middle: Fractional digital share matrix */}
      <rect
        x="306"
        y="34"
        width="216"
        height="172"
        rx="4"
        fill="#262435"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.5"
      />
      <text
        x="414"
        y="58"
        textAnchor="middle"
        className="fill-cyan-300 font-mono text-[9.5px]"
      >
        PROGRAMMABLE SHARES
      </text>
      {shareCells.map((cell) => {
        const col = cell % 4;
        const row = Math.floor(cell / 4);
        return (
          <rect
            key={cell}
            x={354 + col * 32}
            y={70 + row * 22}
            width="24"
            height="16"
            rx="2"
            fill={cell < 6 ? "#f59e0b" : "rgba(34,211,238,0.22)"}
            stroke={cell < 6 ? "#fbbf24" : "rgba(34,211,238,0.5)"}
          />
        );
      })}
      <text
        x="414"
        y="176"
        textAnchor="middle"
        className="fill-white font-sans text-[12px] font-semibold"
      >
        25,000 Total Shares
      </text>
      <text
        x="414"
        y="193"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9.5px]"
      >
        1 share = 1 × 10¹⁸ base units
      </text>

      {/* Connector 2: Share grid -> Rules */}
      <line
        x1="522"
        y1="120"
        x2="598"
        y2="120"
        stroke={subIndex >= 1 ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="2.5"
        className={subIndex >= 1 ? "animate-dash-flow" : undefined}
      />
      <text
        x="560"
        y="108"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9px]"
      >
        ATTACH RULES
      </text>

      {/* Right: Encoded rule cards */}
      {[
        {
          y: 36,
          active: subIndex >= 1,
          tag: "SUPPLY CAP",
          text: "Max 25,000 shares total",
        },
        {
          y: 96,
          active: subIndex >= 1,
          tag: "IDENTITY CAP",
          text: "Max 2,500 shares / OnchainID",
        },
        {
          y: 156,
          active: subIndex >= 2,
          tag: "KYC ELIGIBILITY",
          text: "Claim Topic 7 required",
        },
      ].map((rule) => (
        <g key={rule.tag}>
          <rect
            x="598"
            y={rule.y}
            width="218"
            height="48"
            rx="3"
            fill={rule.active ? "rgba(16,185,129,0.16)" : "#262435"}
            stroke={rule.active ? "#10b981" : "rgba(255,255,255,0.18)"}
            strokeWidth="1.5"
          />
          <text
            x="612"
            y={rule.y + 19}
            fill={rule.active ? "#6ee7b7" : "rgba(255,255,255,0.5)"}
            className="font-mono text-[9px]"
          >
            {rule.tag} {rule.active ? "· LOCKED" : "· PENDING"}
          </text>
          <text
            x="612"
            y={rule.y + 36}
            className={cn(
              "font-sans text-[11px] font-medium",
              rule.active ? "fill-white" : "fill-white/55",
            )}
          >
            {rule.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

function EmissionCanvas({ subIndex }: { subIndex: number }) {
  return (
    <svg
      viewBox="0 0 840 240"
      role="img"
      aria-label="Token emission diagram: deploying the ERC-3643 smart-contract suite via TREXFactory"
      className="mx-auto block h-auto min-w-[640px] w-full"
    >
      {/* Left: Tooken Backend + TREXFactory */}
      <rect
        x="20"
        y="44"
        width="176"
        height="66"
        rx="4"
        fill="#262435"
        stroke="rgba(255,255,255,0.28)"
      />
      <text
        x="108"
        y="68"
        textAnchor="middle"
        className="fill-brand-light font-mono text-[9px]"
      >
        OFF-CHAIN · PUBLISH
      </text>
      <text
        x="108"
        y="88"
        textAnchor="middle"
        className="fill-white font-sans text-[11.5px] font-semibold"
      >
        Tooken Go API
      </text>

      <line
        x1="108"
        y1="110"
        x2="108"
        y2="136"
        stroke="#f59e0b"
        strokeWidth="2.5"
        className="animate-dash-flow"
      />

      <rect
        x="20"
        y="136"
        width="176"
        height="68"
        rx="4"
        fill="rgba(245,158,11,0.16)"
        stroke="#f59e0b"
        strokeWidth="1.75"
      />
      <text
        x="108"
        y="159"
        textAnchor="middle"
        className="fill-brand-light font-mono text-[9px]"
      >
        ON-CHAIN FACTORY
      </text>
      <text
        x="108"
        y="178"
        textAnchor="middle"
        className="fill-white font-sans text-[12px] font-semibold"
      >
        TREXFactory
      </text>
      <text
        x="108"
        y="194"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9px]"
      >
        salt: &quot;re-42&quot;
      </text>

      {/* Factory -> Deployed Token Suite */}
      <line
        x1="196"
        y1="170"
        x2="278"
        y2="120"
        stroke="#f59e0b"
        strokeWidth="2.5"
        className="animate-dash-flow"
      />

      {/* Center: Newly deployed Property Token */}
      <rect
        x="278"
        y="52"
        width="230"
        height="140"
        rx="4"
        fill="#262435"
        stroke={subIndex >= 2 ? "#10b981" : "#22d3ee"}
        strokeWidth="2"
      />
      <text
        x="393"
        y="76"
        textAnchor="middle"
        className="fill-cyan-300 font-mono text-[9.5px]"
      >
        DEPLOYED ERC-3643 TOKEN
      </text>
      <text
        x="393"
        y="99"
        textAnchor="middle"
        className="fill-white font-sans text-[13px] font-semibold"
      >
        Property Token Contract
      </text>
      <rect
        x="302"
        y="114"
        width="182"
        height="34"
        rx="2"
        fill="#1f1d2b"
        stroke="rgba(255,255,255,0.18)"
      />
      <text
        x="393"
        y="135"
        textAnchor="middle"
        className="fill-brand-light font-mono text-[10.5px] font-medium"
      >
        Minted supply: 0 / 25,000
      </text>
      <text
        x="393"
        y="172"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9px]"
      >
        {subIndex >= 2
          ? "PUBLISHED → NEXT: FUNDRAISING"
          : "DEPLOYING SUITE CONTRACTS…"}
      </text>

      {/* Links to registries & modules on the right */}
      <line
        x1="508"
        y1="90"
        x2="582"
        y2="68"
        stroke={subIndex >= 1 ? "#22d3ee" : "rgba(255,255,255,0.2)"}
        strokeWidth="2"
        className={subIndex >= 1 ? "animate-dash-flow" : undefined}
      />
      <line
        x1="508"
        y1="152"
        x2="582"
        y2="168"
        stroke={subIndex >= 2 ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="2"
        className={subIndex >= 2 ? "animate-dash-flow" : undefined}
      />

      {/* Top right: Registries + Shared Storage */}
      <rect
        x="582"
        y="28"
        width="238"
        height="84"
        rx="4"
        fill={subIndex >= 1 ? "rgba(34,211,238,0.12)" : "#262435"}
        stroke={subIndex >= 1 ? "#22d3ee" : "rgba(255,255,255,0.2)"}
        strokeWidth="1.5"
      />
      <text x="596" y="49" className="fill-cyan-300 font-mono text-[9px]">
        IDENTITY &amp; CLAIM REGISTRIES
      </text>
      <text
        x="596"
        y="68"
        className="fill-white font-sans text-[11px] font-medium"
      >
        Shared IdentityRegistryStorage
      </text>
      <text x="596" y="86" className="fill-white/70 font-mono text-[9px]">
        Topic 7 + Trusted ClaimIssuer
      </text>
      <text x="596" y="102" className="fill-white/55 font-mono text-[8.5px]">
        Reuses verified investors across assets
      </text>

      {/* Bottom right: ModularCompliance */}
      <rect
        x="582"
        y="128"
        width="238"
        height="84"
        rx="4"
        fill={subIndex >= 2 ? "rgba(16,185,129,0.14)" : "#262435"}
        stroke={subIndex >= 2 ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="1.5"
      />
      <text
        x="596"
        y="149"
        fill={subIndex >= 2 ? "#6ee7b7" : "rgba(255,255,255,0.5)"}
        className="font-mono text-[9px]"
      >
        MODULAR COMPLIANCE BOUND
      </text>
      <text x="596" y="168" className="fill-white font-mono text-[9.5px]">
        • MaxBalanceModule (2,500)
      </text>
      <text x="596" y="184" className="fill-white font-mono text-[9.5px]">
        • SupplyLimitModule (25,000)
      </text>
      <text x="596" y="200" className="fill-white font-mono text-[9.5px]">
        • TransferRestrictModule
      </text>
    </svg>
  );
}

function MintCanvas({ subIndex }: { subIndex: number }) {
  const minted = subIndex >= 3;
  const checking = subIndex >= 2;
  const settled = subIndex >= 1;

  return (
    <svg
      viewBox="0 0 840 240"
      role="img"
      aria-label="Mint diagram: investor verification, fiat settlement, on-chain checks, and token minting"
      className="mx-auto block h-auto min-w-[640px] w-full"
    >
      {/* Stage 1: KYC & OnchainID */}
      <rect
        x="18"
        y="46"
        width="172"
        height="148"
        rx="4"
        fill="rgba(34,211,238,0.1)"
        stroke="#22d3ee"
        strokeWidth="1.5"
      />
      <text
        x="104"
        y="70"
        textAnchor="middle"
        className="fill-cyan-300 font-mono text-[9px]"
      >
        1 · ONCHAIN IDENTITY
      </text>
      <text
        x="104"
        y="94"
        textAnchor="middle"
        className="fill-white font-sans text-[11.5px] font-semibold"
      >
        Investor OnchainID
      </text>
      <text
        x="104"
        y="115"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9.5px]"
      >
        Topic 7 = &quot;OK&quot;
      </text>
      <text
        x="104"
        y="133"
        textAnchor="middle"
        className="fill-white/65 font-mono text-[9px]"
      >
        Signed by ClaimIssuer
      </text>
      <rect
        x="38"
        y="150"
        width="132"
        height="26"
        rx="2"
        fill="#1f1d2b"
        stroke="rgba(34,211,238,0.4)"
      />
      <text
        x="104"
        y="167"
        textAnchor="middle"
        className="fill-cyan-200 font-mono text-[9px]"
      >
        Country + Wallet Bound
      </text>

      {/* Connector 1 -> 2 */}
      <line
        x1="190"
        y1="120"
        x2="232"
        y2="120"
        stroke={settled ? "#f59e0b" : "rgba(255,255,255,0.2)"}
        strokeWidth="2.5"
        className={settled ? "animate-dash-flow" : undefined}
      />

      {/* Stage 2: Settled Order */}
      <rect
        x="232"
        y="46"
        width="168"
        height="148"
        rx="4"
        fill={settled ? "rgba(245,158,11,0.14)" : "#262435"}
        stroke={settled ? "#f59e0b" : "rgba(255,255,255,0.2)"}
        strokeWidth="1.5"
      />
      <text
        x="316"
        y="70"
        textAnchor="middle"
        fill={settled ? "#fbbf24" : "rgba(255,255,255,0.5)"}
        className="font-mono text-[9px]"
      >
        2 · ORDER &amp; FIAT
      </text>
      <text
        x="316"
        y="94"
        textAnchor="middle"
        className="fill-white font-sans text-[11.5px] font-semibold"
      >
        50 Shares Subscribed
      </text>
      <text
        x="316"
        y="115"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9.5px]"
      >
        €5,000 wire confirmed
      </text>
      <text
        x="316"
        y="135"
        textAnchor="middle"
        className="fill-white/60 font-mono text-[9px]"
      >
        Delivery service calls:
      </text>
      <rect
        x="250"
        y="150"
        width="132"
        height="26"
        rx="2"
        fill="#1f1d2b"
        stroke="rgba(255,255,255,0.2)"
      />
      <text
        x="316"
        y="167"
        textAnchor="middle"
        className="fill-brand-light font-mono text-[9px]"
      >
        mint(wallet, 50e18)
      </text>

      {/* Connector 2 -> 3 */}
      <line
        x1="400"
        y1="120"
        x2="442"
        y2="120"
        stroke={checking ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="2.5"
        className={checking ? "animate-dash-flow" : undefined}
      />

      {/* Stage 3: On-chain ERC-3643 Mint Gate */}
      <rect
        x="442"
        y="46"
        width="176"
        height="148"
        rx="4"
        fill={checking ? "rgba(16,185,129,0.14)" : "#262435"}
        stroke={checking ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="1.75"
      />
      <text
        x="530"
        y="70"
        textAnchor="middle"
        fill={checking ? "#6ee7b7" : "rgba(255,255,255,0.65)"}
        className="font-mono text-[9px]"
      >
        3 · ATOMIC MINT CHECK
      </text>
      <text
        x="530"
        y="94"
        textAnchor="middle"
        className="fill-white font-sans text-[11.5px] font-semibold"
      >
        ERC-3643 Token
      </text>
      <text
        x="530"
        y="116"
        textAnchor="middle"
        fill={checking ? "#6ee7b7" : "rgba(255,255,255,0.75)"}
        className="font-mono text-[9.5px]"
      >
        {checking ? "isVerified(wallet): TRUE" : "isVerified(wallet)"}
      </text>
      <text
        x="530"
        y="135"
        textAnchor="middle"
        fill={checking ? "#6ee7b7" : "rgba(255,255,255,0.75)"}
        className="font-mono text-[8.5px]"
      >
        {checking
          ? "canTransfer(0x0, to, qty): OK"
          : "canTransfer(0x0, to, qty)"}
      </text>
      <rect
        x="460"
        y="150"
        width="140"
        height="26"
        rx="2"
        fill="#1f1d2b"
        stroke="rgba(255,255,255,0.2)"
      />
      <text
        x="530"
        y="167"
        textAnchor="middle"
        className="fill-white/85 font-mono text-[9px]"
      >
        From 0x0 → Investor
      </text>

      {/* Connector 3 -> 4 */}
      <line
        x1="618"
        y1="120"
        x2="660"
        y2="120"
        stroke={minted ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="2.5"
        className={minted ? "animate-dash-flow" : undefined}
      />

      {/* Stage 4: Investor Wallet Credited */}
      <rect
        x="660"
        y="46"
        width="162"
        height="148"
        rx="4"
        fill={minted ? "rgba(16,185,129,0.2)" : "#262435"}
        stroke={minted ? "#10b981" : "rgba(255,255,255,0.2)"}
        strokeWidth="2"
      />
      <text
        x="741"
        y="70"
        textAnchor="middle"
        fill={minted ? "#6ee7b7" : "rgba(255,255,255,0.5)"}
        className="font-mono text-[9px]"
      >
        4 · WALLET BALANCE
      </text>
      <text
        x="741"
        y="102"
        textAnchor="middle"
        className="fill-white font-sans text-[20px] font-semibold"
      >
        {minted ? "+50 Shares" : "0 Shares"}
      </text>
      <text
        x="741"
        y="124"
        textAnchor="middle"
        className="fill-white/75 font-mono text-[9.5px]"
      >
        {minted ? "Supply: 50 / 25,000" : "Supply: 0 / 25,000"}
      </text>
      <rect
        x="676"
        y="150"
        width="130"
        height="26"
        rx="2"
        fill={minted ? "rgba(16,185,129,0.25)" : "#1f1d2b"}
        stroke={minted ? "#10b981" : "rgba(255,255,255,0.18)"}
      />
      <text
        x="741"
        y="167"
        textAnchor="middle"
        fill={minted ? "#a7f3d0" : "rgba(255,255,255,0.5)"}
        className="font-mono text-[8.5px]"
      >
        {minted ? "Transfer Event Verified" : "Awaiting Mint Receipt"}
      </text>
    </svg>
  );
}
