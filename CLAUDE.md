# ARTH / PLANT — working agreement for Claude

Monorepo: `apps/web` (Next.js), `apps/mobile` (Expo / React Native), `services/api` (Fastify + Prisma), `packages/db` (Prisma schema + migrations).
Live on one AWS Lightsail server: web https://app.13-235-206-230.sslip.io, API https://api.13-235-206-230.sslip.io (health: `/health`).
The user works from their phone. They describe a change, you make it, they say "deploy", it goes live.

## How changes reach production

1. **Work on a branch and open a pull request.** `master` is protected: changes land only through a PR whose `check` job (type-check + builds) is green. Never push to `master` directly and never try to bypass the rule.
2. **"Deploy" (or "ship it", "go live") means:** make sure the PR's `check` is green, merge it (squash), then watch what the merge triggers and report back in plain words (below). If `check` is red, fix it on the branch instead of merging.
3. **Merging to `master` triggers automatically:**
   - **Deploy** workflow — builds web + API, uploads to the server, backs up the database, runs migrations, restarts, health-checks, and rolls back the *code* automatically if the health check fails. Takes ~5–8 min.
   - **Mobile release** workflow — only when `apps/mobile/**` (or `package-lock.json`) changed. It computes the Expo native fingerprint:
     - **JS/UI-only change** → publishes an over-the-air update to the installed APK (EAS branch `preview`). The user just opens the app; it waits up to 3 s on launch for the update, so the change is visible on first open (if not, close and reopen once).
     - **Native change** (new native library, permissions, `app.json` plugins/config, Android config) → builds a new APK (10–30 min) and publishes it at the permanent link `https://github.com/krutiagrawal/ARTH/releases/download/apk-latest/arth.apk`. The user must tap that link on their phone and install it; Android cannot do this silently. The old APK keeps working against the server in the meantime but will not receive updates built for the new fingerprint.
4. **After merging, tell the user exactly one of:**
   - "Live. Open the app (close and reopen once if you don't see it)." — web/API/JS-only changes, once the Deploy run is green.
   - "Server is live. A new APK is building (~20 min); install it from <link> when I say it's ready." — native change.
   - What failed and what you are doing about it.

## Rules that protect production

- **Never commit secrets.** Real secrets live only in `/srv/arth/shared/.env.api` on the server and in GitHub secrets. `.env*` is git-ignored. The repo is **public**.
- **Database migrations must be backward compatible with the previous release** (additive: add columns/tables, don't drop or rename in the same release). Each deploy takes a database backup first, but the automatic rollback only reverts code, not data.
- **Prefer JS-only mobile changes.** If a request needs a native library or permission, say so before building it: it forces an APK reinstall.
- Do not edit `deploy/*` or `.github/workflows/*` unless the user asked for pipeline changes; a mistake there can block all deploys.
- The API runs as a single instance (it has an in-process scheduler). Don't add multi-instance/cluster assumptions.
- The web app is on React 19 (matches the hoisted root copy that the mobile app needs). Don't downgrade it.
- Web routes that read the database are `force-dynamic` so `next build` needs no database. New pages that query Prisma must stay dynamic.

## Security rules for all new code

The code in this repo is largely AI-written and has had one security audit (2026-10). Every change must keep these true:

1. **Ownership in the same query.** Any route that takes an `id` (param or body) must scope the lookup to the caller: `findFirst({ where: { id, userId } })` (or `ngoId` / `nurseryId` / group membership), never `findUnique({ where: { id } })` followed by an update. Role guards (`requireRole`) say *what kind* of user you are, not *whose* record it is.
2. **Rate-limit anything abusable.** New routes that create accounts, send email/SMS/push, take uploads, check short codes/OTPs, or call a paid third party (Gemini, geocoding, weather, Stripe) need `limit(...)` / `limitByBodyField(...)` / `limitByParam(...)` from `services/api/src/plugins/rateLimit.ts`. A global per-caller limit already exists; add a tighter one for these.
3. **The server decides, never the phone.** XP, streaks, leaderboard rank, prices, totals, "payment succeeded", "location is real" are computed or verified on the server. Values sent by the app (GPS `mocked`/`accuracy`, prices, quantities, flags) are inputs to check, not facts. Money moves only on a verified Stripe webhook.
4. **Payments fail closed.** Use `getStripeClientOrDevBypass()`, never a bare try/catch that skips payment. Missing Stripe config in production must produce an error, not a free order.
5. **Validate every input with zod.** Explicit field lists (no spreading `request.body` into Prisma), length caps on every string, `.int().min().max()` on every number, `z.string().uuid()` on ids. URLs must go through `websiteUrlSchema` (forces http/https).
6. **Uploads** go through `upload.service.ts` only (it reads the real file type from the bytes). Never trust the client's filename or Content-Type, never store uploads outside `UPLOAD_DIR`, and never serve user files with a script-capable type.
7. **Escape user text in HTML** (emails, receipts, web pages) with `escapeHtml` from `services/api/src/utils/html.ts`. In React, never use `dangerouslySetInnerHTML` with user data.
8. **Secrets** live only in server env files and GitHub secrets. Nothing secret in `apps/mobile` (everything `EXPO_PUBLIC_*` is public), nothing in logs, nothing in git. Never log tokens, passwords, OTPs or full request bodies.
9. **Short secret codes use `crypto.randomInt` / `crypto.randomBytes`**, never `Math.random`, and have an attempt limit.
10. **Redirects and links:** after login only follow same-site paths (`safeNextPath` in `apps/web/lib/safeRedirect.js`); never put user-supplied URLs into `href` without http/https validation.
11. **Sensitive data stays out of public responses:** no email, phone, PAN/GSTIN, verification documents or exact home-adjacent coordinates in anything a logged-out or unrelated user can fetch.
12. **New personal data must be erasable.** Any new table or column that holds personal data (names, contact details, free text, photos, locations, messages, tokens) must be added to `services/api/src/services/accountErasure.service.ts` in the same change, and the DB test in `services/api/test/accountErasure.db.test.ts` extended (run it with `RUN_DB_TESTS=1 npx vitest run` from `services/api` against the local database). Play Store and the DPDP Act require "Delete account" to really delete.
13. **Every security fix gets a test** in `services/api/test/` (run with `npm test --workspace=services/api`; CI and Deploy both run it). Keep `.github/audit-baseline.json` honest: add an accepted advisory only with a reason, remove it when fixed.

Crash reporting: the API reports unexpected 5xx errors, the mobile app's JavaScript errors (`apps/mobile/src/utils/errorReporter.ts`) and web server errors (`apps/web/instrumentation.js`) through `POST /api/client-errors` to Sentry. Set `SENTRY_DSN` (and optionally `SENTRY_RELEASE`) in `/srv/arth/shared/.env.api` to switch it on; unset means off.

## Useful facts

- Server layout: `/srv/arth/{releases,current,shared}`; pm2 apps `arth-api` and `arth-web`; Nginx; Postgres on the same VM; backups in `/srv/arth/shared/backups` (pre-deploy) and `/var/backups/arth` (nightly).
- Local dev needs the user's own `.env` files (git-ignored); cloud sessions can type-check and build but have no local database.
- Expo account `kruti_agrawal`, project `@kruti_agrawal/arth`, update channel `preview`.
