import { afterEach, vi } from "vitest";

// jsdom doesn't implement ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - test polyfill
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

// jsdom doesn't implement the Fullscreen API.
if (!("requestFullscreen" in HTMLElement.prototype)) {
  // @ts-expect-error - test polyfill
  HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
}
if (!("exitFullscreen" in Document.prototype)) {
  // @ts-expect-error - test polyfill
  Document.prototype.exitFullscreen = vi.fn().mockResolvedValue(undefined);
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage?.clear();
  vi.restoreAllMocks();
});
