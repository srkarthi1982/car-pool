export type LandingLink = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
};

export type LandingStat = {
  value: string;
  label: string;
};

export type LandingCard = {
  title: string;
  description: string;
};

export type LandingStep = {
  title: string;
  description: string;
};

export type LandingShowcase = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  calloutLabel?: string;
  calloutValue?: string;
};

export type LandingPageContent = {
  categoryLabel: string;
  appLabel?: string;
  title: string;
  subtitle: string;
  heroBullets: string[];
  primaryCta: LandingLink;
  secondaryCta?: LandingLink;
  heroNote?: string;
  heroPanel: {
    eyebrow: string;
    title: string;
    steps: string[];
    meta: LandingStat[];
  };
  heroStats?: LandingStat[];
  features: {
    title: string;
    lead: string;
    items: LandingCard[];
  };
  pillars: {
    title: string;
    lead: string;
    items: LandingCard[];
  };
  workflow: {
    eyebrow?: string;
    title: string;
    lead: string;
    steps: LandingStep[];
  };
  showcase?: LandingShowcase;
  finalCta: {
    title: string;
    description: string;
    primaryCta: LandingLink;
    secondaryCta?: LandingLink;
  };
};
