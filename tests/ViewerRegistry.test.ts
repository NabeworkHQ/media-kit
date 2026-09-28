import { describe, expect, it, vi } from "vitest";
import { ViewerRegistry } from "../src/core/ViewerRegistry";
import type { Viewer } from "../src/core/types";

function fakeViewer(type: any): Viewer {
  return { type, mount: vi.fn(), destroy: vi.fn() };
}

describe("ViewerRegistry", () => {
  it("has() is false before registration and true after", () => {
    const registry = new ViewerRegistry();
    expect(registry.has("image")).toBe(false);
    registry.register("image", () => fakeViewer("image"));
    expect(registry.has("image")).toBe(true);
  });

  it("create() invokes the registered factory and returns a fresh viewer", () => {
    const registry = new ViewerRegistry();
    const factory = vi.fn(() => fakeViewer("video"));
    registry.register("video", factory);

    const viewer = registry.create("video");

    expect(factory).toHaveBeenCalledTimes(1);
    expect(viewer.type).toBe("video");
  });

  it("create() returns a new instance on every call (no accidental singleton)", () => {
    const registry = new ViewerRegistry();
    registry.register("image", () => fakeViewer("image"));
    const a = registry.create("image");
    const b = registry.create("image");
    expect(a).not.toBe(b);
  });

  it("create() throws a descriptive error for an unregistered type", () => {
    const registry = new ViewerRegistry();
    expect(() => registry.create("model3d")).toThrow(/model3d/);
  });

  it("a later register() call for the same type overrides the earlier one", () => {
    const registry = new ViewerRegistry();
    registry.register("document", () => fakeViewer("document-v1"));
    registry.register("document", () => fakeViewer("document-v2"));
    expect(registry.create("document").type).toBe("document-v2");
  });

  it("types() lists every registered media type", () => {
    const registry = new ViewerRegistry();
    registry.register("image", () => fakeViewer("image"));
    registry.register("video", () => fakeViewer("video"));
    expect(registry.types().sort()).toEqual(["image", "video"]);
  });
});
