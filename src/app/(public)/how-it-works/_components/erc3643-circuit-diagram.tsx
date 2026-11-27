"use client";

import { CheckCircle2, Pause, Play, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramMotion } from "./use-diagram-motion";

type ScenarioId = "eligible" | "unverified" | "cap_exceeded";

interface ContractSpec {
  id: string;
  name: string;
  question: string;
  scope: "Per property" | "Shared across platform" | "Per investor";
  role: string;
}

const CONTRACTS: ContractSpec[] = [
  {
    id: "token",
    name: "ERC-3643 Property Token",
    question: "Who owns how many shares?",
    scope: "Per property",
    role: "Holds share balances for one offering (salt re-<id>). Before any mint or transfer, it queries IdentityRegistry and ModularCompliance.",
  },
  {
    id: "ir",
    name: "IdentityRegistry",
    question: "Is this wallet a verified investor?",
    scope: "Per property",
    role: "Checks that the recipient wallet is registered and that its OnchainID carries every required claim signed by a trusted issuer.",
  },
  {
    id: "irs",
    name: "IdentityRegistryStorage",
    question: "Which OnchainID & country belong to this wallet?",
    scope: "Shared across platform",
    role: "Stores the wallet → OnchainID link and numeric ISO country code across all Tooken property suites so a KYC-approved investor is registered once.",
  },
  {
    id: "ctr",
    name: "ClaimTopicsRegistry",
    question: "Which verification claims are required?",
    scope: "Per property",
    role: "Defines which claim topics an investor must hold for this asset. Tooken configures Claim Topic 7 (KYC eligibility).",
  },
  {
    id: "tir",
    name: "TrustedIssuersRegistry",
    question: "Whose cryptographic signature do we trust?",
    scope: "Per property",
    role: "Lists authorized ClaimIssuer contracts whose signatures are accepted for Topic 7 — preventing forged self-signed claims.",
  },
  {
    id: "onchainid",
    name: "Investor OnchainID",
    question: "Does the investor hold a valid signed claim?",
    scope: "Per investor",
    role: "Smart-contract identity proxy tied to the investor's wallet. Stores the cryptographic Topic 7 claim signed by Tooken's ClaimIssuer.",
  },
  {
    id: "compliance",
    name: "ModularCompliance",
    question: "Does this order respect offering caps & transfer rules?",
    scope: "Per property",
    role: "Runs three bound modules: MaxBalanceModule (cap per investor OnchainID), SupplyLimitModule (total supply), and TransferRestrictModule (allows primary mints from 0x0; restricts wallet-to-wallet transfers unless allowlisted).",
  },
];

const SCENARIOS: Record<
  ScenarioId,
  {
    label: string;
    shortBadge: string;
    identityPass: boolean;
    compliancePass: boolean;
    summary: string;
    detail: string;
  }
> = {
  eligible: {
    label: "Verified investor · primary mint",
    shortBadge: "PRIMARY MINT APPROVED",
    identityPass: true,
    compliancePass: true,
    summary: "Both on-chain gatekeepers approve the primary mint.",
    detail:
      "IdentityRegistry confirms the wallet's OnchainID holds a Topic 7 claim signed by Tooken's ClaimIssuer, and ModularCompliance confirms supply/identity caps pass while TransferRestrictModule permits minting from 0x0.",
  },
  unverified: {
    label: "Wallet without KYC claim",
    shortBadge: "REVERTED BY IDENTITY REGISTRY",
    identityPass: false,
    compliancePass: false,
    summary: "Stopped at Gate 1: recipient wallet is not verified.",
    detail:
      "IdentityRegistry inspects ClaimTopicsRegistry (Topic 7) and TrustedIssuersRegistry, finds no valid claim for the wallet, and reverts the transaction immediately.",
  },
  cap_exceeded: {
    label: "Verified investor · above max cap",
    shortBadge: "REVERTED BY MODULAR COMPLIANCE",
    identityPass: true,
    compliancePass: false,
    summary: "Identity passes Gate 1, but Gate 2 blocks the allocation.",
    detail:
      "Even though the investor is KYC-verified, MaxBalanceModule or SupplyLimitModule detects that the requested shares exceed the offering's configured cap and reverts the call.",
  },
};

