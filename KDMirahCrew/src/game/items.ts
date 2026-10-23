/* Service items + 3D item meshes & crisp 2D icons for AeroCrew Cabin Duty */
import * as THREE from "three";

export type ItemCat = "drink" | "meal" | "quick";

export interface ItemDef {
  id: string;
  name: string;
  short: string;
  emoji: string;
  cat: ItemCat;
  color: string;
  station: "bar" | "oven" | "cart";
  vip?: boolean;
}

export const ITEMS: ItemDef[] = [
  { id: "coffee", name: "Teh Tarik", short: "TEH", emoji: "☕", cat: "drink", color: "#a66c44", station: "bar" },
  { id: "juice", name: "Mango Juice", short: "MGO", emoji: "🥭", cat: "drink", color: "#ff9f2e", station: "bar" },
  { id: "soda", name: "Bandung Rose", short: "BDG", emoji: "🥤", cat: "drink", color: "#ff6b9d", station: "bar" },
  { id: "champagne", name: "Gold Reserve", short: "GLD", emoji: "🥂", cat: "drink", color: "#ffd75e", station: "bar", vip: true },
  { id: "chicken", name: "Nasi Lemak", short: "NSL", emoji: "🍛", cat: "meal", color: "#d4733b", station: "oven" },
  { id: "pasta", name: "Satay Platter", short: "STY", emoji: "🍢", cat: "meal", color: "#c98b3c", station: "oven" },
  { id: "snack", name: "Kuih Box", short: "KUI", emoji: "🥮", cat: "quick", color: "#3eb88a", station: "cart" },
  { id: "pillow", name: "Silk Pillow", short: "PLW", emoji: "🛏️", cat: "quick", color: "#cfd9ec", station: "cart" },
];

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Crisp 2D icon painter for request bubbles & galley badges */
export function drawItemIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, itemIdx: number) {
  const def = ITEMS[itemIdx];
  if (!def) return;
  ctx.save();
  ctx.translate(x, y);
  if (def.cat === "drink") {
    if (def.id === "champagne") {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, -r * 0.72);
      ctx.lineTo(r * 0.34, -r * 0.72);
      ctx.lineTo(r * 0.11, r * 0.12);
      ctx.lineTo(-r * 0.11, r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#d9a726";
      ctx.lineWidth = Math.max(1.5, r * 0.13);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.12);
      ctx.lineTo(0, r * 0.64);
      ctx.moveTo(-r * 0.32, r * 0.7);
      ctx.lineTo(r * 0.32, r * 0.7);
      ctx.stroke();
    } else if (def.id === "coffee") {
      // Frothy Teh Tarik mug
      ctx.fillStyle = "#f5efe6";
      rr(ctx, -r * 0.54, -r * 0.45, r * 1.08, r * 1.02, r * 0.16);
      ctx.fill();
      ctx.fillStyle = def.color;
      rr(ctx, -r * 0.44, -r * 0.22, r * 0.88, r * 0.7, r * 0.1);
      ctx.fill();
      // white foam cap
      ctx.fillStyle = "#fffaf2";
      rr(ctx, -r * 0.46, -r * 0.4, r * 0.92, r * 0.24, r * 0.1);
      ctx.fill();
      ctx.strokeStyle = "#d6c8b6";
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      ctx.beginPath();
      ctx.arc(r * 0.6, 0.05 * r, r * 0.28, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(235,244,255,0.88)";
      rr(ctx, -r * 0.42, -r * 0.65, r * 0.84, r * 1.32, r * 0.14);
      ctx.fill();
      ctx.fillStyle = def.color;
      rr(ctx, -r * 0.34, -r * 0.2, r * 0.68, r * 0.78, r * 0.1);
      ctx.fill();
      ctx.strokeStyle = def.id === "juice" ? "#e05656" : "#fff";
      ctx.lineWidth = Math.max(1.4, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(r * 0.08, -r * 0.2);
      ctx.lineTo(r * 0.3, -r * 0.85);
      ctx.stroke();
    }
  } else if (def.cat === "meal") {
    // Porcelain plate + banana leaf accent + sambal/rice or satay
    ctx.fillStyle = "#f2f5fa";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d7a47";
    ctx.beginPath();
    ctx.arc(0, 0.04 * r, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (def.id === "chicken") {
      // Nasi Lemak rice mound + sambal + egg slice
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath();
      ctx.arc(-r * 0.12, -r * 0.04, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c93824";
      ctx.beginPath();
      ctx.arc(r * 0.24, r * 0.1, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = def.color;
      for (let i = -1; i <= 1; i++) {
        rr(ctx, -r * 0.44, i * r * 0.22 - r * 0.08, r * 0.8, r * 0.15, r * 0.07);
        ctx.fill();
      }
    }
  } else if (def.id === "pillow") {
    ctx.fillStyle = "#e8eef9";
    rr(ctx, -r * 0.72, -r * 0.5, r * 1.44, r, r * 0.38);
    ctx.fill();
    ctx.fillStyle = "#2b7a78";
    rr(ctx, -r * 0.2, -r * 0.5, r * 0.4, r, r * 0.06);
    ctx.fill();
  } else {
    // Pandan Kuih box
    ctx.fillStyle = "#f7e8c8";
    rr(ctx, -r * 0.56, -r * 0.56, r * 1.12, r * 1.12, r * 0.2);
    ctx.fill();
    ctx.fillStyle = def.color;
    rr(ctx, -r * 0.4, -r * 0.4, r * 0.8, r * 0.42, r * 0.12);
    ctx.fill();
    ctx.fillStyle = "#fffaf0";
    rr(ctx, -r * 0.4, r * 0.04, r * 0.8, r * 0.36, r * 0.12);
    ctx.fill();
  }
  ctx.restore();
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function stdMat(hex: string | number, rough = 0.42, metal = 0.05, opacity = 1): THREE.MeshStandardMaterial {
  const key = `${hex}_${rough}_${metal}_${opacity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: rough,
      metalness: metal,
      transparent: opacity < 1,
      opacity,
    });
    matCache.set(key, m);
  }
  return m;
}

/** Builds a detailed real-3D mesh for an item sitting on a tray or seat table */
export function buildItem3D(itemIdx: number): THREE.Group {
  const def = ITEMS[itemIdx] || ITEMS[0];
  const g = new THREE.Group();

  if (def.cat === "drink") {
    if (def.id === "champagne") {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.008, 12), stdMat("#e5c158", 0.25, 0.8));
      base.position.y = 0.004;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.065, 8), stdMat("#e5c158", 0.25, 0.8));
      stem.position.y = 0.038;
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 0.095, 12), stdMat("#fff8e1", 0.15, 0.1, 0.72));
      glass.position.y = 0.115;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.011, 0.068, 12), stdMat(def.color, 0.2, 0.15));
      liq.position.y = 0.105;
      g.add(base, stem, liq, glass);
    } else if (def.id === "coffee") {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.095, 14), stdMat("#f8f3eb", 0.35, 0.05));
      cup.position.y = 0.048;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.016, 12), stdMat(def.color, 0.3, 0.05));
      liq.position.y = 0.086;
      const foam = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), stdMat("#fffaf2", 0.7));
      foam.scale.set(1, 0.35, 1);
      foam.position.y = 0.09;
      g.add(cup, liq, foam);
    } else {
      const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.115, 12), stdMat("#e8f4ff", 0.15, 0.08, 0.72));
      tumbler.position.y = 0.058;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.085, 12), stdMat(def.color, 0.25));
      liq.position.y = 0.048;
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.145, 6), stdMat("#ffffff", 0.4));
      straw.position.set(0.012, 0.08, 0);
      straw.rotation.z = -0.16;
      g.add(liq, tumbler, straw);
    }
  } else if (def.cat === "meal") {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.018, 16), stdMat("#f4f7fc", 0.28, 0.06));
    plate.position.y = 0.009;
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 14), stdMat("#2a7b46", 0.55));
    leaf.position.y = 0.019;
    g.add(plate, leaf);
    if (def.id === "chicken") {
      // Nasi Lemak cone + sambal + egg
      const rice = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.048, 12), stdMat("#fffdf7", 0.75));
      rice.position.set(-0.015, 0.044, 0);
      const sambal = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), stdMat("#c93824", 0.45));
      sambal.scale.set(1, 0.45, 1);
      sambal.position.set(0.03, 0.028, 0.015);
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), stdMat("#fff6d6", 0.5));
      egg.scale.set(1, 0.55, 0.8);
      egg.position.set(0.024, 0.03, -0.028);
      g.add(rice, sambal, egg);
    } else {
      for (let i = -1; i <= 1; i++) {
        const skewer = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.02), stdMat(def.color, 0.5));
        skewer.position.set(-0.008, 0.03, i * 0.026);
        g.add(skewer);
      }
      const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.022, 10), stdMat("#9c5a25", 0.45));
      sauce.position.set(0.048, 0.028, 0);
      g.add(sauce);
    }
  } else if (def.id === "pillow") {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.115), stdMat("#eef3fc", 0.65));
    pillow.position.y = 0.028;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.058, 0.118), stdMat("#1f7a6e", 0.5, 0.1));
    band.position.y = 0.028;
    g.add(pillow, band);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.055, 0.085), stdMat("#f7e8c8", 0.5));
    box.position.y = 0.028;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.018, 0.072), stdMat(def.color, 0.42));
    top.position.y = 0.056;
    g.add(box, top);
  }
  return g;
}
