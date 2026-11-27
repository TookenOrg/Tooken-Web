"use client";

import { Building2, Cpu, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramMotion } from "./use-diagram-motion";

const STAGES = [
  {
    id: "asset",
    step: "01",
    badge: "Real-world origin",
    title: "Real-estate offering",
    subtitle: "Structured by the issuer",
    icon: Building2,
    metrics: ["Valuation & share price", "Total supply & per-investor cap"],
    caption:
      "An issuer defines a property offering, splits its economic value into exact digital shares, and sets investor eligibility caps.",
  },
  {
    id: "platform",
    step: "02",
    badge: "Off-chain · Tooken",
    title: "Tooken platform & API",
    subtitle: "Go backend · PostgreSQL",
    icon: Cpu,
    metrics: ["KYC review & privacy", "Order book & fiat settlement"],
    caption:
      "Tooken reviews investor KYC privately off-chain, manages share reservations and bank settlement, and orchestrates blockchain transactions.",
  },
  {
    id: "onchain",
    step: "03",
    badge: "On-chain · ERC-3643",
    title: "Permissioned smart contracts",
    subtitle: "EVM · T-REX suite",
    icon: ShieldCheck,
    metrics: ["OnchainID Topic 7 check", "Enforced token balances"],
    caption:
      "Dedicated ERC-3643 smart contracts verify cryptographic KYC claims and supply caps before minting or transferring any share.",
  },
] as const;

const CYCLE_MS = 3800;

export function HeroBridgeDiagram() {
  const { reducedMotion, visible } = useDiagramMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const wantsMotion = userPlaying ?? !reducedMotion;
  const running = wantsMotion && visible && !interactionPaused;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STAGES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const activeStage = STAGES[activeIndex] ?? STAGES[0];

  return (
    <figure
      aria-label="Tooken end-to-end overview diagram"
      className={cn(
        "border border-border bg-white p-5 sm:p-7",
        !wantsMotion && "motion-paused",
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-pulse-ring" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
            Architecture at a glance
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            Select any layer to inspect
          </span>
          <button
            type="button"
            onClick={() => setUserPlaying(!wantsMotion)}
            className="border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-ink hover:bg-muted"
          >
            {wantsMotion ? "Pause animation" : "Play animation"}
          </button>
        </div>
      </div>

      {/* Desktop animated SVG flow rail */}
      <div className="relative mt-6">
        <svg
          aria-hidden="true"
          viewBox="0 0 900 36"
          className="mb-3 hidden h-8 w-full lg:block"
        >
          {/* Base rail */}
          <line
            x1="150"
            y1="18"
            x2="750"
            y2="18"
            stroke="#e5e5e2"
            strokeWidth="2"
          />
          {/* Animated segment 1 -> 2 */}
          <line
            x1="150"
            y1="18"
            x2="450"
            y2="18"
            stroke={activeIndex >= 1 ? "#f59e0b" : "#06b6d4"}
            strokeWidth="2.5"
            className="animate-dash-flow"
          />
          {/* Animated segment 2 -> 3 */}
          <line
            x1="450"
            y1="18"
            x2="750"
            y2="18"
            stroke={activeIndex === 2 ? "#10b981" : "#2d2b3d"}
            strokeWidth="2.5"
            className="animate-dash-flow"
          />
          {[150, 450, 750].map((cx, index) => {
            const isCurrent = index === activeIndex;
            return (
              <g key={cx}>
                {isCurrent ? (
                  <circle
                    cx={cx}
                    cy="18"
                    r="12"
                    fill={
                      index === 2
                        ? "rgba(16, 185, 129, 0.18)"
                        : "rgba(245, 158, 11, 0.22)"
                    }
                  />
                ) : null}
                <circle
                  cx={cx}
                  cy="18"
                  r="6"
                  fill={
                    isCurrent
                      ? index === 2
                        ? "#10b981"
                        : "#f59e0b"
                      : "#2d2b3d"
                  }
                />
              </g>
            );
          })}
          <text
            x="300"
            y="11"
            textAnchor="middle"
            fill="#57534e"
            className="font-mono text-[10px]"
          >
            ORIGINATE &amp; VERIFY
          </text>
          <text
            x="600"
            y="11"
            textAnchor="middle"
            fill="#57534e"
            className="font-mono text-[10px]"
          >
            DEPLOY, CHECK &amp; MINT
          </text>
        </svg>

        <div className="grid gap-4 lg:grid-cols-3">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setUserPlaying(false);
                }}
                aria-pressed={isActive}
                className={cn(
                  "group relative flex flex-col justify-between border p-5 text-left transition-all",
                  isActive
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-border bg-background text-ink hover:border-ink/40",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                        isActive
                          ? "bg-brand text-brand-foreground"
                          : "bg-white text-muted-foreground border border-border",
                      )}
                    >
                      {stage.badge}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        isActive ? "text-brand-light" : "text-muted-foreground",
                      )}
                    >
                      {stage.step}
                    </span>
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center border",
                        isActive
                          ? "border-white/20 bg-white/10 text-brand-light"
                          : "border-border bg-white text-ink",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-base font-medium",
                          isActive ? "text-white" : "text-ink",
                        )}
                      >
                        {stage.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-0.5 font-mono text-[11px]",
                          isActive ? "text-white/70" : "text-muted-foreground",
                        )}
                      >
                        {stage.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <ul
                  className={cn(
                    "mt-5 space-y-1.5 border-t pt-3.5 text-xs",
                    isActive
                      ? "border-white/15 text-white/85"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {stage.metrics.map((metric) => (
                    <li key={metric} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          isActive ? "bg-brand-light" : "bg-ink/40",
                        )}
                        aria-hidden
                      />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      <figcaption
        aria-live={running ? "off" : "polite"}
        className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm leading-relaxed text-ink">
          <span className="mr-2 font-mono text-xs font-medium text-amber-700">
            [{activeStage.step}]
          </span>
          {activeStage.caption}
        </p>
      </figcaption>
    </figure>
  );
}