export function Erc3643CircuitDiagram() {
  const { reducedMotion } = useDiagramMotion();
  const [scenario, setScenario] = useState<ScenarioId>("eligible");
  const [selectedContractId, setSelectedContractId] = useState<string>("token");
  const [userAnimate, setUserAnimate] = useState<boolean | null>(null);

  const animating = userAnimate ?? !reducedMotion;
  const currentScenario = SCENARIOS[scenario];
  const selectedContract =
    CONTRACTS.find((c) => c.id === selectedContractId) ?? CONTRACTS[0];

  const gate1Color = currentScenario.identityPass ? "#10b981" : "#ef4444";
  const gate2Color = !currentScenario.identityPass
    ? "#9ca3af"
    : currentScenario.compliancePass
      ? "#10b981"
      : "#ef4444";
  const finalColor =
    currentScenario.identityPass && currentScenario.compliancePass
      ? "#10b981"
      : "#ef4444";

  return (
    <div
      className={cn(
        "border border-border bg-white p-5 sm:p-8",
        !animating && "motion-paused",
        userAnimate === true && "motion-opt-in",
      )}
    >
      {/* Scenario selector */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber-700">
            Interactive smart-contract circuit · T-REX standard
          </p>
          <h3 className="mt-2 font-editorial text-2xl font-normal tracking-tight text-ink sm:text-3xl">
            How ERC-3643 validates every single share movement.
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <fieldset
            aria-label="Simulate on-chain ERC-3643 transaction scenario"
            className="flex flex-wrap gap-2"
          >
            <legend className="sr-only">
              Simulate on-chain ERC-3643 transaction scenario
            </legend>
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => {
              const item = SCENARIOS[key];
              const active = scenario === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScenario(key)}
                  className={cn(
                    "border px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-background text-muted-foreground hover:border-ink/40 hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
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

      {/* Main animated SVG circuit */}
      <div className="mt-6 overflow-x-auto border border-border bg-ink p-4 text-white sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-[11px] text-white/75">
            Highlighted contract: {selectedContract.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-medium",
              currentScenario.identityPass && currentScenario.compliancePass
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                : "border-red-400/40 bg-red-500/20 text-red-300",
            )}
          >
            {currentScenario.identityPass && currentScenario.compliancePass ? (
              <CheckCircle2 className="size-3" aria-hidden />
            ) : (
              <XCircle className="size-3" aria-hidden />
            )}
            {currentScenario.shortBadge}
          </span>
        </div>

        <svg
          viewBox="0 0 880 340"
          role="img"
          aria-label={`ERC-3643 contract circuit: ${currentScenario.summary}`}
          className="mx-auto block h-auto min-w-[680px] w-full"
        >
          {/* Connection: Caller -> Property Token */}
          <line
            x1="120"
            y1="170"
            x2="190"
            y2="170"
            stroke="#f59e0b"
            strokeWidth="2.5"
            className="animate-dash-flow"
          />

          {/* Connection: Property Token -> Gate 1 (IdentityRegistry) */}
          <path
            d="M 350 145 L 395 90 L 430 90"
            fill="none"
            stroke={gate1Color}
            strokeWidth="2.5"
            className="animate-dash-flow"
          />

          {/* Connections from IdentityRegistry to its 4 registries/identities */}
          <line
            x1="590"
            y1="65"
            x2="636"
            y2="42"
            stroke={gate1Color}
            strokeWidth="1.75"
            className="animate-dash-flow"
          />
          <line
            x1="590"
            y1="82"
            x2="636"
            y2="92"
            stroke={gate1Color}
            strokeWidth="1.75"
            className="animate-dash-flow"
          />
          <line
            x1="590"
            y1="98"
            x2="636"
            y2="142"
            stroke={gate1Color}
            strokeWidth="1.75"
            className="animate-dash-flow"
          />
          <line
            x1="590"
            y1="114"
            x2="636"
            y2="192"
            stroke={gate1Color}
            strokeWidth="1.75"
            className="animate-dash-flow"
          />

          {/* Connection: Property Token -> Gate 2 (ModularCompliance) */}
          <path
            d="M 350 195 L 395 255 L 430 255"
            fill="none"
            stroke={gate2Color}
            strokeWidth="2.5"
            className={
              currentScenario.identityPass ? "animate-dash-flow" : undefined
            }
          />

          {/* Connection: ModularCompliance -> Modules */}
          <line
            x1="590"
            y1="255"
            x2="636"
            y2="255"
            stroke={gate2Color}
            strokeWidth="1.75"
            className={
              currentScenario.identityPass ? "animate-dash-flow" : undefined
            }
          />

          {/* Caller box */}
          <g>
            <rect
              x="16"
              y="140"
              width="104"
              height="60"
              rx="3"
              fill="#262435"
              stroke="rgba(255,255,255,0.25)"
            />
            <text
              x="68"
              y="165"
              textAnchor="middle"
              className="fill-brand-light font-mono text-[9.5px]"
            >
              TX CALL
            </text>
            <text
              x="68"
              y="183"
              textAnchor="middle"
              className="fill-white font-mono text-[10px]"
            >
              mint / transfer
            </text>
          </g>

          {/* Central Hub: Property Token */}
          <g>
            <rect
              x="190"
              y="124"
              width="160"
              height="92"
              rx="4"
              fill={selectedContractId === "token" ? "#35324a" : "#262435"}
              stroke={selectedContractId === "token" ? "#fbbf24" : finalColor}
              strokeWidth="2"
            />
            <text
              x="270"
              y="148"
              textAnchor="middle"
              className="fill-brand-light font-mono text-[9px]"
            >
              CORE CONTRACT
            </text>
            <text
              x="270"
              y="168"
              textAnchor="middle"
              className="fill-white font-sans text-[12px] font-semibold"
            >
              Property Token
            </text>
            <text
              x="270"
              y="185"
              textAnchor="middle"
              className="fill-white/75 font-mono text-[9.5px]"
            >
              ERC-3643 · salt re-&lt;id&gt;
            </text>
            <text
              x="270"
              y="204"
              textAnchor="middle"
              fill={finalColor}
              className="font-mono text-[9px] font-medium"
            >
              {currentScenario.identityPass && currentScenario.compliancePass
                ? "BALANCE UPDATED"
                : "TX REVERTED"}
            </text>
          </g>

          {/* Gate 1: IdentityRegistry */}
          <g>
            <rect
              x="430"
              y="52"
              width="160"
              height="76"
              rx="4"
              fill={selectedContractId === "ir" ? "#35324a" : "#262435"}
              stroke={selectedContractId === "ir" ? "#fbbf24" : gate1Color}
              strokeWidth="2"
            />
            <text
              x="510"
              y="73"
              textAnchor="middle"
              fill={gate1Color}
              className="font-mono text-[9px]"
            >
              GATE 1 · {currentScenario.identityPass ? "VERIFIED" : "REJECTED"}
            </text>
            <text
              x="510"
              y="93"
              textAnchor="middle"
              className="fill-white font-sans text-[12px] font-semibold"
            >
              IdentityRegistry
            </text>
            <text
              x="510"
              y="111"
              textAnchor="middle"
              className="fill-white/75 font-mono text-[9px]"
            >
              isVerified(recipient)
            </text>
          </g>

          {/* Right stack: 4 Identity leaf contracts */}
          {[
            {
              id: "irs",
              y: 18,
              title: "IdentityRegistryStorage",
              sub: "Wallet → OnchainID + ISO country",
            },
            {
              id: "ctr",
              y: 68,
              title: "ClaimTopicsRegistry",
              sub: "Requires Claim Topic 7 (KYC)",
            },
            {
              id: "tir",
              y: 118,
              title: "TrustedIssuersRegistry",
              sub: "Trusts Tooken ClaimIssuer",
            },
            {
              id: "onchainid",
              y: 168,
              title: "Investor OnchainID",
              sub: currentScenario.identityPass
                ? 'Signed Topic 7 = "OK"'
                : "Missing Topic 7 claim",
            },
          ].map((leaf) => {
            const isSelected = selectedContractId === leaf.id;
            const isFailingLeaf =
              leaf.id === "onchainid" && !currentScenario.identityPass;
            return (
              <g key={leaf.id}>
                <rect
                  x="636"
                  y={leaf.y}
                  width="228"
                  height="42"
                  rx="3"
                  fill={isSelected ? "#35324a" : "#1f1d2b"}
                  stroke={
                    isSelected
                      ? "#fbbf24"
                      : isFailingLeaf
                        ? "#ef4444"
                        : "rgba(255,255,255,0.22)"
                  }
                  strokeWidth={isSelected || isFailingLeaf ? "1.75" : "1"}
                />
                <text
                  x="648"
                  y={leaf.y + 18}
                  className="fill-white font-sans text-[10.5px] font-medium"
                >
                  {leaf.title}
                </text>
                <text
                  x="648"
                  y={leaf.y + 33}
                  fill={isFailingLeaf ? "#fca5a5" : "rgba(255,255,255,0.75)"}
                  className="font-mono text-[8.5px]"
                >
                  {leaf.sub}
                </text>
              </g>
            );
          })}

          {/* Gate 2: ModularCompliance */}
          <g>
            <rect
              x="430"
              y="218"
              width="160"
              height="76"
              rx="4"
              fill={selectedContractId === "compliance" ? "#35324a" : "#262435"}
              stroke={
                selectedContractId === "compliance" ? "#fbbf24" : gate2Color
              }
              strokeWidth="2"
            />
            <text
              x="510"
              y="239"
              textAnchor="middle"
              fill={gate2Color}
              className="font-mono text-[9px]"
            >
              GATE 2 ·{" "}
              {!currentScenario.identityPass
                ? "NOT REACHED"
                : currentScenario.compliancePass
                  ? "CAPS OK"
                  : "CAP EXCEEDED"}
            </text>
            <text
              x="510"
              y="259"
              textAnchor="middle"
              className="fill-white font-sans text-[12px] font-semibold"
            >
              ModularCompliance
            </text>
            <text
              x="510"
              y="277"
              textAnchor="middle"
              className="fill-white/75 font-mono text-[9px]"
            >
              canTransfer(from, to, value)
            </text>
          </g>

          {/* Compliance modules box */}
          <g>
            <rect
              x="636"
              y="222"
              width="228"
              height="98"
              rx="3"
              fill={selectedContractId === "compliance" ? "#35324a" : "#1f1d2b"}
              stroke={
                scenario === "cap_exceeded"
                  ? "#ef4444"
                  : selectedContractId === "compliance"
                    ? "#fbbf24"
                    : "rgba(255,255,255,0.22)"
              }
              strokeWidth="1.5"
            />
            <text
              x="648"
              y="242"
              className="fill-brand-light font-mono text-[9px]"
            >
              BOUND COMPLIANCE MODULES
            </text>
            <text x="648" y="262" className="fill-white font-mono text-[9px]">
              1. MaxBalanceModule (identity cap)
            </text>
            <text x="648" y="281" className="fill-white font-mono text-[9px]">
              2. SupplyLimitModule (total supply)
            </text>
            <text x="648" y="300" className="fill-white font-mono text-[9px]">
              3. TransferRestrictModule
            </text>
          </g>
        </svg>
      </div>

      {/* Inspector + Scenario explanation */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border border-border bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-700">
              Inspect contract in circuit
            </span>
            <span className="border border-border bg-white px-2 py-0.5 font-mono text-[10px] text-ink">
              {selectedContract.scope}
            </span>
          </div>
          <h4 className="mt-2 text-base font-semibold text-ink">
            {selectedContract.name}
          </h4>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Plain question: &ldquo;{selectedContract.question}&rdquo;
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {selectedContract.role}
          </p>
          <fieldset
            aria-label="Inspect contract in the ERC-3643 circuit"
            className="mt-4 flex flex-wrap gap-1.5"
          >
            <legend className="sr-only">
              Inspect contract in the ERC-3643 circuit
            </legend>
            {CONTRACTS.map((contract) => {
              const isContractSelected = selectedContractId === contract.id;
              return (
                <button
                  key={contract.id}
                  type="button"
                  aria-pressed={isContractSelected}
                  onClick={() => setSelectedContractId(contract.id)}
                  className={cn(
                    "px-2.5 py-1 font-mono text-[10px] transition-colors",
                    isContractSelected
                      ? "bg-ink text-white"
                      : "border border-border bg-white text-muted-foreground hover:text-ink",
                  )}
                >
                  {contract.name.replace("ERC-3643 ", "")}
                </button>
              );
            })}
          </fieldset>
        </div>

        <output className="flex flex-col justify-between border border-border bg-background p-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={cn(
                  "size-4",
                  currentScenario.identityPass && currentScenario.compliancePass
                    ? "text-emerald-600"
                    : "text-red-600",
                )}
                aria-hidden
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Scenario outcome
              </span>
            </div>
            <h4 className="mt-2 text-base font-semibold text-ink">
              {currentScenario.summary}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {currentScenario.detail}
            </p>
          </div>
          <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
            Shared advantage: IdentityRegistryStorage lets one approved KYC
            unlock every compatible Tooken property offering.
          </p>
        </output>
      </div>
    </div>
  );
}
