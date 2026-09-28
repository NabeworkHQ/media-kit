import { EventBus } from "./EventBus";
import { I18n } from "./i18n";
import { ViewerRegistry } from "./ViewerRegistry";
import { Toolbar } from "./ui/Toolbar";
import { Onboarding } from "./ui/Onboarding";
import { Thumbnails } from "./ui/Thumbnails";
import { el as h, clear } from "./ui/dom";
import { createDefaultStorage } from "./storage";
import { createDefaultRegistry } from "../viewers";
import {
  MediaKitError,
  type MediaItem,
  type MediaKitOptions,
  type MediaKitStorage,
  type Viewer,
} from "./types";

const SUPPORTED_LOCALES = ["en", "es", "fr", "ar"];

/**
 * The framework-agnostic entry point. Mounts a self-contained media viewer
 * (toolbar, thumbnail strip, onboarding, active viewer) into a container
 * element and manages switching between manifest items.
 *
 * Usage:
 *   const kit = new MediaKit({ container: "#tour", manifest });
 *   kit.on("itemchange", (item) => ...);
 *   kit.destroy();
 */
export class MediaKit {
  i18n: I18n;
  readonly registry: ViewerRegistry;
  private readonly bus = new EventBus();
  private readonly storage: MediaKitStorage;
  private readonly root: HTMLElement;
  private readonly shell: HTMLDivElement;
  private readonly viewerSlot: HTMLDivElement;
  private readonly chromeTop: HTMLDivElement;
  private readonly chromeBottom: HTMLDivElement;
  private toolbar?: Toolbar;
  private onboarding?: Onboarding;
  private thumbnails?: Thumbnails;
  private activeViewer?: Viewer;
  private activeItem?: MediaItem;
  private resizeObserver?: ResizeObserver;
  private locale: string;

  constructor(private readonly options: MediaKitOptions) {
    const container =
      typeof options.container === "string"
        ? document.querySelector<HTMLElement>(options.container)
        : options.container;
    if (!container) {
      throw new Error(`[media-kit] container not found: ${String(options.container)}`);
    }
    this.root = container;
    this.storage = options.storage ?? createDefaultStorage();
    this.i18n = new I18n({ locale: options.locale, translations: options.translations });
    this.locale = this.i18n.locale;
    this.registry = createDefaultRegistry();

    this.shell = h("div", { class: "nmk-shell", dir: this.i18n.isRtl() ? "rtl" : "ltr" });
    this.chromeTop = h("div", { class: "nmk-shell__top" });
    this.viewerSlot = h("div", { class: "nmk-shell__viewer" });
    this.chromeBottom = h("div", { class: "nmk-shell__bottom" });
    this.shell.append(this.chromeTop, this.viewerSlot, this.chromeBottom);
    this.root.appendChild(this.shell);
    this.root.classList.add("nmk-root");
    if (options.theme) this.shell.setAttribute("data-nmk-theme", options.theme);

    this.toolbar = new Toolbar({
      container: this.chromeTop,
      i18n: this.i18n,
      locales: SUPPORTED_LOCALES,
      onToggleFullscreen: () => this.toggleFullscreen(),
      onHelp: () => this.activeItem && this.onboarding?.show(this.activeItem.type),
      onLocaleChange: (locale) => this.setLocale(locale),
    });

    this.onboarding = new Onboarding({ container: this.shell, i18n: this.i18n, storage: this.storage });

    if (options.showThumbnails !== false && options.manifest.items.length > 1) {
      this.thumbnails = new Thumbnails({
        container: this.chromeBottom,
        i18n: this.i18n,
        items: options.manifest.items,
        activeId: options.manifest.initialItemId ?? options.manifest.items[0]?.id,
        onSelect: (id) => this.goTo(id),
      });
    }

    this.addResizeObserver();

    const initialId = options.manifest.initialItemId ?? options.manifest.items[0]?.id;
    if (initialId) this.goTo(initialId);

    document.addEventListener("fullscreenchange", this.onFullscreenChange);
  }

  /** Subscribe to kit-level events: "itemchange", "error", plus any viewer-emitted event (e.g. "panorama:hotspot-click"). */
  on<T = unknown>(event: string, listener: (payload: T) => void): () => void {
    return this.bus.on(event, listener);
  }

  goTo(itemId: string): void {
    const item = this.options.manifest.items.find((i) => i.id === itemId);
    if (!item) {
      this.handleError(new MediaKitError(`Unknown item id "${itemId}"`, "UNKNOWN_ITEM", itemId));
      return;
    }
    this.mountItem(item);
  }

