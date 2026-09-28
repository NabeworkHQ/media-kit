import { BaseViewer } from "./BaseViewer";
import { MediaKitError, type MediaType, type VideoItem, type ViewerDeps } from "../core/types";
import { el as h } from "../core/ui/dom";

/**
 * Thin wrapper around the native `<video>` element. Deliberately does not
 * reinvent playback controls (native controls are accessible, localized by
 * the OS/browser, and support captions out of the box) but adds:
 *  - poster + captions/subtitle track wiring
 *  - a "ready"/"ended" event bridge onto the kit's EventBus
 *  - graceful error reporting for unsupported codecs / broken URLs
 */
export class VideoViewer extends BaseViewer<VideoItem> {
  readonly type: MediaType = "video";
  private video!: HTMLVideoElement;

  protected onMount(el: HTMLElement, item: VideoItem, deps: ViewerDeps): void {
    this.video = h("video", {
      class: "nmk-video-viewer",
      controls: true,
      playsInline: true,
      poster: item.poster,
      preload: "metadata",
    }) as HTMLVideoElement;

    const source = h("source", { src: item.src });
    this.video.appendChild(source);

    for (const track of item.captions ?? []) {
      this.video.appendChild(
        h("track", {
          kind: "captions",
          src: track.src,
          srclang: track.srclang,
          label: track.label,
          default: track.default ?? false,
        })
      );
    }

    this.addListener(this.video, "error", () =>
      deps.onError(new MediaKitError(deps.t("error.load"), "VIDEO_LOAD_FAILED", item.id))
    );
    this.addListener(this.video, "play", () => deps.emit("video:play", { id: item.id }));
    this.addListener(this.video, "pause", () => deps.emit("video:pause", { id: item.id }));
    this.addListener(this.video, "ended", () => deps.emit("video:ended", { id: item.id }));

    el.appendChild(this.video);
  }

  protected onDestroy(): void {
    this.video?.pause();
    this.video?.removeAttribute("src");
    this.video?.load();
  }
}

export default VideoViewer;
