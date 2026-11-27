import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Erc3643CircuitDiagram } from "./_components/erc3643-circuit-diagram";
import { HeroBridgeDiagram } from "./_components/hero-bridge-diagram";
import { LifecycleStoryboard } from "./_components/lifecycle-storyboard";
import { OnchainBoundaryDiagram } from "./_components/onchain-boundary-diagram";
import { WhyTookenComparison } from "./_components/why-tooken-comparison";

export const metadata: Metadata = {
  title: "How Tooken Works",
  description:
    "Understand Tooken in minutes through interactive animated diagrams: why regulated RWA tokenization matters, what lives on-chain vs off-chain, how ERC-3643 works, and how tokenization, emission, and minting operate.",
};

const VALUE_PILLARS = [
  {
    number: "01",
    title: "Compliance lives inside the token",
    description:
      "With a standard crypto token, rules stop at the website — once withdrawn, anyone can send it anywhere. With Tooken's ERC-3643 tokens, every mint and transfer verifies identity claims and supply caps directly inside the smart contract.",
  },
  {
    number: "02",
    title: "Verify once, invest across offerings",
    description:
      "Each property gets its own isolated token contract and caps, while sharing Tooken's IdentityRegistryStorage. Once an investor's KYC is approved and linked to their OnchainID, future offerings recognize them automatically.",
  },
  {
    number: "03",
    title: "Zero blockchain friction for users",
    description:
      "Issuers configure properties, review KYC, and confirm bank wires from a clean back office. Investors subscribe in fiat currency while Tooken's Go backend orchestrates wallet creation, claim signing, contract deployment, and share delivery.",
  },
] as const;

