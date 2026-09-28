import * as React from "react";
import { MediaKitView, useActiveMediaItem } from "@nabework/media-kit/react";
import type { MediaKit, MediaManifest } from "@nabework/media-kit/react";
import "@nabework/media-kit/styles.css";

const manifest: MediaManifest = {
  items: [
    {
      id: "suite-photo",
      type: "image",
      title: { en: "Ocean-view suite", es: "Suite con vista al mar" },
      src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600",
    },
    {
      id: "hotel-pano-tour",
      type: "panorama-tour",
      title: "Lobby to suite walkthrough",
      startNodeId: "lobby",
      nodes: [
        {
          id: "lobby",
          src: "https://pannellum.org/images/alma.jpg",
          hotspots: [{ id: "to-suite", kind: "link", yaw: 20, pitch: 0, targetNodeId: "suite", label: "Go to suite" }],
        },
        {
          id: "suite",
          src: "https://pannellum.org/images/cerro-toco-0.jpg",
          hotspots: [{ id: "to-lobby", kind: "link", yaw: -160, pitch: 0, targetNodeId: "lobby", label: "Back to lobby" }],
        },
      ],
    },
  ],
};

export default function App() {
  // kitRef gives you the imperative API (kit.next(), kit.goTo(id), kit.on(...))
  // from outside the component, e.g. for custom "next room" buttons in your
  // own booking UI built with shadcn/ui.
  const kitRef = React.useRef<MediaKit | null>(null);
  const activeItem = useActiveMediaItem(kitRef.current);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ padding: 12, fontFamily: "sans-serif" }}>
        Now viewing: <strong>{activeItem ? String(activeItem.title) : "—"}</strong>
        <button onClick={() => kitRef.current?.next()} style={{ marginInlineStart: 12 }}>
          Next
        </button>
      </header>
      <div style={{ flex: 1 }}>
        <MediaKitView kitRef={kitRef} manifest={manifest} theme="light" locale="en" />
      </div>
    </div>
  );
}
