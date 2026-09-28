# @nabework/media-kit

A framework-agnostic media viewer for real estate, hospitality, and
anything else that needs to show off a place: photos, video, documents,
360° panoramas (single or stitched into a walkthrough), 3D models
(glTF/GLB/FBX/Collada), and full guided VR tours - with an optional Google
Street View lead-in so visitors can walk up the street before stepping
inside.

Works as an npm package or a single `<script>` tag from a CDN, in any
frontend stack. A React adapter is published as a separate subpath so
non-React consumers pay zero cost for it.

```ts
import { MediaKit } from "@nabework/media-kit";
import "@nabework/media-kit/styles.css";

new MediaKit({
  container: "#tour",
  manifest: {
    items: [
      { id: "hero", type: "image", src: "/photos/exterior.jpg" },
      { id: "walkthrough", type: "panorama-tour", startNodeId: "lobby", nodes: [/* ... */] },
    ],
  },
});
```

See **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** for install
instructions (npm / CDN / React), **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
for how it's put together and why, and
**[docs/STREET_VIEW_INTEGRATION.md](docs/STREET_VIEW_INTEGRATION.md)** for
wiring up the Street View lead-in.

## Features

- **One kit, every media type** - image, video, document (PDF), single
  panorama, stitched panorama tour, 3D model, and full VR tour, all behind
  one consistent toolbar/thumbnail/onboarding shell.
- **Game-like walkthroughs** - WASD/arrow-key + on-screen joystick
  first-person movement through a 3D-scanned property, or classic
  click-the-hotspot navigation through a stitched panorama tour.
- **Google Street View lead-in** - optionally walk up to the property on
  Street View, then "step inside" into the indoor tour.
- **Multilingual by default** - UI chrome ships with English, Spanish,
  French, and Arabic (incl. RTL layout); add any locale via a plain object,
  and every content field (titles, hotspot labels, guide narration) accepts
  per-locale text.
- **Built-in onboarding** - a dismissible "how to get around" overlay
  tailored to the active media type (drag-to-look, scroll-to-zoom, WASD,
  click-the-hotspots), remembered per visitor.
- **Themeable** - every color/spacing value is a CSS custom property, so it
  reskins cleanly inside a shadcn/Tailwind host app without fighting
  specificity.
- **Extensible** - register your own viewer for any media type, swap the
  storage adapter, listen to every viewer's events from the host app.
- **Ships two ways** - `npm install @nabework/media-kit` for bundler-based
  apps, or a single IIFE build from a CDN for zero-build integrations.

## Prior art

Several excellent open-source projects informed this design; see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#why-not-just-use-marzipano--online3dviewer--xeokit--cesium-directly)
for how this kit relates to each:

- [google/marzipano](https://github.com/google/marzipano) - panorama
  scene-graph/hotspot model
- [kovacsv/Online3DViewer](https://github.com/kovacsv/Online3DViewer) and
  [xeokit/xeokit-sdk](https://github.com/xeokit/xeokit-sdk) - 3D model
  viewing
- [Godsborn92/360-Pano-Vr-Walkthrough](https://github.com/Godsborn92/360-Pano-Vr-Walkthrough) -
  360°/VR walkthrough UX
- [cesiumgs/cesium](https://github.com/cesiumgs/cesium) - georeferenced
  viewing (not used directly; out of scope for property walkthroughs)

## License

MIT
