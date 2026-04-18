# AppStarter Integration Checklist (Ansiversa Standard)

This is the frozen ecosystem checklist for every new mini-app built from AppStarter.

Use this as the default verification list before launch. Keep it concise, consistent, and enforceable.

---

## 0) New Repo Bootstrap from App Starter (mandatory)

This prevents repeated setup mistakes. Do this before any feature work.

- [ ] Clone `app-starter` into the new repo folder
- [ ] Remove old git origin, add new origin for the new repo
- [ ] Reset `package.json` name, app key/slug, and `.env.example` values
- [ ] Update `src/app.meta.ts`
- [ ] Keep `/` as the public landing page and `/app` as the authenticated entry
- [ ] First commit in the new repo
- [ ] Run `npm run typecheck` + `npm run build` and log in `AGENTS.md`

## A) Core integrations — Must-have (V1)

These **must** ship with AppStarter so every mini-app is platform-ready.

### 1) Auth + Session (Domain JWT)
- [ ] JWT cookie decode + verify
- [ ] `locals.user` normalized shape (no `undefined` fields)
- [ ] Safe `returnTo` redirect guard
- [ ] Signout clears cookies properly

### 2) Billing / Entitlements (Payments)
- [ ] `locals.user.isPaid`, `plan`, `planStatus`, `renewalAt`, `stripeCustomerId`
- [ ] `requirePro()` server guard → throws `PAYMENT_REQUIRED`
- [ ] Standard UI paywall pattern
  - [ ] Pro badge
  - [ ] Disabled state
  - [ ] Paywall panel + `/pricing` CTA
- [ ] Define `FREE_LIMITS` in a single file and enforce in server actions
- [ ] All pro-only actions must use `requirePro()`
- [ ] UI gating is never enough; all gating must be enforced in server actions

### 3) Dashboard Integration (Parent)
- [ ] Webhook helper to push activity + summary JSON
- [ ] Summary JSON versioning + sample schema
- [ ] “Push on key events” pattern
- [ ] Contract (required)
  - [ ] Env: `ANSIVERSA_PARENT_BASE_URL`
  - [ ] Env: `ANSIVERSA_DASHBOARD_WEBHOOK_URL`
  - [ ] Env: `ANSIVERSA_DASHBOARD_WEBHOOK_SECRET`
  - [ ] Payload: `appId`, `userId`, `eventType`, `summaryVersion`, `summary`

### 4) Notifications Integration (Parent-owned)
- [ ] Helper to emit notification events to parent
- [ ] Payload contract + example
- [ ] Parent owns UI rendering
- [ ] AppShell shows unread count via parent notification count endpoint (SSR)
- [ ] If count endpoint is unavailable, fallback to `0` silently
- [ ] Contract (required)
  - [ ] Env: `ANSIVERSA_NOTIFICATIONS_WEBHOOK_URL` (optional)
  - [ ] Env: `ANSIVERSA_NOTIFICATIONS_WEBHOOK_SECRET` (optional)
  - [ ] Payload: `appId`, `userId`, `eventType`, `title`, `url`

### 5) Shared Layout + UI Rules
- [ ] Enforced AppShell/Av layout usage
- [ ] `global.css` pattern for Tailwind compilation
- [ ] Av components + tokens only

### 6) Webhook hygiene (dashboard/notifications calls)
- [ ] Short timeout enforced
- [ ] Best-effort (non-blocking)
- [ ] Never fail the user action if webhook fails; log and continue
- [ ] Retry guidance (2–3 max with backoff)
- [ ] Log failures with `appId`

### 7) Versioning policy (minimum)
- [ ] Summary JSON versioned
- [ ] Schema change rule: bump version + maintain backward-compatible rendering in parent

---

## B) Platform hygiene — Optional (V2+)

These are recommended **drop-in modules** or guidance. Do not wire by default in V1.

### 9) Rate limiting / abuse protection
- [ ] Throttling guidance for heavy endpoints (per user / per minute)

### 10) Error monitoring / centralized logging
- [ ] Optional monitoring hook with tags `{ appId, userId?, action }`

### 11) Analytics / telemetry
- [ ] Event hook pattern (screen view + primary actions), privacy-first

### 12) Privacy & compliance notes
- [ ] PII redaction rules; never include secrets in payloads

### 13) CORS / API access rules
- [ ] Default deny; allow only `ansiversa.com` / `*.ansiversa.com` if needed

### 14) Feature flags / rollout controls
- [ ] Enable/disable by app or role; beta rollout guidance

### 15) File/asset storage integration
- [ ] Standard storage approach + URL policy + optional upload helper

### 16) Email / export integrations
- [ ] Standard export job or email hook; payload shape guidance

---

## C) Starter route baseline

- [ ] Keep `/` public
- [ ] Keep `/app` protected
- [ ] Do not add demo playground routes to the starter baseline

---

## AGENTS.md Verification Template (copy/paste)

Use this block in every mini-app repo after you finish a task.

- [ ] Auth locals normalized
- [ ] Billing flags present
- [ ] `requirePro` guard works
- [ ] Paywall UI pattern present
- [ ] Dashboard webhook push works
- [ ] Notifications helper wired
- [ ] Admin guard works
- [ ] Layout + `global.css` correct
- [ ] Webhook timeouts + retries documented
- [ ] Build/typecheck green

## Drawer UX Verification Snippet (copy/paste)

Use this snippet when a mini-app adopts Drawer UX Standard V1 from app-starter.

- [ ] Create drawer open/close works
- [ ] Drawer validation/error notice renders inside drawer footer notice area
- [ ] Loading guard prevents double-submit on drawer primary action
- [ ] Mobile width drawer body scroll works (no stuck content)
- [ ] `npm run typecheck` pass
- [ ] `npm run build` pass
- [ ] AGENTS.md freeze marker added after verification
