import * as THREE from "three";
import { el as h } from "../../../core/ui/dom";

const MOVE_SPEED = 4.0; // units / second

export interface FirstPersonControlOptions {
  container: HTMLElement;
  camera: THREE.PerspectiveCamera;
  showJoystick?: boolean;
}

/**
 * Game-like first-person movement: WASD/arrow keys, a touch joystick, and
 * mouse-drag look-around. Deliberately framework/library-free (no external
 * joystick package) so the core bundle has no extra runtime dependency.
 */
export class FirstPersonControl {
  readonly moveState = new THREE.Vector3(0, 0, 0);
  private keyMap: Record<string, boolean> = {};
  private joystickEl?: HTMLDivElement;
  private knobEl?: HTMLDivElement;
  private dragOrigin: { x: number; y: number } | null = null;
  private disposers: Array<() => void> = [];
  private yaw = 0;
  private pitch = 0;
  private looking = false;
  private lastX = 0;
  private lastY = 0;

  constructor(private opts: FirstPersonControlOptions) {
    this.bindKeyboard();
    this.bindLook();
    if (opts.showJoystick !== false) this.mountJoystick();
  }

  private bindKeyboard(): void {
    const onDown = (e: KeyboardEvent) => (this.keyMap[e.code] = true);
    const onUp = (e: KeyboardEvent) => (this.keyMap[e.code] = false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    this.disposers.push(() => window.removeEventListener("keydown", onDown));
    this.disposers.push(() => window.removeEventListener("keyup", onUp));
  }

  private bindLook(): void {
    const el = this.opts.container;
    const onDown = (e: PointerEvent) => {
      this.looking = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!this.looking) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.yaw -= dx * 0.15 * (Math.PI / 180);
      this.pitch = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, this.pitch - dy * 0.15 * (Math.PI / 180))
      );
    };
    const onUp = () => (this.looking = false);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    this.disposers.push(() => el.removeEventListener("pointerdown", onDown));
    this.disposers.push(() => window.removeEventListener("pointermove", onMove));
    this.disposers.push(() => window.removeEventListener("pointerup", onUp));
  }

  private mountJoystick(): void {
    const base = h("div", { class: "nmk-joystick" });
    const knob = h("div", { class: "nmk-joystick__knob" });
    base.appendChild(knob);
    this.opts.container.appendChild(base);
    this.joystickEl = base;
    this.knobEl = knob;

    const radius = 40;
    const onStart = (e: PointerEvent) => {
      this.dragOrigin = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!this.dragOrigin) return;
      let dx = e.clientX - this.dragOrigin.x;
      let dy = e.clientY - this.dragOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.moveState.x = dx / radius;
      this.moveState.z = dy / radius;
    };
    const onEnd = () => {
      this.dragOrigin = null;
      knob.style.transform = "translate(0, 0)";
      if (!this.hasKeyboardInput()) {
        this.moveState.x = 0;
        this.moveState.z = 0;
      }
    };
    base.addEventListener("pointerdown", onStart);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    this.disposers.push(() => base.removeEventListener("pointerdown", onStart));
    this.disposers.push(() => window.removeEventListener("pointermove", onMove));
    this.disposers.push(() => window.removeEventListener("pointerup", onEnd));
  }

  private hasKeyboardInput(): boolean {
    return ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(
      (k) => this.keyMap[k]
    );
  }

  /** Call once per frame. Applies keyboard/joystick state to the camera. */
  update(delta: number): void {
    let x = 0;
    let z = 0;
    if (this.keyMap["KeyW"] || this.keyMap["ArrowUp"]) z -= 1;
    if (this.keyMap["KeyS"] || this.keyMap["ArrowDown"]) z += 1;
    if (this.keyMap["KeyA"] || this.keyMap["ArrowLeft"]) x -= 1;
    if (this.keyMap["KeyD"] || this.keyMap["ArrowRight"]) x += 1;
    if (x !== 0 || z !== 0) {
      this.moveState.x = x;
      this.moveState.z = z;
    }

    const camera = this.opts.camera;
    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.yaw);
    camera.rotateX(this.pitch);

    if (this.moveState.lengthSq() > 0.0001) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();

      const move = new THREE.Vector3();
      move.addScaledVector(forward, -this.moveState.z);
      move.addScaledVector(right, this.moveState.x);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * delta);
        camera.position.add(move);
      }
    }
  }

  dispose(): void {
    while (this.disposers.length) this.disposers.pop()!();
    this.joystickEl?.remove();
  }
}

export default FirstPersonControl;
