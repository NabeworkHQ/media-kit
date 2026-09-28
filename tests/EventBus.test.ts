import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/core/EventBus";

describe("EventBus", () => {
  it("calls subscribers with the emitted payload", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on<string>("hello", listener);
    bus.emit("hello", "world");
    expect(listener).toHaveBeenCalledWith("world");
  });

  it("supports multiple listeners for the same event", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("x", a);
    bus.on("x", b);
    bus.emit("x", 1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(1);
  });

  it("off() stops further notifications", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("x", listener);
    bus.off("x", listener);
    bus.emit("x", 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("the unsubscribe function returned by on() works", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const unsubscribe = bus.on("x", listener);
    unsubscribe();
    bus.emit("x", 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("once() only fires a single time", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.once("x", listener);
    bus.emit("x", 1);
    bus.emit("x", 2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("emitting an event with no listeners is a no-op", () => {
    const bus = new EventBus();
    expect(() => bus.emit("nothing")).not.toThrow();
  });

  it("a throwing listener does not prevent other listeners from running", () => {
    const bus = new EventBus();
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.on("x", bad);
    bus.on("x", good);
    expect(() => bus.emit("x", 1)).not.toThrow();
    expect(good).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it("clear() removes all listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("x", listener);
    bus.clear();
    bus.emit("x", 1);
    expect(listener).not.toHaveBeenCalled();
  });
});
