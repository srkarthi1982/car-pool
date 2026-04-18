import { createHmac } from "node:crypto";

// Same secret as parent app
const SESSION_SECRET = import.meta.env.ANSIVERSA_SESSION_SECRET;
if (!SESSION_SECRET && !import.meta.env.DEV) {
  throw new Error("ANSIVERSA_SESSION_SECRET is required in production.");
}
const SESSION_SECRET_SAFE = SESSION_SECRET ?? "dev-ansiversa-session-secret";

// Shared cookie name for all Ansiversa apps
export const SESSION_COOKIE_NAME = import.meta.env.SESSION_COOKIE_NAME ?? "ans_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name?: string;
  roleId?: number;
  stripeCustomerId?: string;
  plan?: string | null;
  planStatus?: string | null;
  isPaid?: boolean;
  renewalAt?: number | null;
  issuedAt: number;
};

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const hmac = createHmac("sha256", SESSION_SECRET_SAFE);
  hmac.update(body);
  const expected = hmac.digest("base64url");
  if (expected !== sig) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
