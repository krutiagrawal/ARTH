# ARTH monorepo architecture

## Principle

**Share domain logic, not platform UI.**

- Shared ARTH concepts (when they exist) belong in `packages/*`.
- Mobile-specific UI belongs in `apps/mobile`.
- Web-specific UI belongs in `apps/web`.

`apps/mobile` and `apps/web` are independent applications that happen to live in the same repo. They are not required to share components, styling, or rendering — React Native and a browser DOM render fundamentally differently, and forcing shared UI components between them produces worse code on both sides. Don't do it.

## Why there's no `packages/` yet

As of this migration:

- `apps/mobile` is TypeScript; `apps/web` is plain JavaScript/JSX. There's no shared type system to put a shared types package on top of yet.
- `services/api` (the mobile backend) and `apps/web`'s own built-in API routes are two fully independent services, each with its own Prisma schema and its own Postgres database. They don't currently share an entity definition, a validation rule, or an API contract.

Creating empty `packages/domain`, `packages/types`, etc. now would be speculative abstraction with nothing real inside it — actively discouraged, not just unnecessary. Add a package only when one of these is true:

1. The same concept (a domain type, an enum, a validation rule, an analytics event name, a formatting helper) already exists independently in two places and has drifted or is at risk of drifting, **or**
2. You're about to add a second implementation of something that already exists once, and sharing it from day one is clearly safe and low-cost.

## Dependency direction

```
apps/mobile  ─┐
               ├──▶  packages/*
apps/web     ─┘

services/api  (standalone — nothing currently depends on it via workspace import; it's consumed over HTTP)
```

Never the reverse. A package under `packages/*` must never import from `apps/*` or `services/*`. If you find yourself wanting that, the code belongs in the app, not the package.

## Rules for adding shared code

1. Don't duplicate an ARTH domain concept (User, Group, Organisation, NGO, Nursery, LandPartner, Tree, PlantationDrive, Adoption, Donation, CareAction, Collectible, TreeStatus, ...) across apps once it's been extracted — import it from the shared package instead of redefining it.
2. Shared business rules go in a shared package where technically possible (i.e. where both consumers can actually run the code — see the TS/JS split above).
3. `apps/mobile` never imports from `apps/web/...` or vice versa. If two apps need the same thing, it goes through `packages/*`, not a cross-app import.
4. Avoid circular dependencies between packages.
5. When `apps/web`'s own Prisma schema and `services/api`'s Prisma schema define the same real-world entity, that's a signal (not an obligation) to consider a shared `packages/domain` or `packages/types` package — but only once there's an actual second consumer, not preemptively.
6. Tree lifecycle status, and any other enum/state machine, should have exactly one authoritative definition once it's shared. Don't let mobile and web drift into different status vocabularies for the same concept.

## Independence guarantees

- Each app has its own `package.json`, dependencies, build, and env vars.
- `npm install` at the repo root installs all three workspaces, but each app can still be installed/run/built entirely on its own from inside its own folder.
- A failure in one app (build error, missing env var) does not block installing, building, or running the other two.
