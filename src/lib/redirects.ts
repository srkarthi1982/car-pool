export const getSafeReturnTo = (value: string | null, fallbackUrl: string) => {
  if (!value) return fallbackUrl;
  try {
    const fallback = new URL(fallbackUrl);
    const resolved = new URL(value, fallback);
    if (resolved.origin !== fallback.origin) return fallback.toString();
    return resolved.toString();
  } catch {
    return fallbackUrl;
  }
};

export const buildRootRedirect = (rootAppUrl: string, path: string, returnTo?: string | null) => {
  const target = new URL(path, rootAppUrl);
  if (returnTo) {
    target.searchParams.set("returnTo", returnTo);
  }
  return target.toString();
};
