# Tooken Web

Institutional web front end of the Tooken platform: tokenisation, distribution
and settlement of real-estate securities under the ERC-3643 (T-REX) standard.
It is the client of the [Tooken-Services](../Tooken-Services) API.

Two audiences share the application:

- **Investors**: marketplace, offering details, identity verification (KYC),
  subscription, order tracking until on-chain delivery, portfolio, watchlist.
- **Back office** (managers and administrators): issuers, asset origination
  (create → publish and tokenise → open fundraising), order book and payment
  confirmation, KYC compliance review and on-chain sync, blockchain console.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
(Radix), TanStack Query, react-hook-form + zod, Biome, Vitest.

## Getting started

Requirements: Node 24, npm, and a running Tooken-Services API (see its README:
`docker compose up`, then platform initialisation).

```bash
cp .env.example .env.local   # BACKEND_URL, defaults to http://localhost:8080/api/v1
npm ci
npm run dev                  # http://localhost:3000
```

The browser never calls the API directly: `next.config.ts` rewrites
`/api/backend/*` to `BACKEND_URL`, so requests are same-origin and CORS does not
apply (the `Idempotency-Key` header included).

Turbopack uses the OS certificate store (`turbopackUseSystemTlsCerts` in
`next.config.ts`), so Google Fonts also download behind TLS-intercepting
corporate proxies.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Biome (lint + format check) |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest unit tests |
| `npm run gen:api` | Regenerate `src/lib/api/schema.d.ts` from `../Tooken-Services/api/openapi.yaml` |

## Project layout

```text
src/
  app/
    (public)/      landing, /explore, /real-estate/[id]
    (auth)/        /sign-in, /sign-up, /logout
    (investor)/    /dashboard, /orders, /verification, /profile, /favorites, /real-estate/[id]/buy
    admin/         back office (/admin/compliance and /admin/platform are ADMIN only)
  components/
    app/           design system: shells, page header, panels, status badges, states…
    ui/            shadcn/ui primitives
  lib/
    api/           typed client (token refresh, errors), endpoints, React Query hooks
    auth/          session cookies, session context, route rules
    format.ts      display helpers and exact decimal arithmetic (BigInt)
    status.ts      order, asset, KYC and issuer status metadata
  proxy.ts         route guards (session and role)
```

Amounts travel as decimal strings and are computed with BigInt, never floats.
Route guards only steer navigation; the API remains the authority on access.

## Demo scenario

With a local backend and an initialised platform:

1. **Investor sign-up**: `/sign-up`, then `/verification` to submit the KYC.
2. **Compliance** (admin): `/admin/compliance` → open the file → *Approve* →
   *Sync on-chain* (creates the on-chain identity and claim).
3. **Origination** (admin): `/admin/assets/new` → save → *Publish & tokenise*
   (deploys the ERC-3643 token) → *Open fundraising*.
4. **Subscription** (investor): `/explore` → offering → *Invest* → choose the
   number of shares → review → order placed, with fees and reservation countdown.
5. **Payment** (admin): `/admin/orders` → *Confirm payment*.
6. **Settlement** (investor): the order page updates live until the tokens are
   delivered on-chain; the dashboard shows the new holding.

Staff accounts are promoted directly in the database (the API has no role
management endpoint).
