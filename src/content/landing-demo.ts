import type { LandingPageContent } from "../lib/landing";

export const createLandingDemoContent = ({
  startHref,
}: {
  startHref: string;
}): LandingPageContent => ({
  categoryLabel: "System Standard",
  appLabel: "Ansiversa Mini App Baseline",
  title: "Landing Page Standard V1",
  subtitle:
    "A reusable landing system for Ansiversa mini-apps that needs product-level storytelling without drifting away from the calm product rhythm already proven in Resume Builder.",
  heroBullets: [
    "Hero-led product story with one clear action and supporting proof",
    "Reusable sections that can shift emphasis without feeling mechanical",
    "Content-driven structure that future mini-apps can populate quickly",
  ],
  primaryCta: {
    label: "Open Workspace",
    href: startHref,
  },
  secondaryCta: {
    label: "See Workflow",
    href: "#workflow",
    variant: "ghost",
  },
  heroNote: "Built as the rollout reference for the 21 READY apps.",
  heroPanel: {
    eyebrow: "Reference flow",
    title: "Story first, then action",
    steps: [
      "1. Introduce the app with a strong value proposition",
      "2. Vary section emphasis so the page does not feel templated",
      "3. Close with one clear CTA that feels earned",
    ],
    meta: [
      { value: "V1.1", label: "Standard" },
      { value: "Story-led", label: "Landing mode" },
    ],
  },
  features: {
    title: "What this standard adds",
    lead:
      "This replaces the thin hero-plus-card starter with a fuller landing flow that feels intentional before a user even opens the workspace.",
    items: [
      {
        title: "Stronger section hierarchy",
        description:
          "The hero leads with one clear promise, supporting bullets, and an immediate action instead of generic intro copy, while the rest of the page changes emphasis naturally.",
      },
      {
        title: "Mixed section patterns",
        description:
          "Features, pillars, workflow, and optional proof blocks no longer all rely on the same repeated boxed treatment.",
      },
      {
        title: "Story-backed confidence",
        description:
          "A dedicated why-section gives the app room to explain why its workflow feels stronger than a basic utility page.",
      },
      {
        title: "Readable product flow",
        description:
          "How-it-works steps make even text-heavy tools feel approachable by showing the path from entry to outcome.",
      },
    ],
  },
  pillars: {
    title: "The standard pillars",
    lead:
      "These are the qualities the rollout should preserve across future mini-app landings.",
    items: [
      {
        title: "Calm premium tone",
        description:
          "Dark Ansiversa visual language, restrained accents, and readable density instead of loud hero gimmicks or empty breathing space.",
      },
      {
        title: "Product-specific messaging",
        description:
          "Every section should talk about the app’s real workflow, output, or decision support rather than broad AI claims.",
      },
      {
        title: "Section-based rhythm",
        description:
          "A premium landing page needs clear transitions, uneven emphasis, and breathing room so the page feels complete instead of overframed.",
      },
      {
        title: "Content reuse",
        description:
          "Future repos should be able to swap labels, bullets, cards, and steps without rebuilding the layout each time.",
      },
      {
        title: "Text-heavy app support",
        description:
          "The system works for planners, builders, analyzers, and generators that rely more on clarity than visual spectacle.",
      },
      {
        title: "Rollout safety",
        description:
          "The structure is opinionated enough to raise quality but small enough to adopt repo by repo during freeze without major layout rewrites.",
      },
    ],
  },
  workflow: {
    eyebrow: "How it works",
    title: "How future apps should use it",
    lead:
      "Keep the structure. Replace the content. That is the intended adoption model.",
    steps: [
      {
        title: "Define the app promise",
        description:
          "Set the category label, page title, one-line value proposition, bullets, and the correct action labels for the app.",
      },
      {
        title: "Populate the sections",
        description:
          "Fill the features, pillars, workflow steps, and optional showcase block from the real implementation, not aspirational copy.",
      },
      {
        title: "Keep the CTA honest",
        description:
          "Use the final CTA to direct the user into the real workspace or a truthful secondary path such as templates, examples, or learn-more content.",
      },
    ],
  },
  showcase: {
    eyebrow: "Optional showcase",
    title: "Use this block only when the app needs one extra proof point",
    description:
      "Some apps need one extra section to make the product feel concrete. It should add clarity, not another repeated feature grid.",
    bullets: [
      "Good fit for builders, planners, and analyzers with structured output",
      "Best used when the result is not obvious from the feature list alone",
      "Optional by design so simpler apps can stay tighter",
    ],
    calloutLabel: "Adoption rule",
    calloutValue: "Use only when it adds clarity",
  },
  finalCta: {
    title: "Use this as the default landing baseline for future mini-apps",
    description:
      "The system is ready to be rolled out repo by repo across the READY apps without changing the broader Ansiversa architecture.",
    primaryCta: {
      label: "Open Workspace",
      href: startHref,
    },
    secondaryCta: {
      label: "See Workflow",
      href: "#workflow",
      variant: "ghost",
    },
  },
});
