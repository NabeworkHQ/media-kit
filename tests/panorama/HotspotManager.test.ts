import { describe, expect, it } from "vitest";
import { HotspotManager } from "../../src/viewers/panorama/HotspotManager";
import type { PanoramaHotspot } from "../../src/core/types";

const hotspots: PanoramaHotspot[] = [
  { id: "a", yaw: 0, pitch: 0, kind: "link", targetNodeId: "room-2" },
  { id: "b", yaw: 90, pitch: 10, kind: "info" },
];

describe("HotspotManager", () => {
  it("all() returns every hotspot passed to the constructor", () => {
    const mgr = new HotspotManager(hotspots);
    expect(mgr.all()).toHaveLength(2);
  });

  it("byId() finds a hotspot by id, undefined otherwise", () => {
    const mgr = new HotspotManager(hotspots);
    expect(mgr.byId("a")?.kind).toBe("link");
    expect(mgr.byId("missing")).toBeUndefined();
  });

  it("linkHotspots() filters to only navigational hotspots", () => {
    const mgr = new HotspotManager(hotspots);
    expect(mgr.linkHotspots().map((h) => h.id)).toEqual(["a"]);
  });

  it("set() replaces the working hotspot list", () => {
    const mgr = new HotspotManager(hotspots);
    mgr.set([]);
    expect(mgr.all()).toHaveLength(0);
  });

  describe("toVector3 / fromVector3 round-trip", () => {
    it("yaw=0, pitch=0 points forward (-Z)", () => {
      const [x, y, z] = HotspotManager.toVector3(0, 0, 1);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(0);
      expect(z).toBeCloseTo(-1);
    });

    it("pitch=90 points straight up (+Y) regardless of yaw", () => {
      const [x, y, z] = HotspotManager.toVector3(45, 90, 1);
      expect(x).toBeCloseTo(0, 5);
      expect(y).toBeCloseTo(1, 5);
      expect(z).toBeCloseTo(0, 5);
    });

    it("fromVector3 inverts toVector3 for arbitrary angles", () => {
      const cases: Array<[number, number]> = [
        [0, 0],
        [45, 20],
        [-90, -30],
        [179, 60],
      ];
      for (const [yaw, pitch] of cases) {
        const [x, y, z] = HotspotManager.toVector3(yaw, pitch, 1);
        const back = HotspotManager.fromVector3(x, y, z);
        expect(back.yaw).toBeCloseTo(yaw, 4);
        expect(back.pitch).toBeCloseTo(pitch, 4);
      }
    });
  });

  describe("clampPitch", () => {
    it("leaves in-range values untouched", () => {
      expect(HotspotManager.clampPitch(45)).toBe(45);
    });
    it("clamps above the limit", () => {
      expect(HotspotManager.clampPitch(120)).toBe(89);
    });
    it("clamps below the negative limit", () => {
      expect(HotspotManager.clampPitch(-120)).toBe(-89);
    });
    it("respects a custom limit", () => {
      expect(HotspotManager.clampPitch(70, 60)).toBe(60);
    });
  });

  describe("normalizeYaw", () => {
    it("leaves values already within [-180, 180] untouched", () => {
      expect(HotspotManager.normalizeYaw(90)).toBe(90);
    });
    it("wraps values above 180", () => {
      expect(HotspotManager.normalizeYaw(270)).toBeCloseTo(-90);
    });
    it("wraps values below -180", () => {
      expect(HotspotManager.normalizeYaw(-270)).toBeCloseTo(90);
    });
  });
});
