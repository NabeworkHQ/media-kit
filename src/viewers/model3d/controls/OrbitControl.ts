import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Thin, disposable wrapper so Model3DViewer doesn't touch three's addons API directly. */
export class OrbitControl {
  readonly controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, target = new THREE.Vector3(0, 1, 0)) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.target.copy(target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.update();
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}

export default OrbitControl;