const JUMP_LINKS = [
  { code: "01", label: "Why Tooken", href: "#why-tooken" },
  { code: "02", label: "Off-chain vs On-chain", href: "#onchain-boundary" },
  { code: "03", label: "Inside ERC-3643", href: "#erc-3643" },
  { code: "04", label: "Tokenization, emission & mint", href: "#lifecycle" },
] as const;

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero + Instant 3-Layer Visual Overview */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 pt-10 pb-14 sm:px-8 lg:pt-16 lg:pb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-700">
            Interactive Visual Guide · ERC-3643 Infrastructure
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
            <h1 className="font-editorial text-[clamp(2.75rem,5.6vw,4.75rem)] leading-[1.02] font-normal tracking-[-0.04em] text-ink">
              From a real building to{" "}
              <em className="font-normal">verified on-chain shares.</em>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Tooken turns real-estate offerings into permissioned digital
              shares. Private KYC and fiat payments stay off-chain; investor
              eligibility, holding caps, and share balances are enforced
              on-chain by ERC-3643 smart contracts.
            </p>
          </div>

          {/* Section jump bar */}
          <nav
            aria-label="Guide sections"
            className="mt-10 grid grid-cols-1 divide-y divide-border border border-border bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
          >
            {JUMP_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-3 px-4 py-3.5 text-sm text-ink transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-amber-700">
                    {item.code}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </span>
                <ArrowDown
                  className="size-3.5 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-ink"
                  aria-hidden
                />
              </a>
            ))}
          </nav>

          <div className="mt-8">
            <HeroBridgeDiagram />
          </div>
        </div>
      </section>

      {/* 01 — Why Tooken is interesting */}
      <section
        id="why-tooken"
        className="scroll-mt-24 border-b border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              01 — Why Tooken matters
            </p>
            <h2 className="mt-3 font-editorial text-4xl leading-[1.08] font-normal tracking-tight text-ink sm:text-5xl">
              Built for regulated assets, not anonymous speculation.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Real-world securities cannot circulate freely between unknown
              wallets. Tooken combines traditional investor onboarding with
              programmable on-chain rules so digital shares stay compliant over
              their entire lifecycle.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUE_PILLARS.map((pillar) => (
              <div
                key={pillar.number}
                className="border border-border bg-white p-6"
              >
                <span className="font-mono text-xs text-amber-700">
                  {pillar.number}
                </span>
                <h3 className="mt-3 text-lg font-medium text-ink">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <WhyTookenComparison />
          </div>
        </div>
      </section>

      {/* 02 — Off-chain vs On-chain boundary */}
      <section
        id="onchain-boundary"
        className="scroll-mt-24 border-b border-border bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                02 — What is on-chain (and what stays private)
              </p>
              <h2 className="mt-3 font-editorial text-4xl leading-[1.08] font-normal tracking-tight text-ink sm:text-5xl">
                Two layers, each doing what it does best.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Putting personal passports on a public blockchain would violate
              privacy; keeping share balances only in a private database would
              give up programmable enforcement. Tooken separates both cleanly
              and synchronizes them across four verifiable bridges.
            </p>
          </div>

          <div className="mt-10">
            <OnchainBoundaryDiagram />
          </div>
        </div>
      </section>

      {/* 03 — Inside ERC-3643 */}
      <section
        id="erc-3643"
        className="scroll-mt-24 border-b border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                03 — Inside the ERC-3643 (T-REX) engine
              </p>
              <h2 className="mt-3 font-editorial text-4xl leading-[1.08] font-normal tracking-tight text-ink sm:text-5xl">
                Two on-chain gatekeepers on every transaction.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Whenever shares are minted or transferred, the property&apos;s
              ERC-3643 Token contract consults two smart-contract gatekeepers:
              <strong className="font-medium text-ink">
                {" "}
                IdentityRegistry
              </strong>{" "}
              (is the recipient KYC-approved?) and{" "}
              <strong className="font-medium text-ink">
                ModularCompliance
              </strong>{" "}
              (does the order respect supply and holding limits?).
            </p>
          </div>

          <div className="mt-10">
            <Erc3643CircuitDiagram />
          </div>
        </div>
      </section>

      {/* 04 — Tokenization, Token Emission & Mint */}
      <section
        id="lifecycle"
        className="scroll-mt-24 border-b border-border bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                04 — End-to-end token lifecycle
              </p>
              <h2 className="mt-3 font-editorial text-4xl leading-[1.08] font-normal tracking-tight text-ink sm:text-5xl">
                Tokenization, token emission, and the mint.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Creating a regulated token happens in three distinct acts: first{" "}
              <strong className="font-medium text-ink">tokenization</strong>{" "}
              structures the asset and its caps, then{" "}
              <strong className="font-medium text-ink">token emission</strong>{" "}
              deploys the smart-contract suite on-chain with zero initial
              supply, and finally{" "}
              <strong className="font-medium text-ink">minting</strong> creates
              and delivers shares to verified investors once payment settles.
            </p>
          </div>

          <div className="mt-10">
            <LifecycleStoryboard />
          </div>
        </div>
      </section>

      {/* Legal / MVP clarity note + Next-step CTAs */}
      <section className="border-b border-border bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-light">
              Scope &amp; engineering reality
            </p>
            <h2 className="mt-3 font-editorial text-3xl font-normal tracking-tight text-white sm:text-4xl">
              Technical enforcement vs legal ownership.
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-white/75">
            <p>
              ERC-3643 enforces technical eligibility and transfer rules
              on-chain and records wallet token balances. In regulated markets,
              investor rights and property claims are governed by the issuing
              vehicle and its legal offering documentation.
            </p>
            <p>
              In this independent technical MVP, the Go API, PostgreSQL order
              lifecycle, OnchainID claim synchronization, TREXFactory
              deployment, and ERC-3643 minting run end to end on a test EVM
              network — while all listed properties and bank settlements remain
              strictly illustrative.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center lg:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Ready to see it live?
          </p>
          <h2 className="mt-3 font-editorial text-4xl font-normal tracking-tight text-ink sm:text-5xl">
            Browse the tokenized offerings.
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="lg" className="h-12 px-6">
            <Link href="/project">
              About the MVP <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" className="h-12 px-6">
            <Link href="/explore">
              Explore the marketplace <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
