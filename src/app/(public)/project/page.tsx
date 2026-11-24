import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About the MVP",
  description:
    "What Tooken is, how this ERC-3643 real-world asset tokenization MVP works, and about its creator Antony LEFEVRE.",
};

const PILLARS = [
  {
    title: "Origination & ERC-3643 deployment",
    text: "Issuers and asset managers structure real-estate offerings, configure valuation and share supply, deploy dedicated ERC-3643 (T-REX) token suites on-chain, and open fundraising.",
  },
  {
    title: "Identity verification & OnchainID eligibility",
    text: "Investors submit KYC dossiers reviewed in the compliance back office. Approved identities and claim topics are synchronized on-chain so transfer rules are enforced directly by smart contracts.",
  },
  {
    title: "Subscription, settlement & delivery",
    text: "Verified investors subscribe with exact decimal fee calculation and timed share reservations. Once payment is confirmed by the back office, tokens are minted and delivered on-chain.",
  },
  {
    title: "Engineered for financial precision",
    text: "Powered by a Go REST API (Gin, PostgreSQL, go-ethereum) paired with a Next.js and TypeScript front end using exact BigInt decimal arithmetic and a typed OpenAPI contract.",
  },
];

const REAL_SCOPE = [
  "Authentication, JWT session rotation and role-based workspaces across Investor, Asset Manager and Administrator roles.",
  "End-to-end KYC submission, compliance review and on-chain identity and claim synchronization.",
  "ERC-3643 smart-contract initialization, token deployment, eligibility checks and on-chain share delivery on an Ethereum test or sandbox network.",
  "Order book management, timed reservation locks, fiat settlement confirmation and live portfolio tracking.",
];

const ILLUSTRATIVE_SCOPE = [
  "Listed properties, issuers, valuations, yields and offering documents are fictional examples created for demonstration.",
  "Bank wire instructions, IBANs and payment confirmations simulate off-chain settlement rails — never transfer real funds.",
  "Tokens exist on a test or local EVM environment and confer no legal claim, property right or financial return.",
  "Tooken is an engineering showcase, not a licensed investment firm, crowdfunding service provider or financial advisor.",
];

const AUTHOR_STACK = [
  [
    "Core backend",
    "Go (Golang), Java / Quarkus, REST APIs, Microservices, Event-driven systems",
  ],
  [
    "Data & infrastructure",
    "PostgreSQL, Kafka, Redis, Elasticsearch, Docker, Kubernetes, Microsoft Azure",
  ],
  [
    "On-chain & fintech",
    "Solidity, Ethereum / EVM, ERC-3643 (T-REX), OnchainID, KYC/AML & order lifecycle",
  ],
  [
    "Front end & quality",
    "Next.js, React, TypeScript, Tailwind CSS, automated testing, SonarQube",
  ],
] as const;

