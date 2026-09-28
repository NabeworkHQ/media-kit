/**
 * Public data model for the Media Kit.
 *
 * Everything the host application needs to describe is expressed as a
 * `MediaItem`. The kit is intentionally "dumb" about where the data comes
 * from (your realty listing, a hotel property, a DAM, etc) - you just hand
 * it a manifest.
 */

export type MediaType =
  | "image"
  | "video"
  | "document"
  | "panorama"
  | "panorama-tour"
  | "model3d"
  | "vr-tour";

export interface LocalizedText {
  /** BCP-47 language tag, e.g. "en", "es", "fr-CA". */
  [locale: string]: string;
}

export interface BaseMediaItem {
  /** Stable unique id within the manifest. */
  id: string;
  type: MediaType;
  /** Title shown in the toolbar / thumbnail strip. Plain string or per-locale map. */
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  thumbnail?: string;
  /** Arbitrary host-supplied metadata, passed through untouched. */
  meta?: Record<string, unknown>;
}

export interface ImageItem extends BaseMediaItem {
  type: "image";
  src: string;
  /** Optional larger/original resolution for zoom. */
  fullSrc?: string;
  alt?: string;
}

export interface VideoItem extends BaseMediaItem {
  type: "video";
  src: string;
  poster?: string;
  captions?: Array<{ src: string; srclang: string; label: string; default?: boolean }>;
}

export interface DocumentItem extends BaseMediaItem {
  type: "document";
  /** URL to a PDF. Other formats can be pre-converted server-side. */
  src: string;
  mimeType?: "application/pdf";
}

export interface PanoramaHotspot {
  id: string;
  /** Yaw in degrees [-180,180] and pitch in degrees [-90,90]. */
  yaw: number;
  pitch: number;
  kind: "link" | "info";
  /** For "link" hotspots: id of the panorama node to jump to. */
  targetNodeId?: string;
  label?: string | LocalizedText;
  text?: string | LocalizedText;
}

export interface PanoramaNode {
  id: string;
  /** Equirectangular (2:1) source image. */
  src: string;
  title?: string | LocalizedText;
  /** Initial yaw/pitch when this node becomes active. */
  initialYaw?: number;
  initialPitch?: number;
  hotspots?: PanoramaHotspot[];
}

export interface PanoramaItem extends BaseMediaItem {
  type: "panorama";
  src: string;
  initialYaw?: number;
  initialPitch?: number;
  hotspots?: PanoramaHotspot[];
}

/** A stitched, multi-node walkthrough of linked panoramas. */
export interface PanoramaTourItem extends BaseMediaItem {
  type: "panorama-tour";
  nodes: PanoramaNode[];
  startNodeId: string;
}

export type Model3DFormat = "glb" | "gltf" | "fbx" | "dae";

export interface Model3DItem extends BaseMediaItem {
  type: "model3d";
  src: string;
  format?: Model3DFormat;
  /** Optional named camera waypoints for a guided fly-through. */
  waypoints?: Array<{
    id: string;
    label?: string | LocalizedText;
    position: [number, number, number];
    lookAt: [number, number, number];
  }>;
}

/** Real-world entry point used to lead from the street into the property. */
export interface StreetViewEntry {
  /** Google Maps API key (loaded client-side; see docs/STREET_VIEW_INTEGRATION.md). */
  apiKey: string;
  position: { lat: number; lng: number };
  /** Heading/pitch/zoom the panorama should start at. */
  pov?: { heading: number; pitch: number; zoom?: number };
  /** Label on the "step inside" transition control. */
  enterLabel?: string | LocalizedText;
}

export interface VRTourItem extends BaseMediaItem {
  type: "vr-tour";
  /** The indoor scene: a 3D model walked through in first-person, or a panorama tour. */
  scene:
    | { kind: "model3d"; item: Omit<Model3DItem, "id" | "type"> }
    | { kind: "panorama-tour"; item: Omit<PanoramaTourItem, "id" | "type"> };
  /** Optional Google Street View lead-in shown before entering the property. */
  streetView?: StreetViewEntry;
  /** Enables the first-person "game-like" controller (WASD/joystick/gamepad). */
  interactionMode?: "guided" | "freeroam" | "both";
  /** Optional guide character walkthrough, narrated stop-by-stop. */
  guide?: {
    modelSrc?: string;
    stops: Array<{
      waypointId: string;
      narration?: string | LocalizedText;
      durationMs?: number;
    }>;
  };
}

export type MediaItem =
  | ImageItem
  | VideoItem
  | DocumentItem
  | PanoramaItem
  | PanoramaTourItem
  | Model3DItem
  | VRTourItem;

export interface MediaManifest {
  items: MediaItem[];
  /** Which item id to open first. Defaults to items[0]. */
  initialItemId?: string;
}

export interface MediaKitOptions {
  /** Element (or selector) the kit renders into. */
  container: HTMLElement | string;
  manifest: MediaManifest;
  /** Active locale, e.g. "en". Defaults to navigator.language, falls back to "en". */
  locale?: string;
  /** Additional/override translations merged over the built-in ones. */
  translations?: Record<string, Record<string, string>>;
  /** Show the one-time interactive "how to use" overlay. Default true. */
  showOnboarding?: boolean;
  /** Show the thumbnail/media-switcher strip. Default true. */
  showThumbnails?: boolean;
  theme?: "light" | "dark" | "auto";
  /**
   * Persist small bits of UI state (locale, "seen onboarding") for the
   * signed-in visitor. Provide your own to sync across devices/tenants;
   * defaults to localStorage under a namespaced key.
   */
  storage?: MediaKitStorage;
  /** Called whenever the active item changes. */
  onItemChange?: (item: MediaItem) => void;
  /** Called on any recoverable viewer error (bad url, unsupported codec, etc). */
  onError?: (error: MediaKitError) => void;
}

export interface MediaKitStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export class MediaKitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly itemId?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "MediaKitError";
  }
}

/** Contract every viewer implementation must satisfy. */
export interface Viewer<T extends MediaItem = MediaItem> {
  readonly type: MediaType;
  /** Mount into `el` and start loading `item`. Must be idempotent-safe (called once). */
  mount(el: HTMLElement, item: T, deps: ViewerDeps): Promise<void> | void;
  /** Called on container resize (ResizeObserver-driven). */
  resize?(width: number, height: number): void;
  /** Tear down all resources: listeners, WebGL contexts, timers, DOM. */
  destroy(): void;
}

export interface ViewerDeps {
  locale: string;
  /** Translate a built-in UI string key (toolbar labels, errors, etc). */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Resolve a host-supplied localized content field (item titles, hotspot labels...). */
  text: (value: string | LocalizedText | undefined, fallback?: string) => string;
  emit: (event: string, payload?: unknown) => void;
  onError: (error: MediaKitError) => void;
}

export type ViewerFactory = () => Viewer;
