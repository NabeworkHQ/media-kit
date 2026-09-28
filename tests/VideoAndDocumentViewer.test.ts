import { describe, expect, it, vi } from "vitest";
import { VideoViewer } from "../src/viewers/VideoViewer";
import { DocumentViewer } from "../src/viewers/DocumentViewer";
import { I18n } from "../src/core/i18n";
import type { DocumentItem, VideoItem, ViewerDeps } from "../src/core/types";

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

describe("VideoViewer", () => {
  const item: VideoItem = {
    id: "vid-1",
    type: "video",
    src: "https://example.com/tour.mp4",
    poster: "https://example.com/poster.jpg",
    captions: [{ src: "https://example.com/en.vtt", srclang: "en", label: "English", default: true }],
  };

  it("mounts a native <video> with the source and poster wired up", () => {
    const el = document.createElement("div");
    new VideoViewer().mount(el, item, makeDeps());

    const video = el.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.getAttribute("poster")).toBe(item.poster);
    expect(video?.querySelector("source")?.getAttribute("src")).toBe(item.src);
  });

  it("adds a <track> per caption entry", () => {
    const el = document.createElement("div");
    new VideoViewer().mount(el, item, makeDeps());

    const track = el.querySelector("track");
    expect(track?.getAttribute("srclang")).toBe("en");
    expect(track?.getAttribute("label")).toBe("English");
  });

  it("emits video:play / video:pause / video:ended on native events", () => {
    const el = document.createElement("div");
    const emit = vi.fn();
    new VideoViewer().mount(el, item, makeDeps({ emit }));
    const video = el.querySelector("video")!;

    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("pause"));
    video.dispatchEvent(new Event("ended"));

    expect(emit).toHaveBeenCalledWith("video:play", { id: "vid-1" });
    expect(emit).toHaveBeenCalledWith("video:pause", { id: "vid-1" });
    expect(emit).toHaveBeenCalledWith("video:ended", { id: "vid-1" });
  });

  it("reports a MediaKitError when the video element fires 'error'", () => {
    const el = document.createElement("div");
    const onError = vi.fn();
    new VideoViewer().mount(el, item, makeDeps({ onError }));
    el.querySelector("video")!.dispatchEvent(new Event("error"));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "VIDEO_LOAD_FAILED" }));
  });
});

describe("DocumentViewer", () => {
  const item: DocumentItem = { id: "doc-1", type: "document", src: "https://example.com/brochure.pdf" };

  it("falls back to an <iframe> when pdf.js isn't installed", async () => {
    const el = document.createElement("div");
    await new DocumentViewer().mount(el, item, makeDeps());

    const iframe = el.querySelector("iframe.nmk-document-viewer__iframe");
    expect(iframe?.getAttribute("src")).toBe(item.src);
  });
});
