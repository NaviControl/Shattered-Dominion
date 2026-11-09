/**
 * Kingdom Conquest III - Procedural Realistic PBR Canvas Textures
 * High-performance, zero-asset-dependency texture generation for Three.js.
 */

import * as THREE from 'three';
import { TileType } from './types';

// Texture cache to prevent redundant canvas drawing
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates or retrieves a rich procedural PBR terrain texture
 */
export function getProceduralTerrainTexture(
  tileType: TileType,
  owner: 'player' | 'alliance' | 'neutral' | 'rival'
): THREE.CanvasTexture {
  const cacheKey = `${tileType}_${owner}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  // Base fill based on terrain type and owner
  if (owner === 'player') {
    // Royal Cobalt Cobblestone
    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 320);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.7, '#172554');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Cobblestone grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Golden Imperial Crest Inlay in center
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(64, 64, 384, 384);
    ctx.strokeRect(96, 96, 320, 320);

    // Diagonal heraldic lines
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(96, 96);
    ctx.moveTo(448, 64);
    ctx.lineTo(416, 96);
    ctx.moveTo(64, 448);
    ctx.lineTo(96, 416);
    ctx.moveTo(448, 448);
    ctx.lineTo(416, 416);
    ctx.stroke();

  } else if (tileType === 'farmland') {
    // Rich Golden Furrowed Agricultural Land
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#854d0e');
    grad.addColorStop(0.5, '#a16207');
    grad.addColorStop(1, '#713f12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Alternating crop rows
    ctx.fillStyle = '#ca8a04';
    for (let y = 16; y < 512; y += 32) {
      ctx.fillRect(16, y, 480, 14);
      // Small wheat speckles
      ctx.fillStyle = '#fef08a';
      for (let x = 24; x < 490; x += 18) {
        ctx.fillRect(x, y + 2, 4, 10);
      }
      ctx.fillStyle = '#ca8a04';
    }

  } else if (tileType === 'lumber_mill') {
    // Dense Pine Forest & Mossy Earth
    const grad = ctx.createRadialGradient(256, 256, 60, 256, 256, 300);
    grad.addColorStop(0, '#14532d');
    grad.addColorStop(0.6, '#166534');
    grad.addColorStop(1, '#052e16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Moss / needles noise
    ctx.fillStyle = 'rgba(21, 128, 61, 0.4)';
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const r = Math.random() * 6 + 2;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (tileType === 'stone_quarry') {
    // Chiseled Granite Slate & Marble Veins
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.5, '#475569');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Slate fractures
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 160, sy + (Math.random() - 0.5) * 160);
      ctx.stroke();
    }

  } else if (tileType === 'iron_vein') {
    // Volcanic Basalt with Molten Ore Seams
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Molten lava fissures
    ctx.strokeStyle = '#ea580c';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(60, 20);
    ctx.bezierCurveTo(180, 140, 140, 320, 240, 480);
    ctx.moveTo(220, 180);
    ctx.bezierCurveTo(340, 240, 380, 320, 470, 450);
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (tileType === 'mana_monolith') {
    // Arcane Leyline Runic Mandala
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 260);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(0.6, '#1e1b4b');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Concentric Runic Circles
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    [60, 120, 180, 230].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(256, 256, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 8-Point Star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.moveTo(256, 256);
      ctx.lineTo(256 + Math.cos(angle) * 220, 256 + Math.sin(angle) * 220);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (tileType === 'monster_lair') {
    // Scorched Abyss Brimstone
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 280);
    grad.addColorStop(0, '#450a0a');
    grad.addColorStop(0.7, '#1c1917');
    grad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Fiery demonic runes
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (tileType === 'ancient_ruin') {
    // Sunken Aquamarine Temple Tiles
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 280);
    grad.addColorStop(0, '#0e7490');
    grad.addColorStop(0.7, '#083344');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Weathered glyphs
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 96, 320, 320);
    ctx.strokeRect(144, 144, 224, 224);

  } else {
    // Neutral Wild Plains
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(0.5, '#292524');
    grad.addColorStop(1, '#18181b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle stone texture
    ctx.fillStyle = 'rgba(120, 113, 108, 0.15)';
    for (let i = 0; i < 200; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, Math.random() * 4 + 2, Math.random() * 4 + 2);
    }
  }

  // Outer border bevel
  ctx.strokeStyle = owner === 'player' ? '#f59e0b' : 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 500);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);

  return texture;
}
