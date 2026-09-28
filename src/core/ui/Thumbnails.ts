import { el as h } from "./dom";
import type { I18n } from "../i18n";
import type { MediaItem } from "../types";

export interface ThumbnailsOptions {
  container: HTMLElement;
  i18n: I18n;
  items: MediaItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

const TYPE_ICON: Record<string, string> = {
  image: "🖼",
  video: "🎬",
  document: "📄",
  panorama: "🧭",
  "panorama-tour": "🧭",
  model3d: "🧊",
  "vr-tour": "🎮",
};

export class Thumbnails {
  readonly el: HTMLDivElement;
  private buttons = new Map<string, HTMLButtonElement>();

  constructor(private opts: ThumbnailsOptions) {
    this.el = h("div", {
      class: "nmk-thumbnails",
      role: "tablist",
      "aria-label": opts.i18n.t("thumbnails.label"),
    });

    for (const item of opts.items) {
      const label = opts.i18n.text(item.title, item.id);
      const btn = h(
        "button",
        {
          type: "button",
          class: "nmk-thumbnails__item",
          role: "tab",
          "aria-selected": item.id === opts.activeId,
          title: label,
        },
        [
          item.thumbnail
            ? h("img", { src: item.thumbnail, alt: label, class: "nmk-thumbnails__img" })
            : h("span", { class: "nmk-thumbnails__icon" }, [TYPE_ICON[item.type] ?? "•"]),
        ]
      ) as HTMLButtonElement;
      btn.addEventListener("click", () => opts.onSelect(item.id));
      this.buttons.set(item.id, btn);
      this.el.appendChild(btn);
    }

    opts.container.appendChild(this.el);
  }

  setActive(id: string): void {
    for (const [itemId, btn] of this.buttons) {
      btn.setAttribute("aria-selected", String(itemId === id));
    }
  }

  destroy(): void {
    this.el.remove();
  }
}

export default Thumbnails;
