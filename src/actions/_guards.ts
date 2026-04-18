import { ActionError, type ActionAPIContext } from "astro:actions";

type AuthUser = NonNullable<App.Locals["user"]>;

const ADMIN_ROLE_ID = 1;

export const requireUser = (context: ActionAPIContext): AuthUser => {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;
  if (!locals?.isAuthenticated || !user) {
    throw new ActionError({ code: "UNAUTHORIZED", message: "Sign in required" });
  }
  return user as AuthUser;
};

export const requireAdmin = (context: ActionAPIContext): AuthUser => {
  const user = requireUser(context);
  const roleId = Number(user?.roleId);
  if (!Number.isFinite(roleId) || roleId !== ADMIN_ROLE_ID) {
    throw new ActionError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return user;
};

export const requirePro = (context: ActionAPIContext): AuthUser => {
  const user = requireUser(context);
  if (!user?.isPaid) {
    throw new ActionError({ code: "PAYMENT_REQUIRED", message: "Pro access required" });
  }
  return user;
};
