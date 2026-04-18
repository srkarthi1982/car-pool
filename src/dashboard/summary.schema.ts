import { APP_META } from "../app.meta";

export type AppStarterDashboardSummaryV1 = {
  appId: typeof APP_META.key;
  version: 1;
  updatedAt: string;
  status: "ready";
  primaryRoute: "/app";
};

export const buildAppStarterSummary = async (): Promise<AppStarterDashboardSummaryV1> => {
  return {
    appId: APP_META.key,
    version: 1,
    updatedAt: new Date().toISOString(),
    status: "ready",
    primaryRoute: "/app",
  };
};
