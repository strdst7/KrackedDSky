/* Procedural high-DPI Batik Sarong, Songket, 3D Character Faces & Bubble Textures */
import * as THREE from "three";
import { drawItemIcon } from "./items";
import type { BatikTheme } from "./storage";

export const SKIN_HEX = ["#f7d6b5", "#ebb990", "#d69c6d", "#ad7549"] as const;

export interface BatikPalette {
  name: string;
  base: string;
  deep: string;
  blouse: string;
  accent: string;
  gold: string;
  flower: string;
  swatch: string;
}

export const BATIK_PALETTES: Record<BatikTheme, BatikPalette> = {
  emerald: {
    name: "Zamrud Emerald",
    base: "#0f5c56",
    deep: "#083835",
    blouse: "#14746b",
    accent: "#ff758f",
    gold: "#f5c869",
    flower: "#ffe8b3",
    swatch: "#148f82",
  },
  royal: {
    name: "Nilam Royal",
    base: "#17376e",
    deep: "#0d2147",
    blouse: "#1e478a",
    accent: "#ff8c66",
    gold: "#f7ce68",
    flower: "#cfe6ff",
    swatch: "#265db5",
  },
  crimson: {
    name: "Delima Crimson",
    base: "#781d32",
    deep: "#4a0f1e",
    blouse: "#91243d",
    accent: "#ffd166",
    gold: "#f7d06b",
    flower: "#ffd9e0",
    swatch: "#b52d4b",
  },
  violet: {
    name: "Cempaka Violet",
    base: "#4c286e",
    deep: "#2c1445",
    blouse: "#5f3487",
    accent: "#ff9ebb",
    gold: "#f5cc66",
    flower: "#f3dcff",
    swatch: "#7842ab",
  },
};

const texCache = new Map<string, THREE.CanvasTexture>();

