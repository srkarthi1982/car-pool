import type { Alpine } from "alpinejs";
import { registerAppDrawerStore } from "./modules/app/drawerStore";
import { registerCarPoolAppStore } from "./modules/app/carPoolStore";

export default function initAlpine(Alpine: Alpine) {
  registerAppDrawerStore(Alpine);
  registerCarPoolAppStore(Alpine);

  if (typeof window !== "undefined") {
    window.Alpine = Alpine;
  }
}
