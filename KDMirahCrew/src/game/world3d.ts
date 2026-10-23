/* Interactive 3D Aircraft, Cabin Interior, Galley & Malaysian Sky/Archipelago World */
import * as THREE from "three";
import { buildItem3D } from "./items";
import { createPassenger3D, type PassengerRig } from "./characters";
import type { SkyMood } from "./storage";
import { getBatikSarongTexture, getCloudTexture, getKdSkyLogoTexture, paintBubbleCanvas } from "./textures";

export const CABIN_ROWS = 14;
export const ROW_PITCH = 1.12;
export const ROW_Z0 = 1.4;
export const GALLEY_Z = -2.2;
export const GALLEY_LOAD_Z = 0.65;
export const SEAT_X = [0.58, 1.04, 1.5] as const;

export interface Seat3D {
  trayPivot: THREE.Group;
  trayAmount: number;
  trayTarget: number;
  mealGroup: THREE.Group;
  pax: PassengerRig | null;
  sleeping: boolean;
  recline: number;
}

export interface Row3D {
  i: number;
  num: number;
  z: number;
  left: Seat3D[];
  right: Seat3D[];
  binPivots: [THREE.Group, THREE.Group];
  binOpen: [number, number];
  binTarget: [number, number];
  binHold: [number, number];
  shadeMeshes: [THREE.Mesh, THREE.Mesh];
  shadeClosed: [boolean, boolean];
  shadePos: [number, number];
  bubbleSprite: THREE.Sprite;
  bubbleCanvas: HTMLCanvasElement;
  bubbleTex: THREE.CanvasTexture;
}

export interface World3D {
  scene: THREE.Scene;
  aircraftGroup: THREE.Group;
  cabinGroup: THREE.Group;
  cutawayRoof: THREE.Group;
  rows: Row3D[];
  clickRing: THREE.Mesh;
  galleyRing: THREE.Mesh;
  serveHighlight: THREE.Mesh;
  ovenDoor: THREE.Group;
  fanBlades: THREE.Group[];
  strobeLights: THREE.PointLight[];
  moodStrips: THREE.MeshStandardMaterial;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  cabinFill: THREE.PointLight[];
  interactables: THREE.Object3D[];
  setSkyMood: (mood: SkyMood) => void;
  setCutaway: (cutaway: boolean) => void;
  setRowMeal: (rowIdx: number, side: -1 | 1, itemIdx: number) => void;
  updateEnvironment: (dt: number, t: number, speedFactor: number, rollRad: number, pitchRad: number) => void;
}

const SKY_PRESETS: Record<
  SkyMood,
  { top: string; horizon: string; sun: string; sunInt: number; hemiSky: string; hemiGround: string; sea: string; fog: string; cove: string }
