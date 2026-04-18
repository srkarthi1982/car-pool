import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";

export type DrawerKey = "create" | "settings" | "section";
export type DrawerActionKey = "create" | "save" | "saveAndNext";

type DrawerErrors = Record<DrawerKey, string | null>;
type DrawerLoading = Record<DrawerActionKey, boolean>;

const defaultErrors = (): DrawerErrors => ({
  create: null,
  settings: null,
  section: null,
});

const defaultLoading = (): DrawerLoading => ({
  create: false,
  save: false,
  saveAndNext: false,
});

export class AppDrawerStore extends AvBaseStore {
  activeDrawer: DrawerKey | null = null;
  drawerErrorByKey: DrawerErrors = defaultErrors();
  loading: DrawerLoading = defaultLoading();

  open(drawerKey: DrawerKey) {
    this.activeDrawer = drawerKey;
    this.resetError(drawerKey);
  }

  close() {
    this.activeDrawer = null;
    this.resetError();
    this.resetLoading();
  }

  resetError(drawerKey?: DrawerKey) {
    if (drawerKey) {
      this.drawerErrorByKey[drawerKey] = null;
      return;
    }
    this.drawerErrorByKey = defaultErrors();
  }

  setError(message: string, drawerKey?: DrawerKey) {
    const key = drawerKey ?? this.activeDrawer;
    if (!key) return;
    this.drawerErrorByKey[key] = message;
  }

  getError(drawerKey?: DrawerKey) {
    const key = drawerKey ?? this.activeDrawer;
    return key ? this.drawerErrorByKey[key] : null;
  }

  setActionLoading(action: DrawerActionKey, value: boolean) {
    this.loading[action] = Boolean(value);
  }

  resetLoading() {
    this.loading = defaultLoading();
  }

  isActionLoading(action?: DrawerActionKey) {
    if (action) return this.loading[action];
    return Object.values(this.loading).some(Boolean);
  }

  async create() {
    // Scaffold stub: generated apps wire app-specific create action here.
  }

  async save() {
    // Scaffold stub: generated apps wire app-specific save action here.
  }

  async saveAndNext() {
    // Scaffold stub: generated apps wire app-specific save-and-next action here.
  }
}

export const registerAppDrawerStore = (Alpine: Alpine) => {
  Alpine.store("appDrawer", new AppDrawerStore());
};
