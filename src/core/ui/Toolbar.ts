import { el as h } from "./dom";
import type { I18n } from "../i18n";

export interface ToolbarOptions {
  container: HTMLElement;
  i18n: I18n;
  locales: string[];
  onToggleFullscreen: () => void;
  onHelp: () => void;
  onLocaleChange: (locale: string) => void;
}

export class Toolbar {
  readonly el: HTMLDivElement;
  private fullscreenBtn: HTMLButtonElement;

  constructor(private opts: ToolbarOptions) {
    const { i18n } = opts;

    this.fullscreenBtn = h("button", {
      type: "button",
      class: "nmk-toolbar__btn nmk-toolbar__fullscreen",
      "aria-label": i18n.t("toolbar.fullscreen"),
      title: i18n.t("toolbar.fullscreen"),
    }) as HTMLButtonElement;
    this.fullscreenBtn.addEventListener("click", opts.onToggleFullscreen);

    const helpBtn = h(
      "button",
      {
        type: "button",
        class: "nmk-toolbar__btn nmk-toolbar__help",
        "aria-label": i18n.t("toolbar.help"),
        title: i18n.t("toolbar.help"),
      },
      ["?"]
    );
    helpBtn.addEventListener("click", opts.onHelp);

    const children: HTMLElement[] = [helpBtn];

    if (opts.locales.length > 1) {
      const select = h("select", {
        class: "nmk-toolbar__locale",
        "aria-label": i18n.t("toolbar.language"),
      }) as HTMLSelectElement;
      for (const loc of opts.locales) {
        const option = h("option", { value: loc }, [loc.toUpperCase()]) as HTMLOptionElement;
        option.selected = loc === i18n.locale;
        select.appendChild(option);
      }
      select.addEventListener("change", () => opts.onLocaleChange(select.value));
      children.push(select);
    }

    children.push(this.fullscreenBtn);

    this.el = h("div", { class: "nmk-toolbar", role: "toolbar" }, children);
    opts.container.appendChild(this.el);
  }

  setFullscreenState(isFullscreen: boolean): void {
    const key = isFullscreen ? "toolbar.exitFullscreen" : "toolbar.fullscreen";
    const label = this.opts.i18n.t(key);
    this.fullscreenBtn.setAttribute("aria-label", label);
    this.fullscreenBtn.title = label;
    this.fullscreenBtn.classList.toggle("nmk-toolbar__fullscreen--active", isFullscreen);
  }

  destroy(): void {
    this.el.remove();
  }
}

export default Toolbar;
