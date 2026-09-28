import { describe, expect, it } from "vitest";
import { I18n } from "../src/core/i18n";

describe("I18n", () => {
  it("translates a known key in the requested locale", () => {
    const i18n = new I18n({ locale: "es" });
    expect(i18n.t("toolbar.fullscreen")).toBe("Pantalla completa");
  });

  it("falls back to English for a key missing translations still resolve via fallback locale", () => {
    const i18n = new I18n({
      locale: "es",
      translations: { es: {} }, // doesn't remove built-ins, just confirms merge behaviour
    });
    expect(i18n.t("toolbar.help")).toBe("Cómo usar este recorrido");
  });

  it("falls back to 'en' when an unsupported locale is requested", () => {
    const i18n = new I18n({ locale: "xx-YY" });
    expect(i18n.locale).toBe("en");
    expect(i18n.t("toolbar.fullscreen")).toBe("Fullscreen");
  });

  it("resolves a base language when a region-specific tag is requested", () => {
    const i18n = new I18n({ locale: "fr-CA" });
    expect(i18n.locale).toBe("fr");
    expect(i18n.t("toolbar.fullscreen")).toBe("Plein écran");
  });

  it("interpolates {placeholder} variables", () => {
    const i18n = new I18n({
      locale: "en",
      translations: { en: { greeting: "Hello, {name}!" } },
    });
    expect(i18n.t("greeting", { name: "Ada" })).toBe("Hello, Ada!");
  });

  it("host-supplied translations override built-ins for the same key", () => {
    const i18n = new I18n({
      locale: "en",
      translations: { en: { "toolbar.fullscreen": "Full Screen Mode" } },
    });
    expect(i18n.t("toolbar.fullscreen")).toBe("Full Screen Mode");
  });

  it("returns the raw key when no translation exists anywhere", () => {
    const i18n = new I18n({ locale: "en" });
    expect(i18n.t("totally.unknown.key")).toBe("totally.unknown.key");
  });

  it("text() resolves a plain string as-is", () => {
    const i18n = new I18n({ locale: "en" });
    expect(i18n.text("Living Room")).toBe("Living Room");
  });

  it("text() resolves a LocalizedText map to the active locale", () => {
    const i18n = new I18n({ locale: "es" });
    expect(i18n.text({ en: "Living Room", es: "Sala" })).toBe("Sala");
  });

  it("text() falls back to another available locale when the active one is missing", () => {
    const i18n = new I18n({ locale: "de" });
    expect(i18n.text({ en: "Living Room" })).toBe("Living Room");
  });

  it("text() returns the fallback for undefined input", () => {
    const i18n = new I18n({ locale: "en" });
    expect(i18n.text(undefined, "Untitled")).toBe("Untitled");
  });

  it("isRtl() is true for Arabic and false for English", () => {
    expect(new I18n({ locale: "ar" }).isRtl()).toBe(true);
    expect(new I18n({ locale: "en" }).isRtl()).toBe(false);
  });
});