> = {
  sunset: {
    top: "#1b2e63",
    horizon: "#ff9254",
    sun: "#ffb267",
    sunInt: 2.3,
    hemiSky: "#ffd6b8",
    hemiGround: "#3b4c73",
    sea: "#117a8b",
    fog: "#d98a6c",
    cove: "#ff9e6d",
  },
  day: {
    top: "#1666ba",
    horizon: "#9be2ff",
    sun: "#fff7e6",
    sunInt: 2.5,
    hemiSky: "#d9f2ff",
    hemiGround: "#486b8a",
    sea: "#0fa3b1",
    fog: "#9cdbff",
    cove: "#6bd4ff",
  },
  dawn: {
    top: "#2b2459",
    horizon: "#ff9ec4",
    sun: "#ffc4d6",
    sunInt: 2.0,
    hemiSky: "#ffe0f0",
    hemiGround: "#453a66",
    sea: "#1d6f8c",
    fog: "#e3a6c7",
    cove: "#c996ff",
  },
  night: {
    top: "#060b1c",
    horizon: "#162a54",
    sun: "#7aa7ff",
    sunInt: 0.9,
    hemiSky: "#6f8ec9",
    hemiGround: "#1d2640",
    sea: "#07253d",
    fog: "#101e3d",
    cove: "#ffb85c",
  },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld3D(seed = 2026): World3D {
  const rng = mulberry32(seed);
  const scene = new THREE.Scene();

  const interactables: THREE.Object3D[] = [];
  const registerInteract = (obj: THREE.Object3D, data: Record<string, unknown>) => {
    obj.userData.interact = data;
    interactables.push(obj);
  };

  /* ---------------- SKY DOME ---------------- */
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 64;
  skyCanvas.height = 256;
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(190, 24, 20),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
  );
  scene.add(skyDome);

  /* ---------------- LIGHTING ---------------- */
  const hemiLight = new THREE.HemisphereLight("#ffd6b8", "#3b4c73", 1.35);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight("#ffb267", 2.2);
  sunLight.position.set(-16, 14, -8);
  scene.add(sunLight);

  // Warm interior ceiling fill lights down the cabin so characters & batik shine vividly!
  const cabinFill: THREE.PointLight[] = [];
  [-1.2, 4.5, 10.5, 16.0].forEach((lz) => {
    const pl = new THREE.PointLight("#fff5e4", 2.2, 11, 1.3);
    pl.position.set(0, 2.05, lz);
    cabinFill.push(pl);
  });

  /* ---------------- OCEAN & MALAYSIAN ISLANDS BELOW ---------------- */
  const seaMat = new THREE.MeshStandardMaterial({
    color: "#117a8b",
    roughness: 0.22,
    metalness: 0.35,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -28;
  scene.add(sea);

  // Tropical Perhentian / Terengganu Archipelago islands & white sand lagoons drifting below!
  const islandsGroup = new THREE.Group();
  islandsGroup.position.y = -27.8;
  scene.add(islandsGroup);

  const lagoonMat = new THREE.MeshBasicMaterial({ color: "#3be2d6", transparent: true, opacity: 0.65 });
  const sandMat = new THREE.MeshStandardMaterial({ color: "#f5e3b8", roughness: 0.85 });
  const jungleMat = new THREE.MeshStandardMaterial({ color: "#267347", roughness: 0.8 });
  const sailMat = new THREE.MeshBasicMaterial({ color: "#fffdf7", side: THREE.DoubleSide });

  const islandTiles: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const isl = new THREE.Group();
    const rad = 11 + rng() * 14;
    const lagoon = new THREE.Mesh(new THREE.CircleGeometry(rad * 1.45, 18), lagoonMat);
    lagoon.rotation.x = -Math.PI / 2;
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad * 1.05, 0.7, 16), sandMat);
    beach.position.y = 0.25;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.72, 4.5 + rng() * 5, 12), jungleMat);
    hill.position.set((rng() - 0.5) * 3, 2.4, (rng() - 0.5) * 3);
    isl.add(lagoon, beach, hill);

    // Tiny traditional Perahu boat near the lagoon!
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: "#8c4a27" }));
    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.1, 3), sailMat);
    sail.position.y = 1.2;
    boat.add(hull, sail);
    boat.position.set(rad * 1.15, 0.2, 0);
    isl.add(boat);

    isl.position.set((i % 2 === 0 ? -1 : 1) * (24 + rng() * 48), 0, -140 + i * 38);
    islandsGroup.add(isl);
    islandTiles.push(isl);
  }

  // Streaming 3D Cloud puffs outside windows & around wings
  const cloudSprites: THREE.Sprite[] = [];
  const cloudMat = new THREE.SpriteMaterial({
    map: getCloudTexture(),
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  for (let i = 0; i < 34; i++) {
    const sp = new THREE.Sprite(cloudMat);
    const s = 9 + rng() * 16;
    sp.scale.set(s * 1.7, s * 0.75, 1);
    const side = i % 2 === 0 ? -1 : 1;
    sp.position.set(side * (12 + rng() * 55), -14 + rng() * 24, -95 + rng() * 200);
    scene.add(sp);
    cloudSprites.push(sp);
  }

  /* ---------------- AIRCRAFT GROUP (Rolls & banks gently in flight!) ---------------- */
  const aircraftGroup = new THREE.Group();
  scene.add(aircraftGroup);
  cabinFill.forEach((l) => aircraftGroup.add(l));

  const cabinGroup = new THREE.Group();
  aircraftGroup.add(cabinGroup);

  const cabinLen = CABIN_ROWS * ROW_PITCH + 4.4;
  const zFront = GALLEY_Z - 0.4;
  const zRear = ROW_Z0 + (CABIN_ROWS - 1) * ROW_PITCH + 1.5;
  const zCenter = (zFront + zRear) / 2;

  /* ---------------- FLOOR & BATIK CARPET RUNNER ---------------- */
  const floorMat = new THREE.MeshStandardMaterial({ color: "#232f4a", roughness: 0.82 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.14, cabinLen), floorMat);
  floor.position.set(0, -0.07, zCenter);
  cabinGroup.add(floor);

  const runnerTex = getBatikSarongTexture("royal");
  const runnerMat = new THREE.MeshStandardMaterial({
    map: runnerTex,
    roughness: 0.72,
    color: "#8fa8d6",
  });
  const aisleMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.68, cabinLen - 0.4), runnerMat);
  aisleMesh.rotation.x = -Math.PI / 2;
  aisleMesh.position.set(0, 0.004, zCenter);
  cabinGroup.add(aisleMesh);
  registerInteract(aisleMesh, { kind: "aisle" });

  // Glowing Aisle LED Path strips
  const stripMat = new THREE.MeshBasicMaterial({ color: "#5be2ff" });
  for (const sgn of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.025, cabinLen - 0.6), stripMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sgn * 0.35, 0.006, zCenter);
    cabinGroup.add(strip);
  }

  // Click-to-walk target ripple ring (Pendekar style!)
  const clickRing = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.24, 24),
    new THREE.MeshBasicMaterial({ color: "#ffd75e", side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  clickRing.rotation.x = -Math.PI / 2;
  clickRing.position.y = 0.014;
  cabinGroup.add(clickRing);

  // Active Serve Row Floor Highlight
  const serveHighlight = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 24),
    new THREE.MeshBasicMaterial({ color: "#52ffa8", side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  serveHighlight.rotation.x = -Math.PI / 2;
  serveHighlight.position.y = 0.012;
  cabinGroup.add(serveHighlight);

  /* ---------------- LOWER SIDEWALLS, WINDOW FRAMES & ROOF CUTAWAY ---------------- */
  const wallMat = new THREE.MeshStandardMaterial({ color: "#dde5f2", roughness: 0.58 });
  const extWhiteMat = new THREE.MeshStandardMaterial({ color: "#f2f6fc", roughness: 0.3, metalness: 0.18 });
  const liveryTealMat = new THREE.MeshStandardMaterial({ color: "#0f6e66", roughness: 0.32, metalness: 0.2 });
  const liveryGoldMat = new THREE.MeshStandardMaterial({ color: "#f5c451", roughness: 0.28, metalness: 0.65 });

  // Lower cabin sidewalls (up to window sill y = 0.92, always visible!)
  for (const sgn of [-1, 1]) {
    const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.92, cabinLen), wallMat);
    lowWall.position.set(sgn * 1.84, 0.46, zCenter);
    cabinGroup.add(lowWall);

    // Exterior cheatline gold + emerald stripe along fuselage belly
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, cabinLen + 2), liveryTealMat);
    stripe1.position.set(sgn * 1.9, 0.62, zCenter);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, cabinLen + 2), liveryGoldMat);
    stripe2.position.set(sgn * 1.905, 0.51, zCenter);
    cabinGroup.add(stripe1, stripe2);
  }

  // Upper Window Pillars & Crown Roof (grouped so Cutaway Mode can cleanly open the top shell!)
  const cutawayRoof = new THREE.Group();
  cabinGroup.add(cutawayRoof);

  const moodStrips = new THREE.MeshStandardMaterial({
    color: "#ff9e6d",
    emissive: new THREE.Color("#ff9e6d"),
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });

  // Curved upper ceiling arch
  const roofArch = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, cabinLen, 20, 1, true, -Math.PI * 0.48, Math.PI * 0.96),
    new THREE.MeshStandardMaterial({ color: "#e9effa", roughness: 0.55, side: THREE.DoubleSide })
  );
  roofArch.rotation.x = Math.PI / 2;
  roofArch.position.set(0, 0.55, zCenter);
  cutawayRoof.add(roofArch);

  for (const sgn of [-1, 1]) {
    const cove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, cabinLen - 1), moodStrips);
    cove.position.set(sgn * 0.62, 2.26, zCenter);
    cutawayRoof.add(cove);
  }

  /* ---------------- EXTERIOR NOSE, TAIL, SWEPT WINGS & TURBOFAN ENGINES ---------------- */
  // Nose section & cockpit windscreens
  const noseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.9, 3.6, 20), extWhiteMat);
  noseCyl.rotation.x = -Math.PI / 2;
  noseCyl.position.set(0, 0.85, zFront - 1.8);
  const radome = new THREE.Mesh(new THREE.SphereGeometry(1.42, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), extWhiteMat);
  radome.rotation.x = -Math.PI / 2;
  radome.scale.set(1, 1.5, 1);
  radome.position.set(0, 0.85, zFront - 3.6);
  const cockpitGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.36, 0.9),
    new THREE.MeshStandardMaterial({ color: "#142238", roughness: 0.12, metalness: 0.75 })
  );
  cockpitGlass.position.set(0, 1.48, zFront - 2.3);
  cockpitGlass.rotation.x = 0.28;
  aircraftGroup.add(noseCyl, radome, cockpitGlass);

  // Tail cone + Vertical Fin in Malaysian Batik Emerald & Gold!
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.9, 6.2, 20), extWhiteMat);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 0.95, zRear + 3.1);

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(3.2, 0);
  finShape.lineTo(4.6, 4.9);
  finShape.lineTo(3.1, 4.9);
  finShape.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false }), liveryTealMat);
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(0.08, 1.6, zRear + 1.4);

  const finGold = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 1.9), liveryGoldMat);
  finGold.position.set(0, 3.8, zRear + 4.2);
  finGold.rotation.x = -0.5;
  aircraftGroup.add(tailCone, fin, finGold);
  const finLogoMat = new THREE.MeshBasicMaterial({ map: getKdSkyLogoTexture("fin"), transparent: true });
  for (const sgn of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), finLogoMat);
    decal.position.set(sgn * 0.1, 3.9, zRear + 3.6);
    decal.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
    decal.rotation.z = sgn > 0 ? 0 : 0;
    aircraftGroup.add(decal);
  }
  // Fuselage titles "KD SKY" above the window line
  for (const sgn of [-1, 1]) {
    const title = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), finLogoMat);
    title.position.set(sgn * 1.93, 1.96, zFront + 3.2);
    title.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
    title.scale.set(1, 0.62, 1);
    aircraftGroup.add(title);
  }

  // Swept 3D Main Wings + Winglets + Spinning Turbofan Engines + Nav/Strobe Lights!
  const fanBlades: THREE.Group[] = [];
  const strobeLights: THREE.PointLight[] = [];
  const wingZ = zFront + cabinLen * 0.42;

  for (const sgn of [-1, 1]) {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0, -3.6);
    wingShape.lineTo(13.5, -7.8);
    wingShape.lineTo(13.5, -9.1);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 });
    const wing = new THREE.Mesh(wingGeo, extWhiteMat);
    wing.rotation.x = -Math.PI / 2;
    if (sgn < 0) wing.scale.x = -1;
    wing.position.set(sgn * 1.7, 0.05, wingZ + 1.8);
    aircraftGroup.add(wing);

    // Upturned Batik Winglet
    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 1.15), liveryTealMat);
    winglet.position.set(sgn * 15.15, 0.78, wingZ + 10.2);
    winglet.rotation.z = -sgn * 0.22;
    aircraftGroup.add(winglet);

    // Wingtip Navigation Light (Red port / Green starboard) + Strobe
    const navColor = sgn < 0 ? "#ff3b30" : "#34c759";
    const navBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: navColor }));
    navBulb.position.set(sgn * 15.3, 1.5, wingZ + 10.2);
    aircraftGroup.add(navBulb);

    const strobe = new THREE.PointLight("#ffffff", 0, 12);
    strobe.position.set(sgn * 15.35, 1.55, wingZ + 10.6);
    aircraftGroup.add(strobe);
    strobeLights.push(strobe);

    // Under-wing Turbofan Engine Nacelle + Spinning Fan
    const nacelle = new THREE.Group();
    nacelle.position.set(sgn * 5.6, -0.78, wingZ + 2.4);
    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.82, 2.9, 20, 1, true), extWhiteMat);
    cowl.rotation.x = Math.PI / 2;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 10, 22), new THREE.MeshStandardMaterial({ color: "#cfd8e6", metalness: 0.85, roughness: 0.2 }));
    lip.position.z = -1.45;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 14), new THREE.MeshStandardMaterial({ color: "#2b3242", metalness: 0.6 }));
    core.rotation.x = -Math.PI / 2;
    core.position.z = -1.1;

    const fanGroup = new THREE.Group();
    fanGroup.position.z = -1.15;
    const bladeMat = new THREE.MeshStandardMaterial({ color: "#525e75", metalness: 0.75, roughness: 0.28 });
    for (let b = 0; b < 12; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.82, 0.03), bladeMat);
      blade.rotation.z = (b / 12) * Math.PI * 2;
      blade.translateY(0.42);
      blade.rotation.y = 0.35;
      fanGroup.add(blade);
    }
    fanBlades.push(fanGroup);

    // Soft white jet contrail ribbon behind engine
    const contrail = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 42, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
    );
    contrail.rotation.x = -Math.PI / 2;
    contrail.position.z = 23;

    nacelle.add(cowl, lip, core, fanGroup, contrail);
    aircraftGroup.add(nacelle);
  }

  /* ---------------- FORWARD GALLEY (Interactive Appliances!) ---------------- */
  const bulkhead = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.14, 24, 1, false, 0, Math.PI), wallMat);
  bulkhead.rotation.z = -Math.PI / 2;
  bulkhead.rotation.y = Math.PI / 2;
  bulkhead.position.set(0, 0.22, GALLEY_Z - 0.35);
  cabinGroup.add(bulkhead);

  // Golden Batik Airline Emblem plaque on forward bulkhead
  const crest = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 32),
    new THREE.MeshBasicMaterial({ map: getKdSkyLogoTexture("crest"), transparent: true })
  );
  crest.position.set(0, 1.48, GALLEY_Z - 0.26);
  cabinGroup.add(crest);
  const crestRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 8, 40), liveryGoldMat);
  crestRing.position.copy(crest.position);
  cabinGroup.add(crestRing);

  const steelMat = new THREE.MeshStandardMaterial({ color: "#c9d3e3", roughness: 0.28, metalness: 0.72 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: "#3d4659", roughness: 0.4, metalness: 0.55 });

  // Left Bar Counter + Teh Tarik / Coffee Brewer
  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.94, 0.95), steelMat);
  barCounter.position.set(-1.16, 0.47, GALLEY_Z + 0.2);
  cabinGroup.add(barCounter);
  registerInteract(barCounter, { kind: "galleyStation", station: "bar" });

  const brewer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.38), darkSteel);
  brewer.position.set(-0.92, 1.18, GALLEY_Z + 0.15);
  cabinGroup.add(brewer);
  registerInteract(brewer, { kind: "galleyStation", station: "bar" });

  // Display drinks sitting on bar counter!
  [0, 1, 2, 3].forEach((idx, k) => {
    const sample = buildItem3D(idx);
    sample.position.set(-1.55 + k * 0.18, 0.95, GALLEY_Z + 0.42);
    cabinGroup.add(sample);
  });

  // Right Hot Convection Oven Stack + Hinged Glowing Amber Door
  const ovenStack = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.82, 0.9), darkSteel);
  ovenStack.position.set(1.16, 0.91, GALLEY_Z + 0.18);
  cabinGroup.add(ovenStack);
  registerInteract(ovenStack, { kind: "galleyStation", station: "oven" });

  const ovenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.42),
    new THREE.MeshBasicMaterial({ color: "#ff9233" })
  );
  ovenGlow.position.set(1.16, 1.18, GALLEY_Z + 0.64);
  cabinGroup.add(ovenGlow);

  const ovenDoor = new THREE.Group();
  ovenDoor.position.set(1.16, 0.96, GALLEY_Z + 0.65);
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.46, 0.04), steelMat);
  doorMesh.position.y = 0.23;
  ovenDoor.add(doorMesh);
  cabinGroup.add(ovenDoor);
  registerInteract(doorMesh, { kind: "galleyStation", station: "oven" });

  // Service Cart docked at left aisle bay
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.96, 0.72), steelMat);
  cart.position.set(-0.95, 0.48, GALLEY_Z + 1.05);
  cabinGroup.add(cart);
  registerInteract(cart, { kind: "galleyStation", station: "cart" });

  // Glowing Golden Galley Ring on floor
  const galleyRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.46, 28),
    new THREE.MeshBasicMaterial({ color: "#ffd75e", side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  );
  galleyRing.rotation.x = -Math.PI / 2;
  galleyRing.position.set(0, 0.012, 0.05);
  cabinGroup.add(galleyRing);
  registerInteract(galleyRing, { kind: "aisle" });

  // Rear Bulkhead
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.16), wallMat);
  rearWall.position.set(0, 1.1, zRear);
  cabinGroup.add(rearWall);

  /* ---------------- 14 WORKING SEAT ROWS, OVERHEAD BINS & WINDOWS ---------------- */
  const seatMatEcon = new THREE.MeshStandardMaterial({ color: "#1e3d6b", roughness: 0.68 });
  const seatHeadMat = new THREE.MeshStandardMaterial({ color: "#137a6f", roughness: 0.55 });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#2b3347", roughness: 0.5, metalness: 0.35 });
  const trayTableMat = new THREE.MeshStandardMaterial({ color: "#dce4f2", roughness: 0.42 });
  const shadeMat = new THREE.MeshStandardMaterial({ color: "#f5efe6", roughness: 0.65 });
  const winFrameMat = new THREE.MeshStandardMaterial({ color: "#cfd8e8", roughness: 0.45 });
  const binMat = new THREE.MeshStandardMaterial({ color: "#e5ecf7", roughness: 0.5 });

  const rows: Row3D[] = [];

  for (let i = 0; i < CABIN_ROWS; i++) {
    const z = ROW_Z0 + i * ROW_PITCH;
    const left: Seat3D[] = [];
    const right: Seat3D[] = [];

    // Window frames + sliding shades on both sides of the row
    const shadeMeshes: [THREE.Mesh, THREE.Mesh] = [null as any, null as any];
    const shadeClosed: [boolean, boolean] = [rng() < 0.16, rng() < 0.16];
    const shadePos: [number, number] = [shadeClosed[0] ? 1 : 0, shadeClosed[1] ? 1 : 0];

    for (let si = 0; si < 2; si++) {
      const sgn = si === 0 ? -1 : 1;
      // Pillars between windows so real exterior sky, wings & clouds show right through!
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.42), wallMat);
      pillar.position.set(sgn * 1.84, 1.23, z + ROW_PITCH * 0.5);
      cabinGroup.add(pillar);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, ROW_PITCH), wallMat);
      lintel.position.set(sgn * 1.83, 1.62, z);
      cabinGroup.add(lintel);

      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 8, 16), winFrameMat);
      bezel.rotation.y = Math.PI / 2;
      bezel.scale.set(1, 1.32, 1);
      bezel.position.set(sgn * 1.8, 1.24, z);
      cabinGroup.add(bezel);
      registerInteract(bezel, { kind: "shade", row: i, side: si });

      const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.48), shadeMat);
      shade.rotation.y = sgn < 0 ? Math.PI / 2 : -Math.PI / 2;
      shade.position.set(sgn * 1.81, 1.24 + (1 - shadePos[si]) * 0.42, z);
      cabinGroup.add(shade);
      shadeMeshes[si] = shade;
      registerInteract(shade, { kind: "shade", row: i, side: si });
    }

    // Overhead Bins (Hinged in 3D with colorful cabin luggage inside!)
    const binPivots: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
    for (let si = 0; si < 2; si++) {
      const sgn = si === 0 ? -1 : 1;
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, ROW_PITCH - 0.06), binMat);
      housing.position.set(sgn * 1.28, 1.72, z);
      cutawayRoof.add(housing);

      // Stowed carry-on suitcase inside bin!
      const bagColors = ["#c94c4c", "#2d6cdf", "#d99b26", "#2c8c7c"];
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.18, 0.58),
        new THREE.MeshStandardMaterial({ color: bagColors[(i + si) % bagColors.length], roughness: 0.5 })
      );
      bag.position.set(sgn * 1.22, 1.84, z);
      cutawayRoof.add(bag);

      const pivot = binPivots[si];
      pivot.position.set(sgn * 1.62, 2.02, z);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, ROW_PITCH - 0.08), binMat);
      door.position.set(-sgn * 0.36, -0.14, 0);
      door.rotation.z = sgn * 0.36;
      pivot.add(door);
      cutawayRoof.add(pivot);
      registerInteract(door, { kind: "bin", row: i, side: si });
    }

    // 3 Left + 3 Right Working Seats
    for (let si = 0; si < 2; si++) {
      const side: -1 | 1 = si === 0 ? -1 : 1;
      const arr = si === 0 ? left : right;
      for (let k = 0; k < 3; k++) {
        const sx = side * SEAT_X[k];
        const seatGroup = new THREE.Group();
        seatGroup.position.set(sx, 0, z);
        cabinGroup.add(seatGroup);

        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.3), frameMat);
        pedestal.position.y = 0.17;
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.1, 0.46), seatMatEcon);
        cushion.position.y = 0.39;
        seatGroup.add(pedestal, cushion);

        const sleeping = rng() < 0.16 && k > 0;
        const recline = sleeping ? 0.22 : rng() < 0.25 ? 0.08 : 0;

        const backrest = new THREE.Group();
        backrest.position.set(0, 0.42, 0.18);
        backrest.rotation.x = recline;
        const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.09), seatMatEcon);
        backMesh.position.y = 0.29;
        const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.11), seatHeadMat);
        headrest.position.y = 0.62;
        // Glowing IFE seatback screen
        const ife = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25, 0.16),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? "#2e73b8" : "#1f9d92" })
        );
        ife.position.set(0, 0.42, 0.048);
        backrest.add(backMesh, headrest, ife);
        seatGroup.add(backrest);

        // Armrests
        for (const aSgn of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.38), frameMat);
          arm.position.set(aSgn * 0.225, 0.56, 0.02);
          seatGroup.add(arm);
        }

        // Hinged 3D Seatback Tray Table (folds out toward the passenger behind in +Z!)
        const trayPivot = new THREE.Group();
        trayPivot.position.set(0, 0.68, 0.235);
        const trayBoard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.28), trayTableMat);
        trayBoard.position.set(0, 0, 0.14);
        const mealGroup = new THREE.Group();
        mealGroup.position.set(0, 0.012, 0.14);
        trayPivot.add(trayBoard, mealGroup);
        // Stowed vertically up against seatback when trayAmount == 0: rotation.x = -Math.PI / 2
        trayPivot.rotation.x = -Math.PI / 2;
        seatGroup.add(trayPivot);

        registerInteract(cushion, { kind: "row", row: i, side });
        registerInteract(backMesh, { kind: "row", row: i, side });
        registerInteract(trayBoard, { kind: "tray", row: i, side: si, seat: k });

        // Populate passenger (~80% load factor; aisle seats ready for service!)
        let pax: PassengerRig | null = null;
        if (rng() < (k === 0 ? 0.88 : 0.72)) {
          pax = createPassenger3D({
            seed: seed + i * 31 + si * 13 + k * 7,
            aisleSide: side,
            sleeping,
            headphones: rng() < 0.22,
          });
          pax.root.position.set(0, 0, 0);
          seatGroup.add(pax.root);
          pax.root.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              registerInteract(child, { kind: "row", row: i, side });
            }
          });
        }

        arr.push({
          trayPivot,
          trayAmount: 0,
          trayTarget: 0,
          mealGroup,
          pax,
          sleeping,
          recline,
        });
      }
    }

    // Floating 3D Call Bubble Sprite for active row requests!
    const bubbleCanvas = document.createElement("canvas");
    bubbleCanvas.width = 128;
    bubbleCanvas.height = 128;
    paintBubbleCanvas(bubbleCanvas, 0, 1, false, -1);
    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas);
    bubbleTex.colorSpace = THREE.SRGBColorSpace;
    const bubbleMat = new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthTest: true });
    const bubbleSprite = new THREE.Sprite(bubbleMat);
    bubbleSprite.scale.set(0.38, 0.38, 1);
    bubbleSprite.position.set(-0.68, 1.5, z);
    bubbleSprite.visible = false;
    cabinGroup.add(bubbleSprite);
    registerInteract(bubbleSprite, { kind: "row", row: i, side: -1 });

    rows.push({
      i,
      num: i + 1,
      z,
      left,
      right,
      binPivots,
      binOpen: [0, 0],
      binTarget: [0, 0],
      binHold: [0, 0],
      shadeMeshes,
      shadeClosed,
      shadePos,
      bubbleSprite,
      bubbleCanvas,
      bubbleTex,
    });
  }

  /* ---------------- HELPERS ---------------- */
  const setSkyMood = (mood: SkyMood) => {
    const p = SKY_PRESETS[mood];
    const ctx = skyCanvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
    g.addColorStop(0, p.top);
    g.addColorStop(0.52, p.horizon);
    g.addColorStop(1, p.sea);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
    skyTex.needsUpdate = true;

    hemiLight.color.set(p.hemiSky);
    hemiLight.groundColor.set(p.hemiGround);
    sunLight.color.set(p.sun);
    sunLight.intensity = p.sunInt;
    seaMat.color.set(p.sea);
    moodStrips.color.set(p.cove);
    moodStrips.emissive.set(p.cove);
    scene.fog = new THREE.FogExp2(p.fog, 0.0042);
  };

  setSkyMood("sunset");

  const setCutaway = (cutaway: boolean) => {
    cutawayRoof.visible = !cutaway;
  };

  const setRowMeal = (rowIdx: number, side: -1 | 1, itemIdx: number) => {
    const ahead = rows[rowIdx - 1];
    if (!ahead) return;
    const seat = (side === -1 ? ahead.left : ahead.right)[0];
    seat.trayTarget = 1;
    while (seat.mealGroup.children.length) seat.mealGroup.remove(seat.mealGroup.children[0]);
    if (itemIdx >= 0) {
      seat.mealGroup.add(buildItem3D(itemIdx));
    }
  };

  const updateEnvironment: World3D["updateEnvironment"] = (dt, t, speedFactor, rollRad, pitchRad) => {
    aircraftGroup.rotation.z = rollRad;
    aircraftGroup.rotation.x = pitchRad;

    // Spin jet turbofans
    fanBlades.forEach((f) => {
      f.rotation.z += dt * 22;
    });

    // Aviation wingtip double-flash strobes every 1.4s
    const cycle = t % 1.4;
    const flashOn = (cycle < 0.06 || (cycle > 0.14 && cycle < 0.2)) ? 6 : 0;
    strobeLights.forEach((s) => (s.intensity = flashOn));

    // Stream clouds & islands backward along +Z as aircraft flies forward toward -Z!
    const airSpeed = 16 * speedFactor;
    for (const sp of cloudSprites) {
      sp.position.z += airSpeed * dt;
      if (sp.position.z > 110) sp.position.z = -95;
    }
    for (const isl of islandTiles) {
      isl.position.z += airSpeed * 0.42 * dt;
      if (isl.position.z > 190) isl.position.z = -150;
    }

    // Animate hinged overhead bins, window shades, and seatback tray tables
    for (const row of rows) {
      for (let si = 0; si < 2; si++) {
        const sgn = si === 0 ? -1 : 1;
        if (row.binHold[si] > 0) {
          row.binHold[si] -= dt;
          if (row.binHold[si] <= 0) row.binTarget[si] = 0;
        }
        row.binOpen[si] += (row.binTarget[si] - row.binOpen[si]) * Math.min(1, dt * 6);
        row.binPivots[si].rotation.z = -sgn * row.binOpen[si] * 0.72;

        const targetShade = row.shadeClosed[si] ? 1 : 0;
        row.shadePos[si] += (targetShade - row.shadePos[si]) * Math.min(1, dt * 7);
        row.shadeMeshes[si].position.y = 1.24 + (1 - row.shadePos[si]) * 0.42;
        row.shadeMeshes[si].visible = row.shadePos[si] > 0.03;

        const seats = si === 0 ? row.left : row.right;
        for (const st of seats) {
          st.trayAmount += (st.trayTarget - st.trayAmount) * Math.min(1, dt * 6);
          st.trayPivot.rotation.x = (-Math.PI / 2) * (1 - st.trayAmount);
          st.mealGroup.visible = st.trayAmount > 0.65;
        }
      }
    }
  };

  return {
    scene,
    aircraftGroup,
    cabinGroup,
    cutawayRoof,
    rows,
    clickRing,
    galleyRing,
    serveHighlight,
    ovenDoor,
    fanBlades,
    strobeLights,
    moodStrips,
    hemiLight,
    sunLight,
    cabinFill,
    interactables,
    setSkyMood,
    setCutaway,
    setRowMeal,
    updateEnvironment,
  };
}
