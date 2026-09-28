import type { PanoramaHotspot } from "../../core/types";

/**
 * Pure coordinate math for placing hotspots on an equirectangular sphere.
 * Deliberately has zero rendering/DOM/three.js dependency so it can be unit
 * tested cheaply and reused by both the plain PanoramaViewer and the
 * first-person VR tour scene.
 */
export class HotspotManager {
  constructor(private hotspots: PanoramaHotspot[] = []) {}

  all(): PanoramaHotspot[] {
    return this.hotspots;
  }

  set(hotspots: PanoramaHotspot[]): void {
    this.hotspots = hotspots;
  }

  byId(id: string): PanoramaHotspot | undefined {
    return this.hotspots.find((h) => h.id === id);
  }

  linkHotspots(): PanoramaHotspot[] {
    return this.hotspots.filter((h) => h.kind === "link");
  }

  /**
   * Convert yaw/pitch (degrees) into a unit vector on the viewing sphere,
   * matching the convention: yaw 0 = -Z (forward), positive yaw = clockwise
   * when viewed from above; pitch 0 = horizon, +90 = straight up.
   */
  static toVector3(yawDeg: number, pitchDeg: number, radius = 1): [number, number, number] {
    const yaw = degToRad(yawDeg);
    const pitch = degToRad(pitchDeg);
    const x = radius * Math.cos(pitch) * Math.sin(yaw);
    const y = radius * Math.sin(pitch);
    const z = -radius * Math.cos(pitch) * Math.cos(yaw);
    return [x, y, z];
  }

  /** Inverse of toVector3 - used when authoring hotspots by clicking in 3D. */
  static fromVector3(x: number, y: number, z: number): { yaw: number; pitch: number } {
    const radius = Math.hypot(x, y, z) || 1;
    const pitch = Math.asin(y / radius);
    const yaw = Math.atan2(x, -z);
    return { yaw: radToDeg(yaw), pitch: radToDeg(pitch) };
  }

  static clampPitch(pitchDeg: number, limit = 89): number {
    return Math.min(limit, Math.max(-limit, pitchDeg));
  }

  static normalizeYaw(yawDeg: number): number {
    let y = yawDeg % 360;
    if (y > 180) y -= 360;
    if (y < -180) y += 360;
    return y;
  }
}

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}
function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}