export default function ProjectPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:pt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-700">
            MVP · Architecture &amp; Authorship
          </p>
          <h1 className="mt-4 max-w-3xl font-editorial text-5xl leading-[1.04] font-normal tracking-tight text-ink sm:text-6xl lg:text-[64px]">
            Behind Tooken.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tooken is an independent Minimum Viable Product (MVP) designed and
            built end-to-end by Antony LEFEVRE. It demonstrates how unlisted
            real-world assets can be originated, verified, subscribed to and
            settled on-chain under the ERC-3643 standard.
          </p>

          <dl className="mt-12 grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Status",
                value: "Technical MVP",
                detail: "Non-commercial showcase",
              },
              {
                label: "Token standard",
                value: "ERC-3643",
                detail: "T-REX permissioned tokens",
              },
              {
                label: "Core stack",
                value: "Go · Next.js",
                detail: "PostgreSQL & Solidity EVM",
              },
              {
                label: "Author",
                value: "Antony LEFEVRE",
                detail: "Solo end-to-end build",
              },
            ].map(({ label, value, detail }) => (
              <div
                key={label}
                className="border-b border-border py-5 last:border-b-0 sm:odd:pr-6 sm:even:border-l sm:even:pl-6 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:px-6 lg:py-7 lg:first:pl-0 lg:last:pr-0 lg:[&:not(:first-child)]:border-l"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-2xl tracking-tight text-ink">
                  {value}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24 lg:py-24">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            01 — What Tooken is
          </p>
          <h2 className="mt-4 max-w-md font-editorial text-4xl leading-[1.1] font-normal tracking-tight text-ink sm:text-5xl">
            A full-lifecycle tokenization platform.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Tokenizing a regulated asset requires more than minting an ERC-20
            contract. Tooken connects the investor experience, the compliance
            desk and the issuer back office around permissioned on-chain
            ownership.
          </p>
        </div>

        <ol className="divide-y divide-border">
          {PILLARS.map((pillar, index) => (
            <li
              key={pillar.title}
              className="flex gap-6 py-7 first:pt-0 last:pb-0"
            >
              <span className="pt-1 font-mono text-xs text-amber-700">
                0{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-medium text-ink">{pillar.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {pillar.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              02 — Scope of this MVP
            </p>
            <h2 className="mt-4 font-editorial text-4xl leading-[1.1] font-normal tracking-tight text-ink sm:text-5xl">
              Real engineering. Illustrative offerings.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Tooken was built to validate product design, distributed backend
              workflows and smart-contract enforcement end to end — while
              keeping every listed asset strictly illustrative.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="border border-border bg-background p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber-700">
                Implemented &amp; live
              </p>
              <h3 className="mt-2 text-xl font-medium text-ink">
                What runs for real
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {REAL_SCOPE.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-ink"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-border bg-background p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Demonstration boundary
              </p>
              <h3 className="mt-2 text-xl font-medium text-ink">
                What is simulated
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {ILLUSTRATIVE_SCOPE.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-light">
              03 — About the author
            </p>
            <h2 className="mt-4 font-editorial text-4xl font-normal tracking-tight text-white sm:text-5xl">
              Antony LEFEVRE
            </h2>
            <p className="mt-2 text-sm font-medium text-white/85 sm:text-base">
              Senior Backend &amp; Blockchain Software Engineer · Luxembourg
            </p>

            <div className="mt-6 max-w-xl space-y-4 text-sm leading-relaxed text-white/75">
              <p>
                I am a senior software engineer with over seven years of
                experience designing, scaling and operating reliable backend
                systems in regulated financial services and industrial
                environments — primarily in Go and Java (Quarkus), with hands-on
                expertise in smart contracts and tokenized securities.
              </p>
              <p>
                Working day to day on distributed architectures and
                fund-distribution lifecycles in Luxembourg — spanning investor
                onboarding, order management, transfer agency and on-chain
                compliance — I built Tooken solo from scratch to bring
                institutional backend rigor, ERC-3643 smart contracts and clear
                product execution together in a single working platform.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/in/antonylefevre/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand/70 hover:bg-white/15"
              >
                LinkedIn
                <ArrowUpRight
                  className="size-4 text-brand-light transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </a>
              <a
                href="https://github.com/Antopablo"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 transition-colors hover:border-white/40 hover:text-white"
              >
                GitHub
                <ArrowUpRight
                  className="size-4 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </a>
            </div>
          </div>

          <div className="lg:self-center">
            <dl className="divide-y divide-white/10 border-y border-white/10">
              {AUTHOR_STACK.map(([label, text]) => (
                <div
                  key={label}
                  className="grid gap-1.5 py-4 sm:grid-cols-[170px_1fr] sm:gap-5"
                >
                  <dt className="text-sm font-medium text-white">{label}</dt>
                  <dd className="text-sm leading-relaxed text-white/70">
                    {text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center lg:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Explore the live demonstrator
          </p>
          <h2 className="mt-3 font-editorial text-4xl font-normal tracking-tight text-ink sm:text-5xl">
            See the MVP in action.
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="lg" className="h-12 px-6">
            <Link href="/">
              <ArrowLeft aria-hidden /> Back to home
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
