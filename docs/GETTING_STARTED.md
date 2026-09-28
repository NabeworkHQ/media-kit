# Getting started

## Install (npm)

```bash
npm install @nabework/media-kit
```

```ts
import { MediaKit } from "@nabework/media-kit";
import "@nabework/media-kit/styles.css";

const kit = new MediaKit({
  container: "#tour",
  manifest: {
    items: [
      { id: "photo-1", type: "image", src: "/photos/exterior.jpg", title: "Exterior" },
      {
        id: "pano-1",
        type: "panorama",
        src: "/panoramas/living-room.jpg",
        title: "Living room",
      },
    ],
  },
});

kit.on("itemchange", (item) => console.log("now viewing", item.id));
```

## Install (CDN, no build step)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@nabework/media-kit/dist/media-kit.css" />
<script src="https://cdn.jsdelivr.net/npm/@nabework/media-kit/dist/media-kit.iife.js"></script>

<div id="tour" style="width: 100%; height: 600px"></div>
<script>
  const kit = new NabeworkMediaKit.MediaKit({
    container: "#tour",
    manifest: { items: [{ id: "p1", type: "image", src: "/photo.jpg" }] },
  });
</script>
```

## Install (React)

```tsx
import { MediaKitView } from "@nabework/media-kit/react";
import "@nabework/media-kit/styles.css";

function ListingGallery({ manifest }) {
  return <MediaKitView manifest={manifest} style={{ height: 500 }} />;
}
```

## Building a manifest

A manifest is just a list of `MediaItem`s - see `src/core/types.ts` for the
full schema of every item type (`image`, `video`, `document`, `panorama`,
`panorama-tour`, `model3d`, `vr-tour`). Most integrations generate this
from the host platform's own data (a listing's uploaded photos, a
Matterport-style scan URL, etc.) rather than hand-authoring it.

## Multilingual content

Two independent things are localized:

1. **UI chrome** (toolbar labels, onboarding copy, error messages) - pick
   with `locale`, extend/override with `translations`:

   ```ts
   new MediaKit({
     locale: "es",
     translations: { es: { "toolbar.fullscreen": "Pantalla completa (custom)" } },
   });
   ```

2. **Your content** (item titles, hotspot labels, guide narration) - any
   field typed `string | LocalizedText` accepts either a plain string or a
   per-locale map:

   ```ts
   { title: { en: "Living Room", es: "Sala", fr: "Salon" } }
   ```

The visitor can switch languages live via the toolbar's language selector
(shown automatically once more than one locale is in play).

## Running the examples locally

```bash
npm install
npm run dev   # serves examples/vanilla via Vite
```

## Development

```bash
npm run typecheck
npm test           # vitest, jsdom
npm run build       # tsup -> dist/ (ESM, CJS, IIFE, react subpath, .d.ts)
```
