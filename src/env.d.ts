/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Secret used for JWT / session signing */
  readonly ANSIVERSA_AUTH_SECRET?: string;

  /** Secret used for cookie encryption / session management */
  readonly ANSIVERSA_SESSION_SECRET: string;

  /** Domain for cookies (e.g., ansiversa.com) */
  readonly ANSIVERSA_COOKIE_DOMAIN?: string;

  /** Optional: Override the default session cookie name */
  readonly SESSION_COOKIE_NAME?: string;

  /** Optional: Override the root app URL (fallback: https://ansiversa.com) */
  readonly PUBLIC_ROOT_APP_URL?: string;

  /** Optional: Parent app URL (fallback to root app URL) */
  readonly PARENT_APP_URL?: string;

  /** Optional: Webhook secret for parent app integrations */
  readonly ANSIVERSA_WEBHOOK_SECRET?: string;

  /** Optional: Parent notification webhook URL override */
  readonly PARENT_NOTIFICATION_WEBHOOK_URL?: string;

  /** Optional: Parent activity webhook URL override */
  readonly PARENT_ACTIVITY_WEBHOOK_URL?: string;

  /** Optional: Dev-only auth bypass (requires import.meta.env.DEV) */
  readonly DEV_BYPASS_AUTH?: string;

  /** Optional: Dev-only override for bypass user id */
  readonly DEV_BYPASS_USER_ID?: string;

  /** Optional: Dev-only override for bypass user email */
  readonly DEV_BYPASS_EMAIL?: string;

  /** Optional: Dev-only override for bypass user role id */
  readonly DEV_BYPASS_ROLE_ID?: string;
}

interface Window {
  Alpine: import('alpinejs').Alpine;
}

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      name?: string;
      roleId?: number;
      stripeCustomerId: string | null;
      plan: string | null;
      planStatus: string | null;
      isPaid: boolean;
      renewalAt: number | null;
    };
    session?: {
      userId: string;
      roleId: string | null;
      plan: string | null;
      planStatus: string | null;
      isPaid: boolean;
      renewalAt: number | null;
    };
    sessionToken?: string | null;
    isAuthenticated?: boolean;
    rootAppUrl?: string;
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
