# Ansiversa Mini-App Blueprint V1

## 1) Purpose & Scope
- Defines the baseline architecture contract for all Ansiversa mini-apps generated from `app-starter`.
- Standardizes repeatable implementation patterns so app teams do not re-invent core UX and integration layers.
- Creates shared expectations for page structure, drawer workflows, store/action patterns, dashboard integration, and governance closure.
- Out of scope:
  - App-specific business logic
  - Domain-specific data models
  - Niche or experimental UI patterns that are not baseline platform requirements

## 2) Page Architecture Contracts
- Required route categories and responsibilities:
  - Landing page
    - Marketing/intro context for the mini-app.
    - Clear entry CTA into app home/list flow.
  - App home/list page
    - Primary index of user-owned entities.
    - Handles empty state and create entry point.
  - Create flow
    - Drawer-based by default.
    - Opens from list/home page action area.
  - Editor page
    - Primary work surface for a single entity.
    - Must own settings and section editing entry points.
  - Preview/read-only page
    - Optional but recommended.
    - Used for consumer-safe rendering and verification before publish/share.
  - Docs/demo route
    - Required for internal standards proof where applicable (example: drawer demo).
- Layout contract:
  - Use `AppShell` for user-facing app routes.
  - Use admin layout contract for admin pages when admin scope exists.
  - Use shared layout/components only; no ad-hoc layout systems.
- Layout & Component System Contract:
  - All mini-app UI must use the shared Ansiversa component system.
  - Use `AppShell` layout for all user-facing routes.
  - Use shared Av components (`AvButton`, `AvDrawer`, and existing Av primitives).
  - Do not introduce new design tokens or parallel component systems.
  - Global styling must inherit from the shared `global.css` token system.
- Top action area conventions:
  - Primary action must be singular and unambiguous.
  - Secondary actions must be visually subordinate.
  - Icon-only actions require accessibility metadata (`aria-label`, `title`).
- Empty state conventions:
  - Empty states must explain what is missing and provide a direct recovery CTA.
  - Empty states must not block create flow discovery.

## 3) Drawer Workflow Contracts
- Baseline reference:
  - `docs/standards/drawer-ux-v1.md`
- Required drawer contracts:
  - Create drawer contract
    - Opens from list/home action area.
    - Success redirects to editor surface.
  - Settings drawer contract
    - Owns entity-level configuration updates.
    - Save success closes drawer.
  - Section drawer contract
    - Owns section-scoped editing flows on editor page.
- Validation routing contract:
  - Drawer validation/errors must render inside drawer notice/footer area.
  - Page-level banners are suppressed while drawer is active.
- Mobile scroll contract:
  - Drawer body must be scroll-safe.
  - Flex scroll hardening with `min-height: 0` is required in constrained containers.
- Save & Next contract (optional):
  - Allowed for section-based flows only.
  - Must not advance on save/validation failure.
  - Must be disabled/hidden on final section.

## 4) Data / Store / Action Contracts
- Store baseline:
  - One global store per app.
  - Page behavior should be organized in module-level stores.
  - Naming conventions should remain descriptive and app-agnostic (`app*`, `admin*`, `*Store`).
- Loading/error model:
  - Explicit loading flags for in-flight work.
  - Explicit error reset behavior on open/close and success transitions.
  - Double-submit prevention is mandatory for submit/save actions.
  - Stale errors must not survive context changes.
- Actions baseline:
  - Server actions live under `src/actions/*`.
  - Use consistent response handling with explicit success/error parsing.
  - Map errors by scope:
    - Drawer-scoped errors -> drawer notice area
    - Page-scoped errors -> page alerts/banners
  - Create success should follow redirect conventions to editor/work surface.
- Data ownership principle:
  - Golden rule: "Refuse to store what you don't own."
  - Mini-app databases should only persist domain-owned data.
  - Parent-owned identity/auth/billing concerns must remain parent-sourced.
- Parent Authentication Boundary:
  - User identity and authentication are owned by the parent application.
  - Mini-apps must validate sessions using the shared JWT contract.
  - Mini-apps must not implement independent authentication systems.
  - User identity is referenced via `userId` only.
  - Authorization checks must rely on parent-provided identity context.

## 5) Dashboard + Admin Integration Baseline
- Dashboard integration (non-negotiable where required by app contract):
  - Define summary JSON generation per app.
  - Push app activity/summary to parent dashboard integration endpoint (or approved equivalent).
  - Keep summary schema versioned and traceable.
  - Include dashboard summary component pathway aligned with shared component strategy.
- Admin integration baseline:
  - If app has admin pages, they must use admin layout contract and guard rules.
  - If app is user-only, explicit "no admin" scope is valid when documented in app contract.
  - "No admin" does not waive required dashboard integration where dashboard is mandated.

## 6) Verification Checklist
- Pre-freeze checklist (required per mini-app):
  - Build/typecheck gates:
    - `npm run typecheck`
    - `npm run build`
  - Core flow smoke tests:
    - list/home loads
    - create flow works
    - editor flow works
    - save/update behavior works
  - Mobile pass:
    - drawer scroll
    - no stuck content
    - responsive action/footer behavior
  - Accessibility quick pass:
    - icon-only buttons have `aria-label` + `title`
    - focus-visible and keyboard reachability
  - Dashboard summary correctness:
    - summary shape valid
    - event push path verified
  - Governance:
    - AGENTS task log updated
    - verification evidence doc updated

## 7) Freeze Marker Standard
- Closure steps for V1 lock:
  - Add newest-first `V1 Locked` entry in repo `AGENTS.md`.
  - Preserve verification evidence in `public/` or `docs/`.
  - Create separate freeze marker commit for traceability.
- Commit message pattern:
  - `chore(<scope>): lock <feature/standard> V1`
- Freeze marker must explicitly reference:
  - scope locked
  - verification artifact path
  - baseline commit (if applicable)

## 8) Appendix: Copy/Paste Templates

### A) AGENTS.md Entry Template
- `YYYY-MM-DD <Feature/Standard> V1 Locked: <what is finalized>. Verification evidence: <path>. Baseline commit: <hash>.`

### B) Verification Checklist Template Headings
- `Pre-flight`
- `Core Flows`
- `Drawer Behaviors`
- `Mobile + Scroll`
- `Accessibility`
- `Dashboard Integration`
- `Governance`

### C) Mini-App Route Checklist
- [ ] Landing page
- [ ] App home/list page
- [ ] Create drawer flow
- [ ] Editor page
- [ ] Preview/read-only page (or documented omission)
- [ ] Docs/demo route for standards proof

### D) Commit Instruction Template
1. `feat(<scope>): implement <baseline feature>`
2. `docs(<scope>): add verification checklist/evidence`
3. `chore(<scope>): lock <feature/standard> V1`

## Execution Boundary
- This document is planning-only.
- It does not implement app features.
- Adoption work must be executed as scoped implementation tasks and verified before freeze.
