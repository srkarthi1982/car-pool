const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_RETRIES = 2;

export const postWebhook = async (params: {
  url: string | null;
  secret?: string | null;
  payload: Record<string, unknown>;
  appKey: string;
  timeoutMs?: number;
  retries?: number;
}): Promise<void> => {
  const url = params.url;
  const secret = params.secret;
  if (!url || !secret) {
    if (import.meta.env.DEV) {
      console.warn(
        `postWebhook skipped: missing url/secret (appKey=${params.appKey})`,
      );
    }
    return;
  }

  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = params.retries ?? DEFAULT_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ansiversa-Signature": secret,
        },
        body: JSON.stringify(params.payload),
        signal: controller.signal,
      });
      return;
    } catch (error) {
      if (attempt >= retries) {
        if (import.meta.env.DEV) {
          console.warn(`postWebhook failed (appKey=${params.appKey})`, error);
        }
        return;
      }
      const delay = 400 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timeout);
    }
  }
};
