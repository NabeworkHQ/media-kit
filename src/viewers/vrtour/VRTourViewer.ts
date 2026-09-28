import * as THREE from "three";
import { BaseViewer } from "../BaseViewer";
import { MediaKitError, type MediaType, type VRTourItem, type ViewerDeps } from "../../core/types";
import { loadModel, fitToViewport } from "../model3d/loaders";
import { FirstPersonControl } from "../model3d/controls/FirstPersonControl";
import { OrbitControl } from "../model3d/controls/OrbitControl";
import { PanoramaViewer } from "../panorama/PanoramaViewer";
import { StreetViewBridge } from "./StreetViewBridge";
import { el as h } from "../../core/ui/dom";

/**
 * Composes the other viewers/controls into the "game-like" guided tour
 * experience: an optional real-world Street View approach, then either a
 * walkable 3D model (first-person, WASD/joystick) or a linked panorama
 * tour, plus an optional narrated stop-by-stop guide.
 */
export class VRTourViewer extends BaseViewer<VRTourItem> {
  readonly type: MediaType = "vr-tour";

  private streetView?: StreetViewBridge;
  private tourEl!: HTMLDivElement;
  private panoramaViewer?: PanoramaViewer;

  // model3d scene state
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private orbit?: OrbitControl;
  private firstPerson?: FirstPersonControl;
  private rafId = 0;
  private lastFrame = performance.now();

  // guide state
  private guideStopIndex = 0;
  private guideBar?: HTMLDivElement;

  protected async onMount(el: HTMLElement, item: VRTourItem, deps: ViewerDeps): Promise<void> {
    const root = h("div", { class: "nmk-vrtour" });
    this.tourEl = h("div", { class: "nmk-vrtour__scene" });
    root.appendChild(this.tourEl);
    el.appendChild(root);

    const enterTour = () => {
      this.streetView?.destroy();
      this.streetView = undefined;
      this.tourEl.classList.add("nmk-vrtour__scene--active");
      void this.mountScene(item, deps);
    };

    if (item.streetView) {
      this.tourEl.classList.remove("nmk-vrtour__scene--active");
      this.streetView = new StreetViewBridge({
        container: root,
        entry: item.streetView,
        enterLabel: deps.text(item.streetView.enterLabel, deps.t("streetview.enter")),
        onEnter: enterTour,
      });
    } else {
      this.tourEl.classList.add("nmk-vrtour__scene--active");
      await this.mountScene(item, deps);
    }
  }

  private async mountScene(item: VRTourItem, deps: ViewerDeps): Promise<void> {
    if (item.scene.kind === "panorama-tour") {
      this.panoramaViewer = new PanoramaViewer();
      await this.panoramaViewer.mount(
        this.tourEl,
        { ...item.scene.item, id: item.id, type: "panorama-tour" },
        deps
      );
      return;
    }
    await this.mountModelScene(item, deps);
  }

  private async mountModelScene(item: VRTourItem, deps: ViewerDeps): Promise<void> {
    const modelItem = item.scene.kind === "model3d" ? item.scene.item : undefined;
    if (!modelItem) return;

    const width = this.tourEl.clientWidth || 1;
    const height = this.tourEl.clientHeight || 1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20232a);
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    this.camera.position.set(0, 1.7, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.tourEl.appendChild(this.renderer.domElement);
    this.addDisposer(() => this.renderer?.dispose());

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7.5);
    this.scene.add(dir);

    const mode = item.interactionMode ?? "both";
    if (mode === "freeroam" || mode === "both") {
      this.firstPerson = new FirstPersonControl({
        container: this.renderer.domElement,
        camera: this.camera,
        showJoystick: true,
      });
      this.addDisposer(() => this.firstPerson?.dispose());
    } else {
      this.orbit = new OrbitControl(this.camera, this.renderer.domElement);
      this.addDisposer(() => this.orbit?.dispose());
    }

    try {
      const model = await loadModel(modelItem.src, modelItem.format);
      const { scale, center } = fitToViewport(model, 12);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.scale.setScalar(scale);
      this.scene.add(model);
      deps.emit("vrtour:model-loaded", { id: item.id });
    } catch (err) {
      deps.onError(new MediaKitError(deps.t("error.load"), "MODEL_LOAD_FAILED", item.id, err));
    }

    if (item.guide && item.guide.stops.length > 0) {
      this.mountGuideBar(item, deps);
    }

    this.startLoop();
  }

  private mountGuideBar(item: VRTourItem, deps: ViewerDeps): void {
    if (item.scene.kind !== "model3d") return;
    const waypoints = item.scene.item.waypoints ?? [];
    this.guideBar = h("div", { class: "nmk-vrtour__guide" });
    const prev = h("button", { type: "button" }, [deps.t("guide.prev")]);
    const next = h("button", { type: "button" }, [deps.t("guide.next")]);
    const narration = h("p", { class: "nmk-vrtour__narration" });
    this.guideBar.append(prev, narration, next);
    this.tourEl.appendChild(this.guideBar);

    const goTo = (index: number) => {
      const stops = item.guide!.stops;
      this.guideStopIndex = Math.min(Math.max(index, 0), stops.length - 1);
      const stop = stops[this.guideStopIndex];
      const waypoint = waypoints.find((w) => w.id === stop.waypointId);
      narration.textContent = deps.text(stop.narration, "");
      if (waypoint && this.camera) {
        this.camera.position.set(...waypoint.position);
        this.camera.lookAt(new THREE.Vector3(...waypoint.lookAt));
      }
      deps.emit("vrtour:guide-stop", { index: this.guideStopIndex, stop });
    };

    this.addListener(prev, "click", () => goTo(this.guideStopIndex - 1));
    this.addListener(next, "click", () => goTo(this.guideStopIndex + 1));
    goTo(0);
  }

  private startLoop(): void {
    const tick = () => {
      const now = performance.now();
      const delta = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      this.firstPerson?.update(delta);
      this.orbit?.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  protected onResize(width: number, height: number): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
    this.panoramaViewer?.resize(width, height);
  }

  protected onDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.streetView?.destroy();
    this.panoramaViewer?.destroy();
  }
}

export default VRTourViewer;
