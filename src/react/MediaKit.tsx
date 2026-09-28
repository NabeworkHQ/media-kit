import * as React from "react";
import { MediaKit as CoreMediaKit } from "../core/MediaKit";
import type { MediaItem, MediaKitOptions, MediaManifest } from "../core/types";

export interface MediaKitViewProps
  extends Omit<MediaKitOptions, "container" | "manifest" | "onItemChange" | "onError"> {
  manifest: MediaManifest;
  className?: string;
  style?: React.CSSProperties;
  onItemChange?: (item: MediaItem) => void;
  onError?: (error: unknown) => void;
  /** Escape hatch for imperative access (kit.next(), kit.goTo(id), ...). */
  kitRef?: React.Ref<CoreMediaKit | null>;
}

/**
 * React wrapper. The core kit owns its own DOM subtree (it is not a
 * "controlled" React tree) - this component's job is purely lifecycle:
 * construct on mount, destroy on unmount, and re-run when the manifest or
 * locale identity changes. This keeps behaviour identical between the
 * vanilla-JS and React entry points, which matters for a library meant to
 * be dropped into many different host stacks.
 */
export const MediaKitView = React.forwardRef<CoreMediaKit | null, MediaKitViewProps>(
  function MediaKitView(props, forwardedRef) {
    const { manifest, className, style, onItemChange, onError, kitRef, ...rest } = props;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const kit = React.useRef<CoreMediaKit | null>(null);

    React.useImperativeHandle(forwardedRef ?? kitRef, () => kit.current as CoreMediaKit, []);

    React.useEffect(() => {
      if (!containerRef.current) return;
      const instance = new CoreMediaKit({
        ...rest,
        container: containerRef.current,
        manifest,
        onItemChange,
        onError: onError as MediaKitOptions["onError"],
      });
      kit.current = instance;
      return () => {
        instance.destroy();
        kit.current = null;
      };
      // Re-create the kit only when the manifest identity changes; other
      // option props (locale, theme, ...) are read once at construction to
      // match the vanilla API. Use `kit.current?.setLocale(...)` for
      // dynamic locale switching from React.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manifest]);

    return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", ...style }} />;
  }
);

export default MediaKitView;
