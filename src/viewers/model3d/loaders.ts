import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import type { Model3DFormat } from "../../core/types";

export function detectFormat(url: string, hint?: Model3DFormat): Model3DFormat {
  if (hint) return hint;
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "glb" || ext === "gltf") return ext;
  if (ext === "fbx") return "fbx";
  if (ext === "dae") return "dae";
  throw new Error(`Unable to detect 3D model format from url: ${url}`);
}

export async function loadModel(
  url: string,
  format?: Model3DFormat,
  onProgress?: (ratio: number) => void
): Promise<THREE.Object3D> {
  const fmt = detectFormat(url, format);
  const progress = (evt: ProgressEvent) => {
    if (evt.lengthComputable) onProgress?.(evt.loaded / evt.total);
  };

  switch (fmt) {
    case "glb":
    case "gltf": {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url, progress);
      return gltf.scene;
    }
    case "fbx": {
      const loader = new FBXLoader();
      return loader.loadAsync(url, progress);
    }
    case "dae": {
      const loader = new ColladaLoader();
      const collada = await loader.loadAsync(url, progress);
      return collada.scene;
    }
    default:
      throw new Error(`Unsupported 3D model format: ${fmt satisfies never}`);
  }
}

/** Centers and scales a model to fit a `targetSize`-unit cube - keeps every uploaded model framed consistently regardless of its native units. */
export function fitToViewport(model: THREE.Object3D, targetSize = 10): { scale: number; center: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  const center = box.getCenter(new THREE.Vector3());
  return { scale, center };
}
