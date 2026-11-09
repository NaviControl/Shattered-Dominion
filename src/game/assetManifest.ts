/**
 * Shattered Dominion - 3D Asset Manifest & GLTF Model Loader
 * Manages asynchronous loading, caching, cloning, and fallbacks for .glb models.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelManifestEntry {
  file: string;
  name: string;
  category: 'landmark' | 'foliage' | 'geology' | 'unit';
  bytes: number;
}

export interface ModelManifest {
  version: string;
  region: string;
  generatedAt: string;
  models: {
    fortress: ModelManifestEntry;
    quarry: ModelManifestEntry;
    pineTreeA: ModelManifestEntry;
    pineTreeB: ModelManifestEntry;
    rockOutcrop: ModelManifestEntry;
    foliageTuft: ModelManifestEntry;
  };
}

export interface LoadedAssets {
  fortress: THREE.Group | null;
  quarry: THREE.Group | null;
  pineTreeA: THREE.Group | null;
  pineTreeB: THREE.Group | null;
  rockOutcrop: THREE.Group | null;
  foliageTuft: THREE.Group | null;
  monsterLair: THREE.Group | null;
  ancientRuin: THREE.Group | null;
  ironForge: THREE.Group | null;
  farmland: THREE.Group | null;
  lumberMill: THREE.Group | null;
  rivalCitadel: THREE.Group | null;
  allianceOutpost: THREE.Group | null;
}

export interface AssetLoadStatus {
  loaded: boolean;
  totalAssets: number;
  loadedAssets: number;
  failedAssets: string[];
  manifestLoaded: boolean;
}

// Global cached assets
let cachedAssets: LoadedAssets = {
  fortress: null,
  quarry: null,
  pineTreeA: null,
  pineTreeB: null,
  rockOutcrop: null,
  foliageTuft: null,
  monsterLair: null,
  ancientRuin: null,
  ironForge: null,
  farmland: null,
  lumberMill: null,
  rivalCitadel: null,
  allianceOutpost: null,
};

let currentStatus: AssetLoadStatus = {
  loaded: false,
  totalAssets: 13,
  loadedAssets: 0,
  failedAssets: [],
  manifestLoaded: false,
};

let loadPromise: Promise<LoadedAssets> | null = null;

export function getAssetLoadStatus(): AssetLoadStatus {
  return { ...currentStatus };
}

export async function preloadSolHeightsAssets(): Promise<LoadedAssets> {
  if (currentStatus.loaded) {
    return cachedAssets;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const loader = new GLTFLoader();

    // Fetch manifest if available
    try {
      const manifestRes = await fetch('/assets/models/manifest.json');
      if (manifestRes.ok) {
        currentStatus.manifestLoaded = true;
      }
    } catch (e) {
      console.warn('[AssetManager] Manifest check note:', e);
    }

    const texLoader = new THREE.TextureLoader();
    const loadTexture = (url: string) => {
      const tex = texLoader.load(url);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const stoneDiffuse = loadTexture('/assets/models/textures/quarry_stone_diffuse.png');
    const stoneNormal = loadTexture('/assets/models/textures/quarry_stone_normal.png');
    const stoneRoughness = loadTexture('/assets/models/textures/quarry_stone_roughness.png');
    const timberDiffuse = loadTexture('/assets/models/textures/quarry_timber_diffuse.png');
    const timberNormal = loadTexture('/assets/models/textures/quarry_timber_normal.png');

    const loadSingleModel = async (key: keyof LoadedAssets, url: string): Promise<THREE.Group | null> => {
      return new Promise((resolve) => {
        loader.load(
          url,
          (gltf) => {
            const scene = gltf.scene;
            // Enable shadow casting & receiving on all meshes
            scene.traverse((node) => {
              if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Apply rich PBR textures to quarry meshes
                if (key === 'quarry') {
                  const nodeName = (node.name || '').toLowerCase();
                  const parentName = (node.parent?.name || '').toLowerCase();
                  
                  if (nodeName.includes('timber') || nodeName.includes('crane') || parentName.includes('crane')) {
                    mesh.material = new THREE.MeshStandardMaterial({
                      map: timberDiffuse,
                      normalMap: timberNormal,
                      roughness: 0.8,
                      metalness: 0.05,
                    });
                  } else if (nodeName.includes('scree') || parentName.includes('scree')) {
                    mesh.material = new THREE.MeshStandardMaterial({
                      map: stoneDiffuse,
                      normalMap: stoneNormal,
                      roughness: 0.92,
                      metalness: 0.05,
                    });
                  } else if (!nodeName.includes('foliage') && !parentName.includes('foliage') && !nodeName.includes('cable') && !nodeName.includes('sling')) {
                    // Terraced stone benches & ashlar blocks
                    mesh.material = new THREE.MeshStandardMaterial({
                      map: stoneDiffuse,
                      normalMap: stoneNormal,
                      roughnessMap: stoneRoughness,
                      roughness: 0.85,
                      metalness: 0.08,
                    });
                  }
                }

                if (mesh.material) {
                  // Ensure depth write and correct color encoding
                  (mesh.material as THREE.Material).needsUpdate = true;
                }
              }
            });
            cachedAssets[key] = scene;
            currentStatus.loadedAssets += 1;
            console.log(`[AssetManager] Loaded 3D GLB Model with PBR: ${key} (${url})`);
            resolve(scene);
          },
          undefined,
          (err) => {
            console.warn(`[AssetManager] GLB Model Load Failed for ${key} at ${url}. Engaging procedural fallback.`, err);
            currentStatus.failedAssets.push(key);
            resolve(null);
          }
        );
      });
    };

    await Promise.all([
      loadSingleModel('fortress', '/assets/models/fortress_sol_heights.glb'),
      loadSingleModel('quarry', '/assets/models/quarry_sol_heights.glb'),
      loadSingleModel('pineTreeA', '/assets/models/pine_tree_a.glb'),
      loadSingleModel('pineTreeB', '/assets/models/pine_tree_b.glb'),
      loadSingleModel('rockOutcrop', '/assets/models/rock_outcrop.glb'),
      loadSingleModel('foliageTuft', '/assets/models/foliage_tuft.glb'),
      loadSingleModel('monsterLair', '/assets/models/monster_lair.glb'),
      loadSingleModel('ancientRuin', '/assets/models/ancient_ruin.glb'),
      loadSingleModel('ironForge', '/assets/models/iron_forge.glb'),
      loadSingleModel('farmland', '/assets/models/farmland.glb'),
      loadSingleModel('lumberMill', '/assets/models/lumber_mill.glb'),
      loadSingleModel('rivalCitadel', '/assets/models/rival_citadel.glb'),
      loadSingleModel('allianceOutpost', '/assets/models/alliance_outpost.glb'),
    ]);

    currentStatus.loaded = true;
    return cachedAssets;
  })();

  return loadPromise;
}

/**
 * Returns a cloned instance of the requested model, or null if not loaded
 */
export function getModelInstance(key: keyof LoadedAssets): THREE.Group | null {
  const original = cachedAssets[key];
  if (!original) return null;
  return original.clone(true);
}
