# Landing Page Standard V1

Status: LOCKED baseline for future READY-app landing upgrades.

V1.1 refinement note:
This standard received a final polish pass to remove the remaining component-demo feel. The refinement focused on section hierarchy, reduced equal-card repetition, stronger “why” treatment, and a more integrated closing CTA while staying inside the existing Ansiversa `global.css` language.

Correction note:
After the first pilot rollout, this standard was refined to align more closely with the visual rhythm of `resume-builder`, `quiz`, and `portfolio-creator`. The correction specifically reduced oversized hero scale, removed the overly-boxed pilot feel, and moved the system back toward the stable Ansiversa `global.css` tone.

## Purpose

This standard replaces the weak starter pattern of:

- one simple hero
- one secondary card
- early page exhaustion

with a fuller product-style landing flow that still fits Ansiversa’s calm dark visual language.

It is designed for mini-apps that are functionally solid but need stronger public-facing presentation before broader rollout.

## Benchmark inputs

This standard was abstracted from the stronger current implementations in:

- `resume-builder`
- `quiz`
- `portfolio-creator`

Those pages feel stronger because they do three things better than the minimal baseline:

1. They establish clearer hierarchy in the hero.
2. They keep the page moving through distinct sections.
3. They explain the workflow and product value concretely, not vaguely.

They also stay calmer than the first pilot pass because:

1. hero scale is more restrained,
2. not every section is framed like a dashboard card,
3. section spacing and CTA treatment stay closer to the shared Ansiversa language.

The V1.1 refinement adds one more rule:

4. not every section should carry the same structural weight or composition.

This standard captures that pattern without copying any one repo blindly.

## Required section structure

Every mini-app landing page should support the following section order:

1. Hero
2. Value / Feature cards
3. Why this app / Pillars
4. How it works
5. Optional showcase / output / workflow explanation
6. Final CTA

Footer behavior remains owned by the existing app shell and shared Ansiversa layout.

## Section rules

### 1. Hero

Must include:

- app label or category pill
- strong app title
- one-line value proposition
- primary CTA
- optional secondary CTA
- supporting bullets

Recommended:

- a right-side summary panel that explains the core flow
- a small stats/proof row only if it adds clarity and does not turn the hero into a metrics strip

The hero must immediately answer:

- what this app is
- why it matters
- what the user should do next

### 2. Value / Feature cards

Must include 3 to 6 cards.

Refinement note:
This section no longer needs to present every benefit as an equal grid of identical cards. A stronger pattern is:

- one highlighted lead value
- supporting value items in a lighter stacked or mixed layout
- enough structure to feel premium, without reading like a grid-system demo

Preferred tone:

- useful
- practical
- calm

Do not make the feature section feel like a SaaS pricing grid or admin dashboard.

Each card should describe:

- a real practical benefit
- current V1 behavior
- concrete product value

Avoid:

- generic AI claims
- filler marketing language
- future-facing promises

### 3. Why this app / Pillars

Must include 3 to 6 short pillars.

This section exists to strengthen product confidence.
It should explain why the experience is strong, trustworthy, or efficient.

This is where stronger apps like Resume Builder and Portfolio Creator outperform the minimal baseline.

Preferred treatment:

- timeline or structured editorial rhythm
- not a repeated wall of identical heavy cards unless the app truly needs it
- a slightly stronger narrative setup than the feature section, so the page feels like it is making a case rather than documenting functions

### 4. How it works

Must include a 3-step or 4-step flow.

This section should feel operational, not promotional.

Preferred refinement:

- lighter than the hero and pillars sections
- clear enough to guide the eye, but not so visually heavy that it restarts the page

It should help a first-time visitor imagine:

- how they start
- what they do
- what result they get

### 5. Optional showcase / output / workflow explanation

Use only when needed.

Good fit:

- builders
- planners
- analyzers
- generators
- apps where output shape matters

Do not force this section into simpler apps if it adds no clarity.
When used, it should feel lighter than the hero and features sections.

### 6. Final CTA

Must close with one strong action.

It should not feel like a placeholder strip.
The copy should reinforce the main promise and route the user into the real product path.

Preferred treatment:

- integrated with the page
- closer to Resume Builder’s closing card than to a promo banner
- should feel like the narrative landing point, not an isolated reusable module

## Content rules

Landing pages must be implementation-aligned.

Do:

- describe current V1 reality
- use real workflows
- use practical user-facing language
- keep section copy concise and readable

Do not:

- invent missing features
- oversell AI behavior
- use startup-style fluff
- turn the page into a generic template dump

## Visual rules

The page should feel:

- premium
- calm
- dark
- product-focused
- clearly sectioned

Preferred visual cues:

- soft gradients
- restrained cards
- readable spacing
- strong title hierarchy
- restrained accent color usage
- editorial section rhythm
- mixed section composition instead of identical repeated modules

Avoid:

- flashy gimmicks
- random visual experiments
- crowded hero layouts
- shallow glassmorphism for its own sake
- oversized headline dominance
- making every section feel equally boxed
- isolated CTA modules that look detached from the rest of the page
- pages where every section repeats the same grid/card pattern with only new copy

## System design inside app-starter

The reusable baseline lives in:

- `src/lib/landing.ts`
- `src/components/landing/LandingPageStandard.astro`
- `src/content/landing-demo.ts`

The intended adoption model is:

1. Keep the reusable section structure.
2. Replace content only.
3. Adjust optional showcase usage per app.
4. Preserve the shared shell and footer contract.

The system should prefer existing Ansiversa landing primitives and rhythms where possible:

- `av-hero`
- `av-section`
- `av-section-header`
- `av-list`
- `AvTimeline`
- `av-steps`
- existing `AvCard` usage patterns already proven in stronger mini-app landings

This keeps rollout practical during freeze.

The system should also vary emphasis between sections:

- Hero: strongest visual weight
- Features: practical and readable, but not dominant
- Why/Pillars: strongest narrative section after the hero
- How it works: structured and lighter
- Optional showcase: only when extra proof is necessary
- Final CTA: integrated conclusion

## Why this is better than the old minimal pattern

The old pattern was too thin.
It introduced the app, but it did not build confidence or explain the product deeply enough.

The new standard is better because it:

- tells a fuller product story
- gives the user clearer next steps
- feels more premium without becoming heavy
- supports text-first apps well
- can be reused repo by repo without architecture changes

## Rollout rule

This task only defines and demonstrates the standard in `app-starter`.

Mass rollout to the 21 READY apps is intentionally separate.
