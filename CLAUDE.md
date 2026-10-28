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

## Useful facts

- Server layout: `/srv/arth/{releases,current,shared}`; pm2 apps `arth-api` and `arth-web`; Nginx; Postgres on the same VM; backups in `/srv/arth/shared/backups` (pre-deploy) and `/var/backups/arth` (nightly).
- Local dev needs the user's own `.env` files (git-ignored); cloud sessions can type-check and build but have no local database.
- Expo account `kruti_agrawal`, project `@kruti_agrawal/arth`, update channel `preview`.
