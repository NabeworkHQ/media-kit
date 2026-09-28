import type { MediaType, Viewer, ViewerFactory } from "./types";

/**
 * Maps a `MediaType` to the factory that creates its viewer instance.
 *
 * Kept separate from `MediaKit` so consumers can register a custom viewer
 * for a type (e.g. swap in their own document renderer) or add support for
 * an entirely new type without forking the library:
 *
 *   registry.register("document", () => new MyPdfViewer());
 */
export class ViewerRegistry {
  private factories = new Map<MediaType, ViewerFactory>();

  register(type: MediaType, factory: ViewerFactory): void {
    this.factories.set(type, factory);
  }

  has(type: MediaType): boolean {
    return this.factories.has(type);
  }

  create(type: MediaType): Viewer {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`[media-kit] No viewer registered for media type "${type}"`);
    }
    return factory();
  }

  types(): MediaType[] {
    return [...this.factories.keys()];
  }
}
