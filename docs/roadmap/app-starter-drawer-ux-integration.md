# App-Starter Rollout Plan: Drawer UX Standard V1

## 1. Goal
- Ensure every new mini-app generated from `app-starter` starts with Drawer UX Standard V1 by default.
- Reduce repeated implementation and verification work across apps.
- Keep UX behavior consistent for create, settings, and section-edit flows.

## 2. What App-Starter Will Provide
- Drawer patterns included in scaffold templates:
  - Create Drawer
  - Settings Drawer
  - Section Edit Drawer
- Each default drawer pattern will align with Drawer UX Standard V1:
  - Header / Body / Footer layout
  - Drawer-scoped validation routing
  - Mobile scroll hardening rules
- Boundary clarification:
  - These are app-starter scaffold components copied into generated apps, not shared-library components.
  - Use Av components only (`AvDrawer`, `AvButton`, and existing Av primitives); no new UI primitives or design tokens.

## 3. Folder Structure Proposal
- Proposed starter structure (subject to architecture review before execution):
  - `src/components/drawers/CreateDrawer.astro`
  - `src/components/drawers/SettingsDrawer.astro`
  - `src/components/drawers/SectionDrawer.astro`
  - `src/modules/app/drawerStore.ts`
- Notes:
  - Keep components generic and app-agnostic.
  - Keep app-specific business logic out of reusable drawer components.

## 4. Default Store Pattern (Design Only)
- Proposed Alpine store contract for scaffolded drawer workflows:
  - `activeDrawer`: string/enum key of open drawer (`create`, `settings`, `section`, or `null`), not a single boolean.
  - `drawerError`: supports scoped errors per drawer, or one error field resolved by `activeDrawer`.
  - `loading`: either per-action flags (`create`, `save`, `saveAndNext`) or an explicit single in-flight request rule.
  - `save()`
  - `saveAndNext()`
- Behavior design goals:
  - Prevent double-submit while requests are in flight.
  - Centralize drawer open/close and error reset behavior.
  - Support optional section sequencing without hard-coding app data.

## 5. Global CSS Hooks
- Required baseline hooks to include in starter styles:
  - Drawer body scroll container class for consistent overflow behavior.
  - Flex scroll hardening with `min-height: 0` for constrained children.
  - Footer notice area for drawer-scoped validation and error messages.
- Goal:
  - New apps inherit stable drawer scrolling and validation placement by default.

## 6. Developer Checklist Integration
- Add Drawer UX Standard checklist to `app-starter` docs/checklists so app teams verify:
  - Create flow uses drawer.
  - Settings flow uses drawer.
  - Drawer-scoped validation routing.
  - Mobile drawer scroll behavior.
  - AGENTS freeze marker entry after verification.

## 7. Adoption Proof Requirement
- Starter must ship with a minimal demo route showing:
  - Create Drawer open/close flow.
  - Validation notice placement inside drawer footer notice area.
- Starter docs must include a short verification checklist snippet for drawer behavior.
- Intent:
  - Keep the pattern demonstrated, not only documented.

## 8. Governance Integration
- Standardize AGENTS logging pattern for adoption tasks.
- Example log language for generated apps:
  - "Drawer UX Standard adopted from app-starter baseline."
- Governance intent:
  - Make rollout and lock milestones traceable in repo history.

## 9. Migration Strategy (Post-Baseline Adoption)
- Existing apps that can adopt this standard in later passes:
  - FlashNote
  - Study Planner
  - Quiz editor
- Strategy constraints:
  - Plan migration as app-by-app hardening work.
  - Preserve current app behavior while normalizing drawer patterns.
  - Execute only after app-starter baseline is approved and frozen.

## Execution Boundary
- This document is planning-only.
- No implementation changes are included in this step.
- Implementation starts only after architecture review and freeze of this rollout plan.
