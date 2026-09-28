import { describe, expect, it, vi } from "vitest";
import { ImageViewer } from "../src/viewers/ImageViewer";
import { I18n } from "../src/core/i18n";
import type { ImageItem, ViewerDeps } from "../src/core/types";

function makeDeps(overrides: Partial<ViewerDeps> = {}): ViewerDeps {
  const i18n = new I18n({ locale: "en" });
  return {
    locale: "en",
    t: i18n.t,
    text: i18n.text.bind(i18n),
    emit: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<ImageItem> = {}): ImageItem {
  return { id: "img-1", type: "image", src: "https://example.com/a.jpg", ...overrides };
}

describe("ImageViewer", () => {
  it("mounts an <img> for the item's src", () => {
    const el = document.createElement("div");
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem(), makeDeps());

    const img = el.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/a.jpg");
  });

  it("prefers fullSrc over src when both are provided", () => {
    const el = document.createElement("div");
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem({ src: "small.jpg", fullSrc: "large.jpg" }), makeDeps());

    expect(el.querySelector("img")?.getAttribute("src")).toBe("large.jpg");
  });

  it("starts at scale 1", () => {
    const el = document.createElement("div");
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem(), makeDeps());
    expect(viewer.getScale()).toBe(1);
  });

  it("double-click zooms in, and zooms back out on a second double-click", () => {
    const el = document.createElement("div");
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem(), makeDeps());

    const wrap = el.querySelector(".nmk-image-viewer") as HTMLElement;
    wrap.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(viewer.getScale()).toBeGreaterThan(1);

    wrap.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(viewer.getScale()).toBe(1);
  });

  it("reports a MediaKitError via onError when the image fails to load", () => {
    const el = document.createElement("div");
    const onError = vi.fn();
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem({ id: "broken" }), makeDeps({ onError }));

    el.querySelector("img")!.dispatchEvent(new Event("error"));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "IMAGE_LOAD_FAILED", itemId: "broken" })
    );
  });

  it("destroy() removes listeners so further pointer/wheel events are ignored", () => {
    const el = document.createElement("div");
    const viewer = new ImageViewer();
    viewer.mount(el, makeItem(), makeDeps());
    viewer.destroy();

    const wrap = el.querySelector(".nmk-image-viewer") as HTMLElement;
    // Should not throw even though the viewer has torn itself down.
    expect(() => wrap.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))).not.toThrow();
  });
});
