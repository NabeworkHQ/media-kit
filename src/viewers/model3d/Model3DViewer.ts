import * as THREE from "three";
import { BaseViewer } from "../BaseViewer";
import { MediaKitError, type MediaType, type Model3DItem, type ViewerDeps } from "../../core/types";
import { loadModel, fitToViewport } from "./loaders";
import { OrbitControl } from "./controls/OrbitControl";
import { el as h } from "../../core/ui/dom";

export class Model3DViewer extends BaseViewer<Model3DItem> {
  readonly type: MediaType = "model3d";

  protected renderer!: THREE.WebGLRenderer;
  protected scene!: THREE.Scene;
  protected camera!: THREE.PerspectiveCamera;
  protected orbit?: OrbitControl;
  protected model?: THREE.Object3D;
  protected rafId = 0;
  private lastFrameTime = performance.now();
  private loadingEl?: HTMLDivElement;

  protected async onMount(el: HTMLElement, item: Model3DItem, deps: ViewerDeps): Promise<void> {
    const width = el.clientWidth || 1;
    const height = el.clientHeight || 1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20232a);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 2, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.addDisposer(() => this.renderer.dispose());

    const wrap = h("div", { class: "nmk-model3d-viewer" });
    wrap.appendChild(this.renderer.domElement);
    el.appendChild(wrap);

    this.setupLighting();
    this.orbit = new OrbitControl(this.camera, this.renderer.domElement);
    this.addDisposer(() => this.orbit?.dispose());

    this.loadingEl = h("div", { class: "nmk-viewer__loading" }, [deps.t("loading")]);
    wrap.appendChild(this.loadingEl);

    try {
      const model = await loadModel(item.src, item.format, (ratio) => {
        if (this.loadingEl) this.loadingEl.textContent = `${deps.t("loading")} ${Math.round(ratio * 100)}%`;
      });
      const { scale, center } = fitToViewport(model, 10);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.scale.setScalar(scale);
      this.model = model;
      this.scene.add(model);
      deps.emit("model3d:loaded", { id: item.id });
    } catch (err) {
      deps.onError(new MediaKitError(deps.t("error.load"), "MODEL_LOAD_FAILED", item.id, err));
    } finally {
      this.loadingEl?.remove();
    }

    this.startLoop();
  }

  protected setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7.5);
    this.scene.add(dir);
  }

  protected startLoop(): void {
    const tick = () => {
      const now = performance.now();
      const delta = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.onFrame(delta);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /** Overridable per-frame hook (VRTourViewer plugs first-person movement in here). */
  protected onFrame(_delta: number): void {
    this.orbit?.update();
  }

  protected onResize(width: number, height: number): void {
    if (!this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  protected onDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}

export default Model3DViewer;