function finishTex(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function drawHibiscus(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  petal: string,
  center: string,
  gold: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.45, -r * 0.45, -r * 0.4, -r, 0, -r);
    ctx.bezierCurveTo(r * 0.4, -r, r * 0.45, -r * 0.45, 0, 0);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Rich procedural Malaysian Sarong Batik texture with Bunga Raya & Pucuk Rebung border */
export function getBatikSarongTexture(theme: BatikTheme): THREE.CanvasTexture {
  const key = `sarong_${theme}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const pal = BATIK_PALETTES[theme];
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, pal.base);
  g.addColorStop(0.75, pal.base);
  g.addColorStop(1, pal.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // Subtle woven diamond grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = -S; i < S * 2; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.moveTo(i + S, 0);
    ctx.lineTo(i, S);
    ctx.stroke();
  }

  // Flowing gold Awan Larat tendrils
  ctx.strokeStyle = pal.gold;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 2.2;
  for (let row = 0; row < 5; row++) {
    const y0 = 60 + row * 82;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 8) {
      const y = y0 + Math.sin((x / S) * Math.PI * 6 + row) * 18;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Scattered Bunga Raya & Cempaka motifs
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 6; gx++) {
      const ox = gx * 86 + (gy % 2) * 43;
      const oy = 48 + gy * 78;
      drawHibiscus(ctx, ox % S, oy, 18, pal.accent, pal.gold, pal.gold);
      drawHibiscus(ctx, (ox + 43) % S, oy + 36, 11, pal.flower, pal.accent, pal.gold);
    }
  }

  // Front center "Kepala Kain" vertical panel (around u = 0.5)
  ctx.fillStyle = pal.deep;
  ctx.fillRect(S * 0.42, 0, S * 0.16, S);
  ctx.strokeStyle = pal.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(S * 0.42, 0, S * 0.16, S);
  for (let y = 16; y < S; y += 36) {
    drawHibiscus(ctx, S * 0.5, y, 13, pal.gold, pal.accent, pal.flower);
  }

  // Bottom hem "Pucuk Rebung" (bamboo shoot triangles)
  ctx.fillStyle = pal.deep;
  ctx.fillRect(0, S - 74, S, 74);
  for (let x = 0; x < S; x += 32) {
    ctx.fillStyle = pal.gold;
    ctx.beginPath();
    ctx.moveTo(x, S - 8);
    ctx.lineTo(x + 16, S - 66);
    ctx.lineTo(x + 32, S - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(x + 6, S - 8);
    ctx.lineTo(x + 16, S - 46);
    ctx.lineTo(x + 26, S - 8);
    ctx.closePath();
    ctx.fill();
  }

  const tex = finishTex(c, 1, 1);
  texCache.set(key, tex);
  return tex;
}

/** Delicate lace-edged Batik Kebaya blouse & Songket jacket fabric */
export function getKebayaTopTexture(theme: BatikTheme, isMale: boolean): THREE.CanvasTexture {
  const key = `top_${theme}_${isMale ? "m" : "f"}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const pal = BATIK_PALETTES[theme];
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = pal.blouse;
  ctx.fillRect(0, 0, S, S);

  // Subtle tone-on-tone floral brocade / songket stars
  ctx.globalAlpha = isMale ? 0.34 : 0.45;
  for (let y = 16; y < S; y += 42) {
    for (let x = 16; x < S; x += 42) {
      const shift = ((y / 42) | 0) % 2 ? 21 : 0;
      if (isMale) {
        // Crisp Songket Bintang (eight-point gold diamond star)
        ctx.fillStyle = pal.gold;
        ctx.beginPath();
        ctx.moveTo(x + shift, y - 9);
        ctx.lineTo(x + shift + 9, y);
        ctx.lineTo(x + shift, y + 9);
        ctx.lineTo(x + shift - 9, y);
        ctx.closePath();
        ctx.fill();
      } else {
        drawHibiscus(ctx, (x + shift) % S, y, 10, pal.flower, pal.gold, pal.gold);
      }
    }
  }
  ctx.globalAlpha = 1;

  // Gold sulam embroidery trim at bottom hem
  ctx.fillStyle = pal.gold;
  ctx.fillRect(0, S - 14, S, 5);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, S - 9, S, 4);

  const tex = finishTex(c, 1, 1);
  texCache.set(key, tex);
  return tex;
}

