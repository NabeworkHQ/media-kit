import { describe, expect, it, vi } from "vitest";
import { Toolbar } from "../src/core/ui/Toolbar";
import { Onboarding } from "../src/core/ui/Onboarding";
import { Thumbnails } from "../src/core/ui/Thumbnails";
import { createDefaultStorage } from "../src/core/storage";
import { I18n } from "../src/core/i18n";
import type { MediaItem, MediaKitStorage } from "../src/core/types";

function memoryStorage(): MediaKitStorage {
  const map = new Map<string, string>();
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) };
}

describe("Toolbar", () => {
  it("renders a fullscreen button and a help button", () => {
    const container = document.createElement("div");
    new Toolbar({
      container,
      i18n: new I18n({ locale: "en" }),
      locales: ["en"],
      onToggleFullscreen: vi.fn(),
      onHelp: vi.fn(),
      onLocaleChange: vi.fn(),
    });

    expect(container.querySelector(".nmk-toolbar__fullscreen")).toBeTruthy();
    expect(container.querySelector(".nmk-toolbar__help")).toBeTruthy();
  });

  it("omits the language <select> when only one locale is supported", () => {
    const container = document.createElement("div");
    new Toolbar({
      container,
      i18n: new I18n({ locale: "en" }),
      locales: ["en"],
      onToggleFullscreen: vi.fn(),
      onHelp: vi.fn(),
      onLocaleChange: vi.fn(),
    });
    expect(container.querySelector(".nmk-toolbar__locale")).toBeFalsy();
  });

  it("invokes onLocaleChange when a different language is selected", () => {
    const container = document.createElement("div");
    const onLocaleChange = vi.fn();
    new Toolbar({
      container,
      i18n: new I18n({ locale: "en" }),
      locales: ["en", "es"],
      onToggleFullscreen: vi.fn(),
      onHelp: vi.fn(),
      onLocaleChange,
    });

    const select = container.querySelector(".nmk-toolbar__locale") as HTMLSelectElement;
    select.value = "es";
    select.dispatchEvent(new Event("change"));

    expect(onLocaleChange).toHaveBeenCalledWith("es");
  });

  it("clicking fullscreen calls onToggleFullscreen", () => {
    const container = document.createElement("div");
    const onToggleFullscreen = vi.fn();
    new Toolbar({
      container,
      i18n: new I18n({ locale: "en" }),
      locales: ["en"],
      onToggleFullscreen,
      onHelp: vi.fn(),
      onLocaleChange: vi.fn(),
    });
    (container.querySelector(".nmk-toolbar__fullscreen") as HTMLButtonElement).click();
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});

describe("Onboarding", () => {
  it("showFor() renders tips for a type that has them", () => {
    const container = document.createElement("div");
    const onboarding = new Onboarding({ container, i18n: new I18n({ locale: "en" }), storage: memoryStorage() });
    onboarding.showFor("vr-tour");
    expect(container.querySelector(".nmk-onboarding")).toBeTruthy();
    expect(container.querySelectorAll(".nmk-onboarding__list li").length).toBeGreaterThan(0);
  });

  it("showFor() is a no-op for a type with no tips (e.g. video)", () => {
    const container = document.createElement("div");
    const onboarding = new Onboarding({ container, i18n: new I18n({ locale: "en" }), storage: memoryStorage() });
    onboarding.showFor("video");
    expect(container.querySelector(".nmk-onboarding")).toBeFalsy();
  });

  it("checking 'don't show again' and dismissing persists via storage", () => {
    const container = document.createElement("div");
    const storage = memoryStorage();
    const onboarding = new Onboarding({ container, i18n: new I18n({ locale: "en" }), storage });
    onboarding.show("model3d");

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    (container.querySelector(".nmk-onboarding__dismiss") as HTMLButtonElement).click();

    expect(onboarding.hasBeenDismissed()).toBe(true);
    expect(container.querySelector(".nmk-onboarding")).toBeFalsy();
  });

  it("dismissing without checking the box does not persist dismissal", () => {
    const container = document.createElement("div");
    const storage = memoryStorage();
    const onboarding = new Onboarding({ container, i18n: new I18n({ locale: "en" }), storage });
    onboarding.show("model3d");
    (container.querySelector(".nmk-onboarding__dismiss") as HTMLButtonElement).click();
    expect(onboarding.hasBeenDismissed()).toBe(false);
  });

  it("showFor() does nothing once dismissal has been persisted", () => {
    const container = document.createElement("div");
    const storage = memoryStorage();
    storage.set("nmk.onboarding.dismissed", "1");
    const onboarding = new Onboarding({ container, i18n: new I18n({ locale: "en" }), storage });
    onboarding.showFor("vr-tour");
    expect(container.querySelector(".nmk-onboarding")).toBeFalsy();
  });
});

describe("Thumbnails", () => {
  const items: MediaItem[] = [
    { id: "a", type: "image", src: "a.jpg", title: "A" },
    { id: "b", type: "image", src: "b.jpg", title: "B" },
  ];

  it("renders one button per item and marks the active one selected", () => {
    const container = document.createElement("div");
    new Thumbnails({ container, i18n: new I18n({ locale: "en" }), items, activeId: "b", onSelect: vi.fn() });

    const buttons = container.querySelectorAll(".nmk-thumbnails__item");
    expect(buttons).toHaveLength(2);
    expect(buttons[1].getAttribute("aria-selected")).toBe("true");
    expect(buttons[0].getAttribute("aria-selected")).toBe("false");
  });

  it("clicking a thumbnail calls onSelect with that item's id", () => {
    const container = document.createElement("div");
    const onSelect = vi.fn();
    new Thumbnails({ container, i18n: new I18n({ locale: "en" }), items, activeId: "a", onSelect });
    (container.querySelectorAll(".nmk-thumbnails__item")[1] as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("setActive() moves the aria-selected state to the new id", () => {
    const container = document.createElement("div");
    const thumbnails = new Thumbnails({
      container,
      i18n: new I18n({ locale: "en" }),
      items,
      activeId: "a",
      onSelect: vi.fn(),
    });
    thumbnails.setActive("b");
    const buttons = container.querySelectorAll(".nmk-thumbnails__item");
    expect(buttons[0].getAttribute("aria-selected")).toBe("false");
    expect(buttons[1].getAttribute("aria-selected")).toBe("true");
  });
});

describe("createDefaultStorage", () => {
  it("round-trips a value through localStorage", () => {
    const storage = createDefaultStorage("test-ns");
    storage.set("k", "v");
    expect(storage.get("k")).toBe("v");
  });

  it("namespaces keys so it can't collide with unrelated localStorage entries", () => {
    const storage = createDefaultStorage("test-ns");
    storage.set("k", "v");
    expect(window.localStorage.getItem("k")).toBeNull();
    expect(window.localStorage.getItem("test-ns:k")).toBe("v");
  });

  it("returns null for a key that was never set", () => {
    const storage = createDefaultStorage("test-ns");
    expect(storage.get("missing")).toBeNull();
  });
});
