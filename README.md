# ARTH

ARTH is a tree-planting platform made of two independent applications sharing one ecosystem:

- **`apps/mobile`** — the ARTH mobile app (Expo / React Native / TypeScript). Individual users, groups, real-world planting, tree care, camera/GPS, streaks, collectibles, the forest.
- **`apps/web`** — the ARTH website (Next.js). Public site, dashboards, NGO/nursery/CSR operations, reporting, impact visibility. Talks to `services/api` for everything account/domain-related (see `apps/web/lib/apiProxy.js`); keeps its own direct Postgres access only for pure marketing content (blog, partners, static leaderboard rows, etc.).
- **`services/api`** — the backend API both the mobile app and `apps/web` talk to (Fastify + Prisma + Postgres), and the sole owner of accounts/auth/domain writes.
- **`packages/db`** — the shared Prisma schema/client (`@plant/db`) both `services/api` and `apps/web` depend on. One database, one migration history.

This is an npm-workspaces monorepo. Each app keeps its own dependencies, scripts, environment variables, and can be run/built/deployed independently of the others.

## Install

```bash
npm install
```

This installs all three workspaces from the root in one pass. Each app can still be installed on its own from inside its folder if you only need one of them.

## Run

```bash
npm run dev:mobile   # expo start
npm run dev:web      # next dev, http://localhost:3000
npm run dev:api      # tsx watch, http://localhost:4000 (needs local Postgres)
```

## Build

```bash
npm run build:web    # builds packages/db first, then next build
npm run build:api    # builds packages/db first, then tsc -> services/api/dist
```

Mobile builds go through EAS as before — see `apps/mobile/eas.json`.

## Database (packages/db)

Schema, migrations, and seed data live in `packages/db/prisma/` and are shared by both `services/api` and `apps/web` (via the `@plant/db` package) — there is one Postgres database for the whole platform.

```bash
npm run prisma:generate   # regenerate the Prisma client
npm run prisma:migrate    # create + apply a dev migration
npm run prisma:seed       # seed reference data (species, achievements, etc.)
npm run prisma:studio     # Prisma Studio
```

`apps/web` also has its own `npm run db:seed --workspace=apps/web` for its pure-content tables (blog, forests, partners, ...), which have no equivalent in `packages/db`'s reference seed.

## Typecheck

```bash
npm run typecheck    # apps/mobile + services/api (both TypeScript)
```

`apps/web` is plain JavaScript/JSX and has no TypeScript project to check.

## Environment variables

Each app owns its own `.env`, loaded relative to that app's own folder (Expo/Next.js/dotenv all resolve `.env` from the project root they're invoked in, so this "just works" under workspaces):

| App | File | Key vars |
|---|---|---|
| `apps/mobile` | `apps/mobile/.env` | `EXPO_PUBLIC_API_URL` |
| `apps/web` | `apps/web/.env` | `DATABASE_URL` (same DB as services/api), `API_URL` |
| `services/api` | `services/api/.env` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `PORT`, `UPLOAD_DIR`, `CORS_ORIGIN`, `OWM_API_KEY` |
| `packages/db` | `packages/db/.env` | `DATABASE_URL` (used by `prisma migrate`/`prisma generate`) |

`.env.example` files in each app document the full set without real secrets.

> **Known issue, deliberately left as-is:** the real `.env` files above are currently committed to git history (pre-existing, from before this repo had a `.gitignore`). See `docs/MIGRATION.md` for details.

## Repository structure

```
apps/
  mobile/     Expo app — see apps/mobile/README.md for the full feature/architecture doc
  web/        Next.js app — proxies to services/api for accounts/domain data, own DB access for content only
packages/
  db/         Shared Prisma schema/client (@plant/db) — one migration history, one database
services/
  api/        Fastify API for the mobile app and apps/web
docs/
  ARCHITECTURE.md   monorepo rules — read before adding shared code
  MIGRATION.md      how this repo got restructured, and where things moved from
```

There is no `packages/` directory yet. Mobile is TypeScript, the website is plain JS, and the two backends are fully separate services against separate databases — nothing is duplicated between them today, so there's nothing safe to extract into a shared package yet. When real duplication shows up (a domain type, a validation rule, an analytics event name defined the same way twice), see `docs/ARCHITECTURE.md` for where it should go.

## Development rules

See `docs/ARCHITECTURE.md`. The short version: **share domain logic, not platform UI.** Mobile UI stays in `apps/mobile`, web UI stays in `apps/web`, and neither app imports from the other's internals.
