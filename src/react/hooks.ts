import * as React from "react";
import type { MediaKit } from "../core/MediaKit";
import type { MediaItem } from "../core/types";

/** Subscribes to `itemchange` on a MediaKit instance obtained via `kitRef`. */
export function useActiveMediaItem(kit: MediaKit | null): MediaItem | undefined {
  const [item, setItem] = React.useState<MediaItem | undefined>(undefined);

  React.useEffect(() => {
    if (!kit) return;
    return kit.on<MediaItem>("itemchange", setItem);
  }, [kit]);

  return item;
}
