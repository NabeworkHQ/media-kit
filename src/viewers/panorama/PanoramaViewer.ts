import * as THREE from "three";
import { BaseViewer } from "../BaseViewer";
import { HotspotManager } from "./HotspotManager";
import { MediaKitError } from "../../core/types";
import type {
  MediaType,
  PanoramaItem,
  PanoramaNode,
  PanoramaTourItem,
  ViewerDeps,
} from "../../core/types";
import { el as h } from "../../core/ui/dom";

type Item = PanoramaItem | PanoramaTourItem;

const FOV_MIN = 30;
const FOV_MAX = 100;

/**
 * Renders a single equirectangular panorama, or a stitched "tour" of
 * multiple linked panorama nodes with clickable link hotspots
 * (Marzipano-style scene graph, implemented directly on three.js so the
 * whole kit shares one rendering stack with the 3D model / VR tour viewers).
 */
export class PanoramaViewer extends BaseViewer<Item> {
  readonly type: MediaType = "panorama";

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sphere!: THREE.Mesh;
  private hotspotLayer!: HTMLDivElement;
  private hotspots = new HotspotManager();
  private nodes = new Map<string, PanoramaNode>();
  private currentNodeId = "";
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private rafId = 0;
  private textureLoader = new THREE.TextureLoader();

  protected onMount(el: HTMLElement, item: Item, deps: ViewerDeps): void {
    if (item.type === "panorama-tour") {
      for (const node of item.nodes) this.nodes.set(node.id, node);
      this.currentNodeId = item.startNodeId;
    } else {
      const node: PanoramaNode = {
        id: item.id,
        src: item.src,
        initialYaw: item.initialYaw,
        initialPitch: item.initialPitch,
        hotspots: item.hotspots,
      };
      this.nodes.set(node.id, node);
      this.currentNodeId = node.id;
    }

    const width = el.clientWidth || 1;
    const height = el.clientHeight || 1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.addDisposer(() => this.renderer.dispose());

    const geometry = new THREE.SphereGeometry(50, 64, 40);
    geometry.scale(-1, 1, 1); // view from inside
    const material = new THREE.MeshBasicMaterial();
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);

    const wrap = h("div", { class: "nmk-panorama-viewer" });
    wrap.appendChild(this.renderer.domElement);
    this.hotspotLayer = h("div", { class: "nmk-panorama-viewer__hotspots" });
    wrap.appendChild(this.hotspotLayer);
    el.appendChild(wrap);

    this.addListener(wrap, "pointerdown", this.onPointerDown as EventListener);
    this.addListener(window, "pointermove", this.onPointerMove as EventListener);
    this.addListener(window, "pointerup", this.onPointerUp as EventListener);
    this.addListener(wrap, "wheel", this.onWheel as EventListener, { passive: false });

    void this.loadNode(this.currentNodeId, deps);
    this.loop();
  }

  private async loadNode(nodeId: string, deps: ViewerDeps): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.currentNodeId = nodeId;
    this.yaw = node.initialYaw ?? 0;
    this.pitch = node.initialPitch ?? 0;
    this.hotspots.set(node.hotspots ?? []);

    try {
      const texture = await this.textureLoader.loadAsync(node.src);
      texture.colorSpace = THREE.SRGBColorSpace;
      (this.sphere.material as THREE.MeshBasicMaterial).map = texture;
      (this.sphere.material as THREE.MeshBasicMaterial).needsUpdate = true;
      deps.emit("panorama:node-change", { nodeId });
      this.renderHotspots(deps);
    } catch (err) {
      deps.onError(new MediaKitError(deps.t("error.load"), "PANORAMA_LOAD_FAILED", nodeId, err));
    }
  }

  private renderHotspots(deps: ViewerDeps): void {
    this.hotspotLayer.replaceChildren();
    for (const hotspot of this.hotspots.all()) {
      const label = hotspot.label ? deps.text(hotspot.label) : undefined;
      const dot = h("button", {
        type: "button",
        class: `nmk-hotspot nmk-hotspot--${hotspot.kind}`,
        title: label,
        "aria-label": label ?? hotspot.kind,
      });
      dot.dataset.hotspotId = hotspot.id;
      this.addListener(dot, "click", () => {
        if (hotspot.kind === "link" && hotspot.targetNodeId) {
          void this.loadNode(hotspot.targetNodeId, deps);
        }
        deps.emit("panorama:hotspot-click", { hotspot });
      });
      this.hotspotLayer.appendChild(dot);
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw = HotspotManager.normalizeYaw(this.yaw - dx * 0.15);
    this.pitch = HotspotManager.clampPitch(this.pitch + dy * 0.15);
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const fov = this.camera.fov + e.deltaY * 0.02;
    this.camera.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
    this.camera.updateProjectionMatrix();
  };

  private loop = () => {
    const yawRad = (this.yaw * Math.PI) / 180;
    const pitchRad = (this.pitch * Math.PI) / 180;
    const target = new THREE.Vector3(
      Math.cos(pitchRad) * Math.sin(yawRad),
      Math.sin(pitchRad),
      -Math.cos(pitchRad) * Math.cos(yawRad)
    );
    this.camera.lookAt(target);
    this.positionHotspots();
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private positionHotspots(): void {
    const node = this.nodes.get(this.currentNodeId);
    if (!node) return;
    const rect = this.renderer.domElement;
    const w = rect.clientWidth;
    const hgt = rect.clientHeight;
    for (const hotspot of node.hotspots ?? []) {
      const btn = this.hotspotLayer.querySelector<HTMLButtonElement>(
        `[data-hotspot-id="${hotspot.id}"]`
      );
      if (!btn) continue;
      const [x, y, z] = HotspotManager.toVector3(hotspot.yaw, hotspot.pitch, 40);
      const vec = new THREE.Vector3(x, y, z).project(this.camera);
      const behind = vec.z > 1;
      btn.style.display = behind ? "none" : "block";
      btn.style.left = `${((vec.x + 1) / 2) * w}px`;
      btn.style.top = `${((1 - vec.y) / 2) * hgt}px`;
    }
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

  /** Exposed for tests / host integrations that want to drive the camera. */
  getState() {
    return { nodeId: this.currentNodeId, yaw: this.yaw, pitch: this.pitch };
  }
}

export default PanoramaViewer;
