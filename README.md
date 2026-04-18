# Ansiversa App Starter

This repo is the official starter template for Ansiversa mini-apps. It contains the standard
middleware auth guard, shared AppShell layout, unread notifications badge wiring, a public landing
page at `/`, and a protected app entry at `/app`.

## Freeze status

Starter Freeze Jan-17-2026 (locked baseline).

## Quick start

1) Install dependencies

```
npm ci
```

2) Configure env vars (see `src/env.d.ts` for the full list)

- `ANSIVERSA_AUTH_SECRET`
- `ANSIVERSA_SESSION_SECRET`
- `ANSIVERSA_COOKIE_DOMAIN`
- `PUBLIC_ROOT_APP_URL` (optional)
- `PARENT_APP_URL` (optional)
- `ANSIVERSA_WEBHOOK_SECRET` (optional)
- `PARENT_NOTIFICATION_WEBHOOK_URL` (optional)
- `PARENT_ACTIVITY_WEBHOOK_URL` (optional)

Note: `ANSIVERSA_AUTH_SECRET` is reserved for future auth workflows (not used in this starter yet).

3) Run the app

```
npm run dev
```

## How this starter works (mental model)

Ansiversa apps run in two layers:

- **Parent app** (ansiversa.com)
  - Owns authentication, users, billing, notifications
  - Issues a shared session cookie
- **Mini-apps** (quiz.ansiversa.com, etc.)
  - Trust the shared session cookie
  - Never implement their own auth
  - Use shared layouts and middleware

This starter simulates that environment so you can build a mini-app without needing
the parent app locally.

## Local dev without parent app

If you do not have the parent app session cookie, you can enable a DEV-only auth bypass
to inject a dummy session during local development:

```
DEV_BYPASS_AUTH=true npm run dev
```

Optional overrides (defaults shown):

```
DEV_BYPASS_USER_ID=dev-user
DEV_BYPASS_EMAIL=dev@local
DEV_BYPASS_ROLE_ID=1
```

⚠️ This bypass only works in local development (import.meta.env.DEV) and is ignored in
production builds.

After starting the dev server, open a protected route like `/app`
to confirm the dummy session is active.

## First run checklist

You should be able to:

- Start the app with `npm run dev`
- Open `/` and see the public landing page
- Open `/app` and confirm the authenticated entry works
- See no redirects to the parent login when DEV_BYPASS_AUTH is enabled

If this works, your setup is correct.

## Commands

- `npm run dev`
- `npm run typecheck` (Astro check)
- `npm run build`
- `npm run db:push`

## Integration checklist (frozen standard)

See `APPSTARTER-INTEGRATIONS.md` in the repo root. This is the required platform
integration checklist for every mini-app.

## Database workflow (standard)

This starter intentionally uses file-based remote DB locally for consistency.
`npm run dev` and `npm run build` run in `--remote` mode against `.astro/content.db`.
Use `npm run db:push` as the single schema push command.

## V2 standard baseline

Every new mini-app should start with:

- `APP_META` as the single source of truth for app identity
- A public landing page on `/`
- A protected main app entry on `/app`

## Starting a new mini-app

1) Clone this repo.
2) Update `src/app.meta.ts`.
3) Replace the landing copy and `/app` placeholder content with your domain workflow.
4) Keep shared shells + middleware patterns unchanged.

### Non-negotiable standards

These files define the Ansiversa contract. Do not modify or replace them.

- `src/layouts/AppShell.astro`
- `src/middleware.ts` auth guard
- AppShell unread notifications fetch (`/api/notifications/unread-count`)
- One global Alpine store pattern (`src/alpine.ts`)
- Always update `AGENTS.md` when completing a task

---

Ansiversa motto: Make it simple — but not simpler.
