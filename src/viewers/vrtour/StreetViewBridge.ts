import type { StreetViewEntry } from "../../core/types";
import { el as h } from "../../core/ui/dom";

declare global {
  interface Window {
    google?: any;
    __nmkGoogleMapsCallbacks?: Array<() => void>;
  }
}

let loaderPromise: Promise<void> | null = null;

/**
 * Lazily loads the Google Maps JavaScript API (only if a `vr-tour` item
 * actually declares a `streetView` entry - most galleries never pay this
 * cost). See docs/STREET_VIEW_INTEGRATION.md for API key / billing notes.
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = "__nmkOnGoogleMapsLoaded";
    (window as any)[callbackName] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps JavaScript API"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export interface StreetViewBridgeOptions {
  container: HTMLElement;
  entry: StreetViewEntry;
  enterLabel: string;
  onEnter: () => void;
}

/**
 * Renders a Street View panorama the visitor can look around in, plus an
 * "enter" control that hands off to the indoor tour. This mirrors the
 * common real-estate UX of walking up the driveway on Street View and then
 * stepping into a Matterport-style indoor walkthrough.
 */
export class StreetViewBridge {
  private root: HTMLDivElement;
  private panoEl: HTMLDivElement;
  private enterBtn: HTMLButtonElement;
  private panorama?: any;
  private disposed = false;

  constructor(private opts: StreetViewBridgeOptions) {
    this.root = h("div", { class: "nmk-streetview-bridge" });
    this.panoEl = h("div", { class: "nmk-streetview-bridge__pano" });
    this.enterBtn = h("button", { type: "button", class: "nmk-streetview-bridge__enter" }, [
      opts.enterLabel,
    ]) as HTMLButtonElement;

    this.root.append(this.panoEl, this.enterBtn);
    opts.container.appendChild(this.root);

    this.enterBtn.addEventListener("click", () => this.opts.onEnter());

    void this.init();
  }

  private async init(): Promise<void> {
    try {
      await loadGoogleMaps(this.opts.entry.apiKey);
      if (this.disposed) return;
      const { google } = window;
      this.panorama = new google.maps.StreetViewPanorama(this.panoEl, {
        position: this.opts.entry.position,
        pov: this.opts.entry.pov ?? { heading: 0, pitch: 0 },
        zoom: this.opts.entry.pov?.zoom ?? 1,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        linksControl: true,
        panControl: true,
      });
    } catch (err) {
      // Fail soft: hide the bridge and let the caller fall straight through
      // to the indoor tour rather than blocking the whole experience.
      // eslint-disable-next-line no-console
      console.error("[media-kit] Street View failed to load", err);
      this.opts.onEnter();
    }
  }

  destroy(): void {
    this.disposed = true;
    this.root.remove();
  }
}

export default StreetViewBridge;
