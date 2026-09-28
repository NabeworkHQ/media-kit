import { el as h } from "./dom";
import type { I18n } from "../i18n";
import type { MediaKitStorage, MediaType } from "../types";

const STORAGE_KEY = "nmk.onboarding.dismissed";

const TIPS_BY_TYPE: Record<MediaType, string[]> = {
  image: ["onboarding.drag", "onboarding.scroll"],
  video: [],
  document: [],
  panorama: ["onboarding.drag", "onboarding.scroll", "onboarding.hotspot"],
  "panorama-tour": ["onboarding.drag", "onboarding.scroll", "onboarding.hotspot"],
  model3d: ["onboarding.drag", "onboarding.scroll"],
  "vr-tour": ["onboarding.drag", "onboarding.wasd", "onboarding.joystick", "onboarding.hotspot"],
};

export interface OnboardingOptions {
  container: HTMLElement;
  i18n: I18n;
  storage: MediaKitStorage;
}

/**
 * A dismissible "how to get around" overlay shown the first time a visitor
 * opens a given media type (drag-to-look, WASD, joystick, hotspots...).
 * Persists dismissal via the injected storage adapter so it won't nag
 * returning visitors.
 */
export class Onboarding {
  private overlay?: HTMLDivElement;

  constructor(private opts: OnboardingOptions) {}

  hasBeenDismissed(): boolean {
    return this.opts.storage.get(STORAGE_KEY) === "1";
  }

  showFor(type: MediaType): void {
    if (this.hasBeenDismissed()) return;
    this.show(type);
  }

  /** Force-show regardless of dismissal state (used by the toolbar "?" button). */
  show(type: MediaType): void {
    this.hide();
    const { i18n } = this.opts;
    const tips = TIPS_BY_TYPE[type] ?? [];
    if (tips.length === 0) return;

    const list = h(
      "ul",
      { class: "nmk-onboarding__list" },
      tips.map((key) => h("li", {}, [i18n.t(key)]))
    );

    const dontShow = h("label", { class: "nmk-onboarding__checkbox" }, [
      h("input", { type: "checkbox" }),
      ` ${i18n.t("onboarding.dontShowAgain")}`,
    ]);
    const checkbox = dontShow.querySelector("input") as HTMLInputElement;

    const dismissBtn = h("button", { type: "button", class: "nmk-onboarding__dismiss" }, [
      i18n.t("onboarding.dismiss"),
    ]);
    dismissBtn.addEventListener("click", () => {
      if (checkbox.checked) this.opts.storage.set(STORAGE_KEY, "1");
      this.hide();
    });

    const card = h("div", { class: "nmk-onboarding__card" }, [
      h("h3", {}, [i18n.t("onboarding.title")]),
      list,
      dontShow,
      dismissBtn,
    ]);

    this.overlay = h("div", { class: "nmk-onboarding", role: "dialog", "aria-modal": "true" }, [card]);
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.opts.container.appendChild(this.overlay);
  }

  hide(): void {
    this.overlay?.remove();
    this.overlay = undefined;
  }

  destroy(): void {
    this.hide();
  }
}

export default Onboarding;
