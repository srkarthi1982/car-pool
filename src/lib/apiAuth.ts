import type { APIContext } from "astro";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth";

const ADMIN_ROLE_ID = 1;

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const resolveApiToken = (cookies: APIContext["cookies"], authorizationHeader?: string | null) => {
  const cookieToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  if (!authorizationHeader) return null;
  const [scheme, value] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
};

export const requireAdminApiAccess = (
  cookies: APIContext["cookies"],
  request: Request,
): Response | null => {
  const token = resolveApiToken(cookies, request.headers.get("authorization"));
  const session = token ? verifySessionToken(token) : null;

  if (!session?.userId) {
    return json(401, { error: "Unauthorized.", code: "UNAUTHORIZED" });
  }

  const roleId = Number(session.roleId);
  if (!Number.isFinite(roleId) || roleId !== ADMIN_ROLE_ID) {
    return json(403, { error: "Forbidden.", code: "FORBIDDEN" });
  }

  return null;
};
