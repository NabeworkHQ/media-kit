import { BaseViewer } from "./BaseViewer";
import { MediaKitError, type ImageItem, type MediaType, type ViewerDeps } from "../core/types";
import { el as h } from "../core/ui/dom";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

/**
 * Simple, dependency-free pan/zoom image viewer:
 *  - wheel / pinch to zoom
 *  - drag to pan once zoomed
 *  - double-click/tap to toggle zoom
 */
export class ImageViewer extends BaseViewer<ImageItem> {
  readonly type: MediaType = "image";

  private scale = 1;
  private tx = 0;
  private ty = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private img!: HTMLImageElement;
  private wrap!: HTMLDivElement;

  protected onMount(el: HTMLElement, item: ImageItem, deps: ViewerDeps): void {
    this.wrap = h("div", { class: "nmk-image-viewer" });
    this.img = h("img", {
      src: item.fullSrc ?? item.src,
      alt: item.alt ?? "",
      draggable: "false",
      class: "nmk-image-viewer__img",
    }) as HTMLImageElement;

    this.img.addEventListener("error", () =>
      deps.onError(new MediaKitError(deps.t("error.load"), "IMAGE_LOAD_FAILED", item.id))
    );

    this.wrap.appendChild(this.img);
    el.appendChild(this.wrap);

    this.addListener(this.wrap, "wheel", this.onWheel as EventListener, { passive: false });
    this.addListener(this.wrap, "pointerdown", this.onPointerDown as EventListener);
    this.addListener(window, "pointermove", this.onPointerMove as EventListener);
    this.addListener(window, "pointerup", this.onPointerUp as EventListener);
    this.addListener(this.wrap, "dblclick", this.onDoubleClick as EventListener);

    this.applyTransform();
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    this.setScale(this.scale + delta * this.scale);
  };

  private onDoubleClick = () => {
    this.setScale(this.scale > MIN_SCALE ? MIN_SCALE : 2.5);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.scale <= MIN_SCALE) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.wrap.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.tx += e.clientX - this.lastX;
    this.ty += e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.applyTransform();
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private setScale(next: number): void {
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    if (this.scale === MIN_SCALE) {
      this.tx = 0;
      this.ty = 0;
    }
    this.applyTransform();
  }

  private applyTransform(): void {
    this.img.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    this.img.style.cursor = this.scale > MIN_SCALE ? "grab" : "zoom-in";
  }

  /** Exposed for tests. */
  getScale(): number {
    return this.scale;
  }
}

export default ImageViewer;