/** High-DPI sculpted UV face texture for Malay Stewardess / Steward / Passengers */
export function getFaceTexture(opts: {
  skinHex: string;
  female: boolean;
  glam?: boolean; // crew polish
  mood?: "happy" | "calm" | "worried" | "sleep";
}): THREE.CanvasTexture {
  const key = `face_${opts.skinHex}_${opts.female ? "f" : "m"}_${opts.glam ? 1 : 0}_${opts.mood || "happy"}`;
  if (texCache.has(key)) return texCache.get(key)!;

  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = opts.skinHex;
  ctx.fillRect(0, 0, S, S);

  // Equirectangular sphere compensation: horizontal 1px = 1.4°, vertical 1px = 0.7°
  const cx = S * 0.5;
  const cy = S * 0.52;
  for (const sgn of [-1, 1]) {
    const bg = ctx.createRadialGradient(cx + sgn * 19, cy + 16, 2, cx + sgn * 19, cy + 16, 18);
    bg.addColorStop(0, opts.female ? "rgba(235,100,120,0.38)" : "rgba(205,110,95,0.16)");
    bg.addColorStop(1, "rgba(235,100,120,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(cx + sgn * 19 - 22, cy - 8, 44, 48);
  }

  // Eyebrows
  ctx.strokeStyle = "#241610";
  ctx.lineCap = "round";
  ctx.lineWidth = opts.female ? 3.2 : 4.8;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * 14.5;
    const ey = cy - 19;
    ctx.beginPath();
    if (opts.mood === "worried") {
      ctx.moveTo(ex - sgn * 7, ey - 3);
      ctx.quadraticCurveTo(ex, ey - 7, ex + sgn * 8, ey + 3);
    } else if (opts.female) {
      ctx.moveTo(ex - sgn * 7.5, ey + 1);
      ctx.quadraticCurveTo(ex, ey - 8, ex + sgn * 8.5, ey);
    } else {
      ctx.moveTo(ex - sgn * 8, ey);
      ctx.lineTo(ex + sgn * 2.5, ey - 5);
      ctx.lineTo(ex + sgn * 8.5, ey - 2);
    }
    ctx.stroke();
  }

  // Almond eyes (compensated 1:2 equirectangular ratio so they look crisp & round in 3D!)
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * 14.5;
    const ey = cy - 3;
    if (opts.mood === "sleep") {
      ctx.strokeStyle = "#241610";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6.5, 4, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = "#fffdfb";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6.8, opts.female ? 9.5 : 8.0, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d2314";
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.5, opts.female ? 4.3 : 3.9, opts.female ? 7.8 : 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#120905";
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.5, 2.3, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(ex - 1.4, ey - 2.6, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#190e0a";
    ctx.lineWidth = opts.female ? 3.2 : 2.3;
    ctx.beginPath();
    ctx.ellipse(ex, ey - 0.5, 7.2, opts.female ? 9.6 : 8.0, 0, Math.PI * 1.04, Math.PI * 1.98);
    ctx.stroke();
    if (opts.female) {
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex + sgn * 6.5, ey - 2);
      ctx.lineTo(ex + sgn * 10, ey - 7);
      ctx.stroke();
    }
  }

  // Delicate nose tip highlight & shadow
  ctx.fillStyle = "rgba(120,68,40,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 3.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm Malaysian smile
  const my = cy + 29;
  if (opts.mood === "worried") {
    ctx.strokeStyle = opts.female ? "#b84a58" : "#8c4a42";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(cx, my + 7, 6.5, 7, 0, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  } else if (opts.female) {
    ctx.fillStyle = opts.glam ? "#c93f56" : "#b85664";
    ctx.beginPath();
    ctx.moveTo(cx - 8.5, my - 1);
    ctx.quadraticCurveTo(cx - 3, my - 6, cx, my - 3);
    ctx.quadraticCurveTo(cx + 3, my - 6, cx + 8.5, my - 1);
    ctx.quadraticCurveTo(cx, my + 12, cx - 8.5, my - 1);
    ctx.fill();
    if (opts.glam) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.beginPath();
      ctx.ellipse(cx, my + 1.5, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = opts.glam ? "#8c4239" : "#7d3f37";
    ctx.beginPath();
    ctx.moveTo(cx - 9, my - 2);
    ctx.quadraticCurveTo(cx, my + 9, cx + 9, my - 2);
    ctx.quadraticCurveTo(cx, my + 2, cx - 9, my - 2);
    ctx.fill();
    if (opts.glam) {
      ctx.fillStyle = "#fffefa";
      ctx.beginPath();
      ctx.ellipse(cx, my + 1, 5.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Offset so Three.js SphereGeometry default seam puts x=0.5 front along +Z:
  // Note: Three.js SphereGeometry faces +Z at u = 0.25 or -X at u = 0. We rotate head mesh by -Math.PI/2 on Y so u=0.5 faces +Z!
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

/** KD SKY airline wordmark + plane emblem (used on tail fin, bulkhead crest & binder) */
export function getKdSkyLogoTexture(variant: "fin" | "crest" = "fin"): THREE.CanvasTexture {
  const key = `kdsky_${variant}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const W = 512;
  const H = variant === "fin" ? 256 : 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (variant === "crest") {
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2);
    g.addColorStop(0, "#0f6e66");
    g.addColorStop(1, "#06283a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f5c756";
    ctx.lineWidth = 10;
    ctx.stroke();
  } else {
    ctx.clearRect(0, 0, W, H);
  }
  const cx = W / 2;
  const cy = variant === "fin" ? 92 : 190;
  // Plane silhouette (swept wings)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#f5c756";
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.quadraticCurveTo(14, -40, 12, 0);
  ctx.lineTo(96, 44);
  ctx.lineTo(96, 60);
  ctx.lineTo(12, 36);
  ctx.lineTo(8, 70);
  ctx.lineTo(30, 86);
  ctx.lineTo(30, 96);
  ctx.lineTo(0, 88);
  ctx.lineTo(-30, 96);
  ctx.lineTo(-30, 86);
  ctx.lineTo(-8, 70);
  ctx.lineTo(-12, 36);
  ctx.lineTo(-96, 60);
  ctx.lineTo(-96, 44);
  ctx.lineTo(-12, 0);
  ctx.quadraticCurveTo(-14, -40, 0, -78);
  ctx.closePath();
  ctx.fill();
  // hibiscus dot
  ctx.fillStyle = "#ff758f";
  ctx.beginPath();
  ctx.arc(0, -22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${variant === "fin" ? 74 : 92}px Rajdhani, Inter, Arial, sans-serif`;
  ctx.fillText("KD SKY", cx, variant === "fin" ? 236 : 372);
  if (variant === "crest") {
    ctx.fillStyle = "#f5c756";
    ctx.font = "700 34px Rajdhani, Inter, Arial, sans-serif";
    ctx.fillText("KDMIRAH CREW", cx, 428);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Soft radial cloud puff sprite texture */
export function getCloudTexture(): THREE.CanvasTexture {
  const key = "cloud_puff";
  if (texCache.has(key)) return texCache.get(key)!;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0.92)");
  g.addColorStop(0.45, "rgba(248,250,255,0.52)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/** Dynamic 2D canvas updater for 3D floating passenger call bubbles */
export function paintBubbleCanvas(
  canvas: HTMLCanvasElement,
  itemIdx: number,
  patienceFrac: number,
  vip: boolean,
  contestedFrac: number
) {
  const S = canvas.width;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2;
  const cy = S * 0.45;
  const R = S * 0.31;

  // Soft drop shadow
  ctx.fillStyle = "rgba(8,14,28,0.38)";
  ctx.beginPath();
  ctx.arc(cx, cy + 4, R * 1.14, 0, Math.PI * 2);
  ctx.fill();

  // Bubble body
  ctx.fillStyle = vip ? "#fffaf0" : "#f5f9ff";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // Pointer tail
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.25, cy + R * 0.86);
  ctx.lineTo(cx, cy + R * 1.42);
  ctx.lineTo(cx + R * 0.25, cy + R * 0.86);
  ctx.closePath();
  ctx.fill();

  // Patience ring
  const col = patienceFrac > 0.5 ? "#38d982" : patienceFrac > 0.25 ? "#ffbe3b" : "#ff5252";
  ctx.strokeStyle = "rgba(15,24,42,0.16)";
  ctx.lineWidth = R * 0.19;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = col;
  ctx.lineCap = "round";
  ctx.lineWidth = R * 0.19;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.12, -Math.PI / 2, -Math.PI / 2 + Math.max(0.03, patienceFrac) * Math.PI * 2);
  ctx.stroke();

  // Rival purser race ring
  if (contestedFrac >= 0) {
    ctx.strokeStyle = "#d580ff";
    ctx.lineWidth = R * 0.11;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.32, -Math.PI / 2, -Math.PI / 2 + Math.max(0.03, contestedFrac) * Math.PI * 2);
    ctx.stroke();
  }

  // VIP Crown badge
  if (vip) {
    ctx.fillStyle = "#f5b82e";
    ctx.beginPath();
    const wy = cy - R * 1.12;
    ctx.moveTo(cx - 12, wy + 7);
    ctx.lineTo(cx - 10, wy - 5);
    ctx.lineTo(cx - 4, wy + 2);
    ctx.lineTo(cx, wy - 8);
    ctx.lineTo(cx + 4, wy + 2);
    ctx.lineTo(cx + 10, wy - 5);
    ctx.lineTo(cx + 12, wy + 7);
    ctx.closePath();
    ctx.fill();
  }

  drawItemIcon(ctx, cx, cy, R * 0.68, itemIdx);
}
