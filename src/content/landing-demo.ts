import type { LandingPageContent } from "../lib/landing";

export const createLandingDemoContent = ({
  startHref,
}: {
  startHref: string;
}): LandingPageContent => ({
  categoryLabel: "Car Pool",
  appLabel: "Group Travel Organizer",
  title: "Fair car pool rotation without daily confusion",
  subtitle:
    "Track trips, balance driving fairly, and keep your group organized without manual tracking.",
  heroBullets: [
    "Track daily trips with driver, passengers, and absences",
    "Suggest the next driver from real group history",
    "Keep clear records so everyone can see the balance",
  ],
  primaryCta: {
    label: "Open Workspace",
    href: startHref,
  },
  secondaryCta: {
    label: "See how it works",
    href: "#workflow",
    variant: "ghost",
  },
  heroNote: "Built for groups that share travel and want a simple daily rhythm.",
  heroPanel: {
    eyebrow: "Daily flow",
    title: "From group to fair rotation",
    steps: [
      "1. Create your group and add members",
      "2. Select who is travelling today",
      "3. Log the trip with driver and passengers",
      "4. See the next driver suggestion instantly",
    ],
    meta: [
      { value: "Auto", label: "Next driver updates" },
      { value: "Balanced", label: "Fairness over time" },
    ],
  },
  features: {
    title: "How your group stays organized",
    lead:
      "Car Pool keeps the daily decision simple: who is travelling, who drives, and how the group stays balanced over time.",
    items: [
      {
        title: "Simple daily workflow",
        description:
          "Create a group, add members, choose who is travelling today, and log each trip with the driver and passengers.",
      },
      {
        title: "Next driver always known",
        description:
          "Car Pool suggests the next driver from real trip history.",
      },
      {
        title: "Everyone sees the same record",
        description:
          "Trips, passengers, and absences are visible to the whole group.",
      },
      {
        title: "No manual tracking needed",
        description:
          "Fairness updates automatically as trips are recorded.",
      },
    ],
  },
  pillars: {
    title: "What makes it fair and reliable",
    lead:
      "Driving responsibility stays balanced using real trip history, without manual tracking or coordination.",
    items: [
      {
        title: "Fair rotation",
        description:
          "Driving responsibility is balanced across members over time.",
      },
      {
        title: "Real history",
        description:
          "Every trip is recorded with driver, passengers, and absences.",
      },
      {
        title: "Smart suggestions",
        description:
          "The next driver is suggested from actual participation.",
      },
      {
        title: "Flexible groups",
        description:
          "Works for small or large teams with changing availability.",
      },
      {
        title: "Clear visibility",
        description:
          "See who has driven more, ridden more, or missed trips.",
      },
      {
        title: "Simple to use",
        description:
          "No complex setup. Designed for repeated daily use.",
      },
    ],
  },
  workflow: {
    eyebrow: "How it works",
    title: "How it works",
    lead:
      "Start with the group, record the travel, and let the app keep the balance visible.",
    steps: [
      {
        title: "Start your group",
        description:
          "Create a group and add your members.",
      },
      {
        title: "Track your trips",
        description:
          "Log each day’s travel with driver, passengers, and absences.",
      },
      {
        title: "Let the app balance",
        description:
          "Fairness and rotation update from the trips you record.",
      },
    ],
  },
  showcase: {
    eyebrow: "Example week",
    title: "See how a week looks",
    description:
      "A simple week shows how the driver changes as trips are logged and fairness updates.",
    bullets: [
      "Mon -> Vinil drives",
      "Tue -> Sasi drives",
      "Wed -> Jiju drives (Vinil absent)",
      "Thu -> Administrator drives",
      "Fri -> Next driver adjusts based on missed rides",
    ],
    calloutLabel: "Weekly view",
    calloutValue: "Fairness follows real trips",
  },
  finalCta: {
    title: "Start your car pool in minutes",
    description:
      "Create your group, log your first trip, and let the app handle the rotation.",
    primaryCta: {
      label: "Open Workspace",
      href: startHref,
    },
    secondaryCta: {
      label: "Back to Apps",
      href: "/",
      variant: "ghost",
    },
  },
});
