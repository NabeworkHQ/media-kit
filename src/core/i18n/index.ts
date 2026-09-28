import { locales, RTL_LOCALES } from "./locales";
import type { LocalizedText } from "../types";

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export interface I18nOptions {
  locale?: string;
  translations?: Record<string, Record<string, string>>;
  fallbackLocale?: string;
}

export class I18n {
  readonly locale: string;
  private readonly fallbackLocale: string;
  private readonly dict: Record<string, Record<string, string>>;

  constructor(opts: I18nOptions = {}) {
    this.fallbackLocale = opts.fallbackLocale ?? "en";
    this.locale = resolveLocale(opts.locale);
    this.dict = mergeDicts(locales, opts.translations);
  }

  isRtl(): boolean {
    return RTL_LOCALES.has(baseLang(this.locale));
  }

  /** Translate a UI string key, with `{placeholder}` interpolation. */
  t: Translator = (key, vars) => {
    const table = this.dict[this.locale] ?? this.dict[baseLang(this.locale)];
    const fallback = this.dict[this.fallbackLocale];
    let str = table?.[key] ?? fallback?.[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.split(`{${k}}`).join(String(v));
      }
    }
    return str;
  };

  /** Resolve a possibly-localized content field (item titles/descriptions/labels). */
  text(value: string | LocalizedText | undefined, fallback = ""): string {
    if (value == null) return fallback;
    if (typeof value === "string") return value;
    return (
      value[this.locale] ??
      value[baseLang(this.locale)] ??
      value[this.fallbackLocale] ??
      Object.values(value)[0] ??
      fallback
    );
  }
}

function baseLang(locale: string): string {
  return locale.split("-")[0].toLowerCase();
}

function resolveLocale(requested?: string): string {
  const candidate =
    requested ??
    (typeof navigator !== "undefined" ? navigator.language : undefined) ??
    "en";
  if (locales[candidate]) return candidate;
  const base = baseLang(candidate);
  if (locales[base]) return base;
  return "en";
}

function mergeDicts(
  base: Record<string, Record<string, string>>,
  overrides?: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
  if (!overrides) return base;
  const merged: Record<string, Record<string, string>> = {};
  const allLocales = new Set([...Object.keys(base), ...Object.keys(overrides)]);
  for (const loc of allLocales) {
    merged[loc] = { ...(base[loc] ?? {}), ...(overrides[loc] ?? {}) };
  }
  return merged;
}
