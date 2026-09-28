# Architecture

## Goals that shaped the design

1. **Framework-agnostic core.** The kit must work dropped into a plain HTML
   page via a CDN `<script>` tag just as well as inside a React/Next app on
   the platform. So the core (`src/core`, `src/viewers`) is plain
   TypeScript/DOM with zero framework dependency. React (`src/react`) is a
   thin adapter published as a *separate subpath export*
   (`@nabework/media-kit/react`) so consumers who don't use React never pull
   in the React runtime.

2. **One media kit, many "media types."** Every uploaded asset - photo,
   walkthrough video, floor plan PDF, 360° photo, stitched panorama tour,
   glTF/FBX 3D scan, or a full guided VR tour - is described by a single
   `MediaItem` union type (`src/core/types.ts`) and rendered by a `Viewer`
   looked up from a `ViewerRegistry`. Adding a new type, or swapping out a
   built-in viewer for a host-supplied one, doesn't require forking the
   library:

   ```ts
   kit.registry.register("document", () => new MyCustomPdfViewer());
   ```

3. **Share one rendering stack.** Panoramas, 3D models, and VR tours all run
   on three.js. Rather than pulling in Marzipano *and* a separate 3D
   library *and* a separate game-engine-ish walkthrough library, the
   panorama viewer, the model viewer, and the VR tour viewer share loaders,
   controls, and the render-loop pattern. This keeps the bundle smaller and
   the mental model for contributors consistent.

4. **Best-effort progressive enhancement.** Document viewing uses `pdf.js`
   *if the host app has it installed* (optional peer dependency, dynamically
   imported) and falls back to the browser's native PDF viewer in an
   `<iframe>` otherwise. Street View is only ever loaded if a `vr-tour` item
   actually declares a `streetView` entry. Nothing pulls in more than a
   gallery of plain photos needs.

## Module map

```
src/
  core/
    types.ts            Public data model: MediaItem union, Viewer contract, options
    MediaKit.ts          Orchestrator: mounts chrome + active viewer, owns lifecycle
    EventBus.ts           Minimal typed pub/sub
    ViewerRegistry.ts     MediaType -> Viewer factory map (overridable)
    storage.ts             Default localStorage adapter (namespaced, SSR-safe)
    i18n/                  Translator + built-in locale dictionaries (en/es/fr/ar)
    ui/                    Toolbar, Onboarding overlay, Thumbnail strip, dom() helper
    styles/media-kit.css   Themeable via CSS custom properties
  viewers/
    BaseViewer.ts          Common mount/resize/destroy + disposer bookkeeping
    ImageViewer.ts          Pan/zoom
    VideoViewer.ts          Native <video> wrapper + captions
    DocumentViewer.ts       pdf.js (optional) or <iframe> fallback
    panorama/
      HotspotManager.ts      Pure yaw/pitch <-> vector3 math (framework-free, unit tested)
      PanoramaViewer.ts       Single panorama or stitched multi-node "panorama-tour"
    model3d/
      loaders.ts              glTF/GLB, FBX, Collada loading + auto-fit-to-viewport
      controls/OrbitControl.ts     Examine-mode camera control
      controls/FirstPersonControl.ts  WASD/arrows + on-screen joystick "walk" control
      Model3DViewer.ts        Orbit-mode 3D model viewer
    vrtour/
      StreetViewBridge.ts     Lazy Google Maps JS API loader + "step inside" transition
      VRTourViewer.ts         Composes model3d-freeroam or panorama-tour + guide narration
  react/
    MediaKit.tsx             <MediaKitView> - owns a container div, delegates to core MediaKit
    hooks.ts                  useActiveMediaItem()
    index.tsx                 Public react subpath export
```

## Why not just use Marzipano / Online3DViewer / xeokit / Cesium directly?

Those projects (linked in the README) solve one slice each extremely well,
but none of them cover the combination this kit needs - a single
consistent viewer/toolbar/onboarding/i18n shell across *all* asset types,
embeddable both as an npm package and a CDN script, for a multi-tenant SaaS
where a hotel property and a real-estate listing both need to show photos +
video + a 360° tour + a 3D model in the same UI chrome:

- **Marzipano** (Google) is a great reference for the panorama scene-graph
  and hotspot approach; `PanoramaViewer`/`HotspotManager` follow the same
  conceptual model (nodes, links, infospots) but are reimplemented directly
  on three.js so panoramas share a renderer with the 3D model and VR tour
  viewers instead of running a second WebGL stack side by side.
- **Online3DViewer** and **xeokit-sdk** are full-featured CAD/BIM viewers
  (measurement tools, IFC support, etc.) - more heavyweight than a
  real-estate/hospitality walkthrough needs. `Model3DViewer` intentionally
  stays small: load glTF/FBX/Collada, auto-frame it, orbit or walk around.
- **Cesium** is a georeferenced globe/terrain engine, aimed at GIS use
  cases far beyond "view a scanned property." Not a fit here.
- **google/marzipano-style hotspot navigation crossed with a Street-View
  approach** is the pattern used by consumer real-estate sites (walk up to
  the house on Street View, then "step inside" into an indoor tour) -
  `StreetViewBridge` implements exactly that hand-off, using the official
  `google.maps.StreetViewPanorama` widget rather than trying to reproduce
  Street View's imagery.
- The existing in-repo prototype (three.js scene/camera/renderer + NPC
  guide + orbit/keyboard/joystick controls) was the starting point for
  `model3d/` and `vrtour/`: `FirstPersonControl` generalizes its keyboard +
  joystick handling, and `VRTourViewer`'s narrated "guide stops" generalize
  its NPC waypoint concept without hard-coding a specific character model.

## Extensibility points

- **Custom viewers**: `registry.register(type, factory)` on `kit.registry`,
  or construct your own `ViewerRegistry` and pass viewers in directly if
  you're composing `MediaKit` internals yourself.
- **Translations**: `MediaKitOptions.translations` merges over/extends the
  built-in dictionaries - add a whole new locale or override a single key.
- **Storage**: `MediaKitOptions.storage` lets a host app sync "seen
  onboarding" / locale preference to its own backend instead of
  `localStorage` (useful for signed-in users viewing on multiple devices).
- **Events**: every viewer can `deps.emit(...)` arbitrary events
  (`panorama:hotspot-click`, `video:play`, `vrtour:guide-stop`, ...) that
  bubble up through `kit.on(event, handler)` - the host app's booking UI can
  react to a hotspot click without the kit knowing anything about bookings.
