import { defineConfig } from "tsup";

export default defineConfig([
  // Core, framework-agnostic bundle: ESM + CJS (npm consumers)
  {
    entry: { "media-kit": "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    outDir: "dist",
    esbuildOptions(options) {
      options.banner = {
        js: "/* @nabework/media-kit - https://github.com/nabework/media-kit */",
      };
    },
  },
  // Single-file IIFE build for <script src="..."> / CDN usage.
  // Exposes `window.NabeworkMediaKit`. three.js is bundled in so it
  // works with zero build step on a plain HTML page.
  {
    entry: { "media-kit.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "NabeworkMediaKit",
    dts: false,
    sourcemap: true,
    minify: true,
    outDir: "dist",
    clean: false,
  },
  // React adapter, published as a subpath export (`@nabework/media-kit/react`)
  // so consumers who don't use React never pay for it.
  {
    entry: { index: "src/react/index.tsx" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    outDir: "dist/react",
    clean: false,
    external: ["react", "react-dom"],
  },
]);
