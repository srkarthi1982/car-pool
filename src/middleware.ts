import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth";
import { middlewareConfig } from "./lib/middlewareConfig";

const STATIC_PREFIXES = ["/_astro/", "/assets/", "/icons/", "/images/"];
const STATIC_EXACT = new Set([
  "/robots.txt",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/favicon.svg",
]);
const FAVICON_PNG_PATTERN = /^\/favicon-[^/]+\.png$/i;

const COOKIE_DOMAIN = import.meta.env.ANSIVERSA_COOKIE_DOMAIN ?? (import.meta.env.DEV ? "localhost" : undefined);
if (!COOKIE_DOMAIN && !import.meta.env.DEV) {
  throw new Error("ANSIVERSA_COOKIE_DOMAIN is required in production.");
}

const ROOT_APP_URL =
  import.meta.env.PUBLIC_ROOT_APP_URL ??
  (import.meta.env.DEV ? "http://localhost:2000" : `https://${COOKIE_DOMAIN}`);

let hasLoggedDevPaidBypassWarning = false;

const readEnvValue = (key: string, source: "import-meta" | "process") => {
  if (source === "process") {
    const value = (globalThis as any).process?.env?.[key];
    return typeof value === "string" ? value : undefined;
  }
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};

const isStaticPath = (pathname: string) => {
  if (STATIC_EXACT.has(pathname) || FAVICON_PNG_PATTERN.test(pathname)) return true;
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return middlewareConfig.extraPublicPathPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const shouldRequireAuth = (pathname: string) => {
  if (middlewareConfig.routeProtection.mode === "protectPrefixes") {
    return middlewareConfig.routeProtection.protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  }
  if (middlewareConfig.routeProtection.publicRoutes.has(pathname)) return false;
  if (middlewareConfig.routeProtection.apiBypassRoutes.has(pathname)) return false;
  return true;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url } = context;
  const pathname = url.pathname;

  if (isStaticPath(pathname)) {
    return next();
  }

  locals.user = locals.user ?? undefined;
  locals.sessionToken = null;
  locals.isAuthenticated = false;
  locals.rootAppUrl = ROOT_APP_URL;
  locals.session = {
    userId: "",
    roleId: null,
    plan: null,
    planStatus: null,
    isPaid: false,
    renewalAt: null,
  };

  const token = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = verifySessionToken(token);

    if (payload?.userId) {
      const roleId = payload.roleId ? Number(payload.roleId) : undefined;

      locals.user = {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        roleId: Number.isFinite(roleId) ? roleId : undefined,
        stripeCustomerId: payload.stripeCustomerId ?? null,
        plan: payload.plan ?? null,
        planStatus: payload.planStatus ?? null,
        isPaid: payload.isPaid === true,
        renewalAt: payload.renewalAt ?? null,
      };
      locals.session = {
        userId: payload.userId,
        roleId: payload.roleId ? String(payload.roleId) : null,
        plan: payload.plan ?? null,
        planStatus: payload.planStatus ?? null,
        isPaid: payload.isPaid === true,
        renewalAt: typeof payload.renewalAt === "number" ? payload.renewalAt : null,
      };

      locals.sessionToken = token;
      locals.isAuthenticated = true;
    } else {
      locals.user = undefined;
      locals.sessionToken = null;
      locals.isAuthenticated = false;
    }
  }

  const bypassFlag = readEnvValue("DEV_BYPASS_AUTH", middlewareConfig.devBypass.envSource);
  const isDevBypassEnabled =
    import.meta.env.DEV && middlewareConfig.devBypass.enabled && bypassFlag === "true";

  if (!locals.isAuthenticated && isDevBypassEnabled) {
    const devUserId =
      readEnvValue("DEV_BYPASS_USER_ID", middlewareConfig.devBypass.envSource) ??
      middlewareConfig.devBypass.defaultUserId;
    const devEmail =
      readEnvValue("DEV_BYPASS_EMAIL", middlewareConfig.devBypass.envSource) ??
      middlewareConfig.devBypass.defaultEmail;
    const devRoleIdRaw = readEnvValue("DEV_BYPASS_ROLE_ID", middlewareConfig.devBypass.envSource);
    const parsedRoleId = devRoleIdRaw ? Number.parseInt(devRoleIdRaw, 10) : NaN;
    const devRoleId = Number.isFinite(parsedRoleId)
      ? parsedRoleId
      : middlewareConfig.devBypass.defaultRoleId;

    const isPaidBypassRequested =
      middlewareConfig.devBypass.allowPaidBypass &&
      readEnvValue("DEV_BYPASS_IS_PAID", middlewareConfig.devBypass.envSource) === "true";

    if (
      isPaidBypassRequested &&
      middlewareConfig.devBypass.warnOnPaidBypass &&
      !hasLoggedDevPaidBypassWarning
    ) {
      console.warn("⚠️ DEV_BYPASS_IS_PAID enabled — Pro gating bypassed for local verification only.");
      hasLoggedDevPaidBypassWarning = true;
    }

    locals.user = {
      id: devUserId,
      email: devEmail,
      roleId: devRoleId,
      stripeCustomerId: null,
      plan: isPaidBypassRequested ? "pro" : null,
      planStatus: isPaidBypassRequested ? "active" : null,
      isPaid: isPaidBypassRequested,
      renewalAt: null,
    };
    locals.session = {
      userId: devUserId,
      roleId: String(devRoleId),
      plan: isPaidBypassRequested ? "pro" : null,
      planStatus: isPaidBypassRequested ? "active" : null,
      isPaid: isPaidBypassRequested,
      renewalAt: null,
    };
    locals.sessionToken = null;
    locals.isAuthenticated = true;
  }

  if (!locals.isAuthenticated && shouldRequireAuth(pathname)) {
    const loginUrl = new URL("/login", ROOT_APP_URL);
    loginUrl.searchParams.set("returnTo", url.toString());
    return context.redirect(loginUrl.toString());
  }

  return next();
});
