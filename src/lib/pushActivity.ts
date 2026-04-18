import { APP_META } from "../app.meta";
import type { AppStarterDashboardSummaryV1 } from "../dashboard/summary.schema";
import { postWebhook } from "./webhook";

const resolveActivityUrl = (baseUrl?: string | null, overrideUrl?: string | null) => {
  if (overrideUrl) return overrideUrl;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/${APP_META.key}-activity.json`;
};

type AppStarterActivity = {
  event: string;
  occurredAt: string;
  entityId?: string;
};

export const pushAppStarterActivity = async (params: {
  userId: string;
  activity: AppStarterActivity;
  summary: AppStarterDashboardSummaryV1;
}): Promise<void> => {
  try {
    const baseUrl = import.meta.env.PARENT_APP_URL;
    const overrideUrl = import.meta.env.PARENT_ACTIVITY_WEBHOOK_URL;
    const secret = import.meta.env.ANSIVERSA_WEBHOOK_SECRET;

    const url = resolveActivityUrl(baseUrl, overrideUrl);
    const payload = {
      userId: params.userId,
      appId: APP_META.key,
      activity: params.activity,
      summary: params.summary,
    };

    await postWebhook({
      url,
      secret,
      payload,
      appKey: APP_META.key,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("pushAppStarterActivity failed", error);
    }
  }
};
