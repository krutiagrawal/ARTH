# ARTH

ARTH is a tree-planting platform made of two independent applications sharing one ecosystem:

- **`apps/mobile`** — the ARTH mobile app (Expo / React Native / TypeScript). Individual users, groups, real-world planting, tree care, camera/GPS, streaks, collectibles, the forest.
- **`apps/web`** — the ARTH website (Next.js). Public site, dashboards, NGO/nursery/CSR operations, reporting, impact visibility.
- **`services/api`** — the backend API the mobile app talks to (Fastify + Prisma + Postgres).

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
npm run build:web    # next build
npm run build:api    # tsc -> services/api/dist
```

Mobile builds go through EAS as before — see `apps/mobile/eas.json`.

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
| `apps/web` | `apps/web/.env` | `DATABASE_URL`, `JWT_SECRET` |
| `services/api` | `services/api/.env` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `PORT`, `UPLOAD_DIR`, `CORS_ORIGIN`, `OWM_API_KEY` |

`.env.example` files in each app document the full set without real secrets.

> **Known issue, deliberately left as-is:** the real `.env` files above are currently committed to git history (pre-existing, from before this repo had a `.gitignore`). See `docs/MIGRATION.md` for details.

## Repository structure

```
apps/
  mobile/     Expo app — see apps/mobile/README.md for the full feature/architecture doc
  web/        Next.js app (also owns its own Prisma schema + DB, separate from services/api)
services/
  api/        Fastify API for the mobile app
docs/
  ARCHITECTURE.md   monorepo rules — read before adding shared code
  MIGRATION.md      how this repo got restructured, and where things moved from
```

There is no `packages/` directory yet. Mobile is TypeScript, the website is plain JS, and the two backends are fully separate services against separate databases — nothing is duplicated between them today, so there's nothing safe to extract into a shared package yet. When real duplication shows up (a domain type, a validation rule, an analytics event name defined the same way twice), see `docs/ARCHITECTURE.md` for where it should go.

## Development rules

See `docs/ARCHITECTURE.md`. The short version: **share domain logic, not platform UI.** Mobile UI stays in `apps/mobile`, web UI stays in `apps/web`, and neither app imports from the other's internals.