  next(): void {
    this.stepBy(1);
  }

  prev(): void {
    this.stepBy(-1);
  }

  setLocale(locale: string): void {
    // Rebuilding the whole shell is the simplest correct way to re-localize
    // every piece of chrome (toolbar labels, onboarding copy, thumbnail
    // titles) without threading reactive state through each sub-component.
    const currentItemId = this.activeItem?.id;
    this.locale = locale;
    this.destroyChrome();
    clear(this.shell);
    this.i18n = new I18n({ locale, translations: this.options.translations });
    this.shell.setAttribute("dir", this.i18n.isRtl() ? "rtl" : "ltr");
    this.shell.append(this.chromeTop, this.viewerSlot, this.chromeBottom);
    this.buildChrome();
    if (currentItemId) this.goTo(currentItemId);
  }

  destroy(): void {
    this.activeViewer?.destroy();
    this.toolbar?.destroy();
    this.onboarding?.destroy();
    this.thumbnails?.destroy();
    this.resizeObserver?.disconnect();
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    this.bus.clear();
    this.shell.remove();
    this.root.classList.remove("nmk-root");
  }

  // -- internals -----------------------------------------------------------

  private buildChrome(): void {
    this.toolbar = new Toolbar({
      container: this.chromeTop,
      i18n: this.i18n,
      locales: SUPPORTED_LOCALES,
      onToggleFullscreen: () => this.toggleFullscreen(),
      onHelp: () => this.activeItem && this.onboarding?.show(this.activeItem.type),
      onLocaleChange: (locale) => this.setLocale(locale),
    });
    this.onboarding = new Onboarding({ container: this.shell, i18n: this.i18n, storage: this.storage });
    if (this.options.showThumbnails !== false && this.options.manifest.items.length > 1) {
      this.thumbnails = new Thumbnails({
        container: this.chromeBottom,
        i18n: this.i18n,
        items: this.options.manifest.items,
        activeId: this.activeItem?.id ?? this.options.manifest.items[0]?.id,
        onSelect: (id) => this.goTo(id),
      });
    }
  }

  private destroyChrome(): void {
    this.toolbar?.destroy();
    this.onboarding?.destroy();
    this.thumbnails?.destroy();
  }

  private stepBy(delta: number): void {
    const items = this.options.manifest.items;
    if (!this.activeItem || items.length === 0) return;
    const idx = items.findIndex((i) => i.id === this.activeItem!.id);
    const nextIdx = (idx + delta + items.length) % items.length;
    this.goTo(items[nextIdx].id);
  }

  private mountItem(item: MediaItem): void {
    this.activeViewer?.destroy();
    clear(this.viewerSlot);

    if (!this.registry.has(item.type)) {
      this.handleError(
        new MediaKitError(`No viewer registered for type "${item.type}"`, "UNSUPPORTED_TYPE", item.id)
      );
      return;
    }

    const viewer = this.registry.create(item.type);
    this.activeViewer = viewer;
    this.activeItem = item;
    this.thumbnails?.setActive(item.id);

    const deps = {
      locale: this.i18n.locale,
      t: this.i18n.t,
      text: this.i18n.text.bind(this.i18n),
      emit: (event: string, payload?: unknown) => this.bus.emit(event, payload),
      onError: (error: MediaKitError) => this.handleError(error),
    };

    Promise.resolve(viewer.mount(this.viewerSlot, item, deps))
      .then(() => {
        this.bus.emit("itemchange", item);
        this.options.onItemChange?.(item);
        if (this.options.showOnboarding !== false) {
          this.onboarding?.showFor(item.type);
        }
      })
      .catch((err) =>
        this.handleError(new MediaKitError("Viewer failed to mount", "MOUNT_FAILED", item.id, err))
      );
  }

  private handleError(error: MediaKitError): void {
    this.bus.emit("error", error);
    this.options.onError?.(error);
    // eslint-disable-next-line no-console
    console.error("[media-kit]", error);
  }

  private addResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      this.activeViewer?.resize?.(width, height);
    });
    this.resizeObserver.observe(this.viewerSlot);
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement === this.shell) {
      void document.exitFullscreen();
    } else {
      void this.shell.requestFullscreen?.();
    }
  }

  private onFullscreenChange = (): void => {
    this.toolbar?.setFullscreenState(document.fullscreenElement === this.shell);
  };
}

export default MediaKit;
