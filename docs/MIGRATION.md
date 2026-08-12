# Monorepo migration (2026-08-12)

ARTH went from three loosely-related trees in one git repo to an npm-workspaces monorepo. No application code, business logic, routes, or UI changed — this was a pure file-location + tooling change.

## Where things moved

| Before | After |
|---|---|
| `/` (repo root: `App.tsx`, `app.json`, `src/`, `assets/`, `references/`, `dist/`, `.expo/`, `node_modules/`, `package.json`, `.env`, `README.md`, ...) | `apps/mobile/` |
| `backend/` | `services/api/` |
| `website/ARTH Website/Arth_with_video/` | `apps/web/` (the "website/ARTH Website" wrapper folders, which contained nothing else, were removed) |

Nothing was deleted. Every file that existed before the move exists after it, just at a new path — verified via `git status` showing the move as ~81.5k renames plus one `.gitattributes` content change (below), with no unexplained adds or deletes.

## New at the root

- `package.json` — npm workspaces (`apps/mobile`, `apps/web`, `services/api`) + proxy scripts (`dev:mobile`, `dev:web`, `dev:api`, `build:web`, `build:api`, `typecheck`, ...). Replaces the old root `package.json`, which was the mobile app's own manifest and now lives at `apps/mobile/package.json` unchanged.
- `.gitignore` — this repo never had one. Covers `node_modules/`, build output, and `.env*` going forward.
- `README.md` — new monorepo-level overview. The previous root `README.md` (PLANT feature/architecture docs) moved as-is to `apps/mobile/README.md`.
- `docs/ARCHITECTURE.md`, `docs/MIGRATION.md` — new.

## `.gitattributes` fix (the one non-rename change)

Two files were Git LFS-tracked via patterns anchored to the old website path (`website/ARTH[[:space:]]Website/Arth_with_video/...`): a 182MB video backup and a native `.node` build artifact. After the move those patterns no longer matched their new paths, so a plain `git add -A` would have committed both files as raw ~180MB/~148MB blobs instead of LFS pointers. Fixed by updating the two patterns in `.gitattributes` to the new `apps/web/...` paths before staging, so both files are correctly tracked as LFS pointers (134 bytes each in the index) exactly as before the move. Anyone maintaining Git LFS patterns elsewhere in tooling/CI config should double check for the same old-path assumption.

## Env vars — no changes required

Expo (`apps/mobile`), Next.js (`apps/web`), and `dotenv` (`services/api`) all resolve `.env` relative to the directory the process is run from. Since each `.env` moved together with its app, and npm workspace scripts (`npm run dev --workspace=...`) run with `cwd` set to that workspace's folder, every existing env var kept working with zero code changes. Verified for `services/api` specifically: `dotenv/config` (default cwd-relative load) plus two `path.resolve(process.cwd(), env.UPLOAD_DIR, ...)` call sites in `upload.service.ts` and `static.ts` — both cwd-relative, no hardcoded paths.

## Known pre-existing issues, deliberately not fixed in this pass

Surfaced during the audit, explicitly deferred by request:

1. **Committed secrets.** `apps/mobile/.env`, `apps/web/.env`, and `services/api/.env` (containing the local Postgres password and JWT secrets) are committed to git and already pushed to `github.com/krutiagrawal/ARTH`. Recommendation whenever it's picked back up: rotate the exposed credentials, and untrack the files going forward (`git rm --cached`, already covered going-forward by the new `.gitignore`).
2. **`node_modules` tracked in git.** ~80,000 of the repo's ~81,500 tracked files are `node_modules`/build output from before any `.gitignore` existed. Left tracked at the user's request; the new `.gitignore` only prevents *new* untracked copies from being committed, it does not retroactively untrack what's already there.

## No `packages/` created

See `docs/ARCHITECTURE.md` for why — no real duplication exists between the apps yet (mobile is TS, web is plain JS, the two backends are fully independent services on separate databases), so no shared package was speculatively created.
