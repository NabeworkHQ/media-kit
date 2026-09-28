import type { MediaItem, MediaType, Viewer, ViewerDeps } from "../core/types";

/**
 * Optional base class viewers can extend for the boring bits: tracking the
 * mounted element/deps and collecting disposer callbacks so `destroy()`
 * can't forget to clean something up.
 */
export abstract class BaseViewer<T extends MediaItem = MediaItem> implements Viewer<T> {
  abstract readonly type: MediaType;
  protected el?: HTMLElement;
  protected deps?: ViewerDeps;
  protected item?: T;
  private disposers: Array<() => void> = [];

  mount(el: HTMLElement, item: T, deps: ViewerDeps): Promise<void> | void {
    this.el = el;
    this.item = item;
    this.deps = deps;
    return this.onMount(el, item, deps);
  }

  resize(width: number, height: number): void {
    this.onResize?.(width, height);
  }

  destroy(): void {
    this.onDestroy?.();
    while (this.disposers.length) {
      const dispose = this.disposers.pop()!;
      try {
        dispose();
      } catch {
        /* best-effort cleanup */
      }
    }
    this.el = undefined;
    this.deps = undefined;
    this.item = undefined;
  }

  /** Register a cleanup callback to run (in reverse order) on destroy(). */
  protected addDisposer(fn: () => void): void {
    this.disposers.push(fn);
  }

  protected addListener<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.addDisposer(() => target.removeEventListener(type, listener, options));
  }

  protected abstract onMount(el: HTMLElement, item: T, deps: ViewerDeps): Promise<void> | void;
  protected onResize?(width: number, height: number): void;
  protected onDestroy?(): void;
}
