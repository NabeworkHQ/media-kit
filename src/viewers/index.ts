import { ViewerRegistry } from "../core/ViewerRegistry";
import { ImageViewer } from "./ImageViewer";
import { VideoViewer } from "./VideoViewer";
import { DocumentViewer } from "./DocumentViewer";
import { PanoramaViewer } from "./panorama/PanoramaViewer";
import { Model3DViewer } from "./model3d/Model3DViewer";
import { VRTourViewer } from "./vrtour/VRTourViewer";

export function createDefaultRegistry(): ViewerRegistry {
  const registry = new ViewerRegistry();
  registry.register("image", () => new ImageViewer());
  registry.register("video", () => new VideoViewer());
  registry.register("document", () => new DocumentViewer());
  registry.register("panorama", () => new PanoramaViewer());
  registry.register("panorama-tour", () => new PanoramaViewer());
  registry.register("model3d", () => new Model3DViewer());
  registry.register("vr-tour", () => new VRTourViewer());
  return registry;
}

export {
  ImageViewer,
  VideoViewer,
  DocumentViewer,
  PanoramaViewer,
  Model3DViewer,
  VRTourViewer,
};
export { BaseViewer } from "./BaseViewer";
export { HotspotManager } from "./panorama/HotspotManager";
export { FirstPersonControl } from "./model3d/controls/FirstPersonControl";
export { OrbitControl } from "./model3d/controls/OrbitControl";
export { StreetViewBridge } from "./vrtour/StreetViewBridge";
