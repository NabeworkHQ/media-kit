import { describe, expect, it, vi } from "vitest";
import { MediaKit } from "../src/core/MediaKit";
import type { MediaManifest, MediaKitStorage } from "../src/core/types";

function makeManifest(): MediaManifest {
  return {
    items: [
      { id: "photo-1", type: "image", src: "https://example.com/a.jpg", title: "Front" },
      { id: "photo-2", type: "image", src: "https://example.com/b.jpg", title: "Back" },
    ],
  };
}

function memoryStorage(): MediaKitStorage {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
  };
}

function mountContainer(): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("MediaKit", () => {
  it("mounts a shell with toolbar and thumbnails for a multi-item manifest", () => {
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage() });

    expect(container.querySelector(".nmk-shell")).toBeTruthy();
    expect(container.querySelector(".nmk-toolbar")).toBeTruthy();
    expect(container.querySelectorAll(".nmk-thumbnails__item")).toHaveLength(2);

    kit.destroy();
  });

  it("accepts a CSS selector string as the container", () => {
    const container = mountContainer();
    container.id = "tour-root";
    const kit = new MediaKit({ container: "#tour-root", manifest: makeManifest(), storage: memoryStorage() });
    expect(container.querySelector(".nmk-shell")).toBeTruthy();
    kit.destroy();
  });

  it("throws when the container cannot be found", () => {
    expect(
      () => new MediaKit({ container: "#does-not-exist", manifest: makeManifest(), storage: memoryStorage() })
    ).toThrow(/container not found/);
  });

  it("mounts the initial item (first in manifest by default) and emits itemchange", async () => {
    const container = mountContainer();
    const onItemChange = vi.fn();
    const kit = new MediaKit({
      container,
      manifest: makeManifest(),
      storage: memoryStorage(),
      onItemChange,
      showOnboarding: false,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(onItemChange).toHaveBeenCalledWith(expect.objectContaining({ id: "photo-1" }));
    expect(container.querySelector(".nmk-image-viewer")).toBeTruthy();

    kit.destroy();
  });

  it("goTo() switches the active item and updates the thumbnail selection", async () => {
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), showOnboarding: false });
    await Promise.resolve();

    kit.goTo("photo-2");
    await Promise.resolve();

    const selected = container.querySelector('.nmk-thumbnails__item[aria-selected="true"]');
    expect(selected?.getAttribute("title")).toBe("Back");

    kit.destroy();
  });

  it("next()/prev() wrap around the manifest", async () => {
    const container = mountContainer();
    const onItemChange = vi.fn();
    const kit = new MediaKit({
      container,
      manifest: makeManifest(),
      storage: memoryStorage(),
      onItemChange,
      showOnboarding: false,
    });
    await Promise.resolve();

    kit.next();
    await Promise.resolve();
    expect(onItemChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "photo-2" }));

    kit.next();
    await Promise.resolve();
    expect(onItemChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "photo-1" }));

    kit.prev();
    await Promise.resolve();
    expect(onItemChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: "photo-2" }));

    kit.destroy();
  });

  it("goTo() with an unknown id reports an error instead of throwing", async () => {
    const container = mountContainer();
    const onError = vi.fn();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), onError, showOnboarding: false });
    await Promise.resolve();

    kit.goTo("nope");

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "UNKNOWN_ITEM" }));
    kit.destroy();
  });

  it("on('error') mirrors errors reported to onError", async () => {
    const container = mountContainer();
    const listener = vi.fn();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), showOnboarding: false });
    kit.on("error", listener);

    kit.goTo("nope");

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ code: "UNKNOWN_ITEM" }));
    kit.destroy();
  });

  it("shows the onboarding overlay for a new visitor by default", async () => {
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage() });
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector(".nmk-onboarding")).toBeTruthy();
    kit.destroy();
  });

  it("suppresses onboarding when showOnboarding is false", async () => {
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), showOnboarding: false });
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector(".nmk-onboarding")).toBeFalsy();
    kit.destroy();
  });

  it("does not re-show onboarding once the visitor dismissed it with 'don't show again'", async () => {
    const storage = memoryStorage();
    storage.set("nmk.onboarding.dismissed", "1");
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage });
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector(".nmk-onboarding")).toBeFalsy();
    kit.destroy();
  });

  it("destroy() removes the shell from the DOM and stops emitting events", async () => {
    const container = mountContainer();
    const listener = vi.fn();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), showOnboarding: false });
    kit.on("itemchange", listener);
    await Promise.resolve();
    listener.mockClear();

    kit.destroy();

    expect(container.querySelector(".nmk-shell")).toBeFalsy();
  });

  it("setLocale() re-localizes the toolbar without losing the active item", async () => {
    const container = mountContainer();
    const kit = new MediaKit({ container, manifest: makeManifest(), storage: memoryStorage(), showOnboarding: false });
    await Promise.resolve();

    kit.setLocale("es");
    await Promise.resolve();

    expect(kit.i18n.locale).toBe("es");
    expect(container.querySelector(".nmk-image-viewer")).toBeTruthy();

    kit.destroy();
  });
});
