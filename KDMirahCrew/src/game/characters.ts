/* Detailed Real-3D Malay Cabin Crew (Pramugari & Pramugara in Sarong Kebaya) + 3D Passengers */
import * as THREE from "three";
import { buildItem3D } from "./items";
import type { CrewAppearance } from "./storage";
import {
  BATIK_PALETTES,
  SKIN_HEX,
  getBatikSarongTexture,
  getFaceTexture,
  getKdSkyLogoTexture,
  getKebayaTopTexture,
} from "./textures";

export interface CrewRig {
  root: THREE.Group;
  hips: THREE.Group;
  waist: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  foreL: THREE.Group;
  armR: THREE.Group;
  foreR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  trayAnchor: THREE.Group;
  trayItemsGroup: THREE.Group;
  isFemale: boolean;
  setTrayItems: (items: (number | null)[], maxSlots: number) => void;
  animate: (opts: {
    t: number;
    speed: number; // 0..1 normalized walk speed
    carrying: boolean;
    balanceX: number;
    servingSide: number; // -1, 0, 1
    pouring: boolean;
    emote: "none" | "salam" | "wave";
    emoteT: number; // 0..1
    /** PA announcement mode: handset + illuminated binder, lip-sync & cadence */
    pa?: { active: boolean; mouth: number; pulse: number; blend: number };
  }) => void;
}

function skinMat(hex: string) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.62, metalness: 0.02 });
}

function goldMat() {
  return new THREE.MeshStandardMaterial({
    color: "#f5c756",
    roughness: 0.24,
    metalness: 0.85,
    emissive: new THREE.Color("#4a3305"),
    emissiveIntensity: 0.25,
  });
}

function hairMat(hex = "#1b1311") {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.42, metalness: 0.08 });
}

/**
 * Builds a real 3D Pretty Malay Stewardess (Pramugari in Sarong Kebaya)
 * OR Handsome Malay Steward (Pramugara in Baju Kebaya Batik / Songket Steward Tunic).
 */
export function createMalayCrew3D(app: CrewAppearance): CrewRig {
  const isFemale = app.gender === "female";
  const pal = BATIK_PALETTES[app.batik];
  const skinHex = SKIN_HEX[app.skin % SKIN_HEX.length];

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = isFemale ? 0.89 : 0.94;
  root.add(hips);

  const mSkin = skinMat(skinHex);
  const mGold = goldMat();
  const mHair = hairMat("#191210");
  const sarongTex = getBatikSarongTexture(app.batik);
  const topTex = getKebayaTopTexture(app.batik, !isFemale);

  const mSarong = new THREE.MeshStandardMaterial({
    map: sarongTex,
    roughness: 0.52,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const mTop = new THREE.MeshStandardMaterial({
    map: topTex,
    roughness: 0.46,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  const mDeep = new THREE.MeshStandardMaterial({
    color: pal.deep,
    roughness: 0.48,
    metalness: 0.08,
  });
  const mAccent = new THREE.MeshStandardMaterial({
    color: pal.accent,
    roughness: 0.4,
    metalness: 0.1,
  });

  /* ---------------- LEGS & FOOTWEAR ---------------- */
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  const hipSpan = isFemale ? 0.088 : 0.105;
  legL.position.set(-hipSpan, 0, 0);
  legR.position.set(hipSpan, 0, 0);
  hips.add(legL, legR);

  if (isFemale) {
    // Sculpted sarong-draped legs + graceful ankles + court heels
    [legL, legR].forEach((leg) => {
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.036, 0.78, 12), mSkin);
      calf.position.y = -0.43;
      // Sleek pointed pump shoe in matching deep kebaya shade with gold buckle
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.045, 0.165), mDeep);
      shoe.position.set(0, -0.855, 0.035);
      const toe = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.065, 8), mDeep);
      toe.rotation.x = Math.PI / 2;
      toe.position.set(0, -0.862, 0.135);
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.055, 8), mGold);
      heel.position.set(0, -0.86, -0.028);
      leg.add(calf, shoe, toe, heel);
    });

    // Fitted full-length Sarong Batik skirt (LatheGeometry from ankle to waist with graceful silhouette)
    const skirtProfile = [
      new THREE.Vector2(0.118, -0.78), // ankle hem
      new THREE.Vector2(0.108, -0.52), // knee taper
      new THREE.Vector2(0.148, -0.22), // hip curve
      new THREE.Vector2(0.156, -0.08), // high hip
      new THREE.Vector2(0.116, 0.05),  // cinched waist
    ];
    const skirtGeo = new THREE.LatheGeometry(skirtProfile, 24);
    const skirt = new THREE.Mesh(skirtGeo, mSarong);
    skirt.scale.set(1.0, 1.0, 0.82); // realistic oval cross-section
    skirt.rotation.y = Math.PI; // place Kepala Kain panel cleanly on front
    hips.add(skirt);

    // Front Lipat Batik (overlapping pleated front fold panel for authentic Sarong Kebaya look)
    const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.79, 0.018), mSarong);
    pleat.position.set(0.012, -0.38, 0.122);
    hips.add(pleat);
  } else {
    // Tailored dark trousers + gold batik side piping + polished oxfords
    [legL, legR].forEach((leg) => {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.066, 0.44, 12), mDeep);
      thigh.position.y = -0.22;
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.054, 0.44, 12), mDeep);
      shin.position.y = -0.65;
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.088, 0.055, 0.2),
        new THREE.MeshStandardMaterial({ color: "#151821", roughness: 0.25, metalness: 0.35 })
      );
      shoe.position.set(0, -0.9, 0.045);
      leg.add(thigh, shin, shoe);
    });
    // Waist Samping / Songket cummerbund wrap (authentic Baju Melayu / Kebaya Steward touch!)
    const samping = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.184, 0.28, 20), mSarong);
    samping.scale.set(1.02, 1, 0.8);
    samping.position.y = -0.09;
    samping.rotation.y = Math.PI;
    hips.add(samping);
  }

  /* ---------------- TORSO & KEBAYA BODICE / TUNICS ---------------- */
  const waist = new THREE.Group();
  hips.add(waist);

  if (isFemale) {
    // Sculpted hourglass Kebaya bodice with flared peplum ("kebaya labuh pendek")
    const bodiceProfile = [
      new THREE.Vector2(0.168, -0.14), // flared peplum skirt over hips
      new THREE.Vector2(0.132, -0.05),
      new THREE.Vector2(0.108, 0.06),  // slim waist
      new THREE.Vector2(0.146, 0.2),   // bust curve
      new THREE.Vector2(0.15, 0.26),   // upper chest
      new THREE.Vector2(0.132, 0.36),  // shoulder taper
      new THREE.Vector2(0.052, 0.41),  // neckline base
    ];
    const bodice = new THREE.Mesh(new THREE.LatheGeometry(bodiceProfile, 24), mTop);
    bodice.scale.set(1.02, 1.0, 0.78);
    waist.add(bodice);

    // V-neck skin inset at front throat/collarbone so V-kebaya looks real & refined
    const vSkin = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 4), mSkin);
    vSkin.rotation.z = Math.PI;
    vSkin.scale.set(1.1, 1, 0.35);
    vSkin.position.set(0, 0.33, 0.098);
    waist.add(vSkin);

    // Kelepet (folded Kebaya V-lapel embroidery borders in gold/accent)
    for (const sgn of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.22, 0.018), mAccent);
      lapel.position.set(sgn * 0.032, 0.29, 0.112);
      lapel.rotation.z = sgn * 0.24;
      waist.add(lapel);
    }

    // 3 Golden Kerongsang (traditional Malay triple brooch down front of Kebaya!)
    [0.24, 0.16, 0.08].forEach((py, idx) => {
      const brooch = new THREE.Mesh(new THREE.OctahedronGeometry(idx === 0 ? 0.017 : 0.013, 1), mGold);
      brooch.position.set(0, py, 0.122 - idx * 0.008);
      waist.add(brooch);
    });
  } else {
    // Athletic tailored male Baju Kebaya / Batik Steward Tunic Jacket
    const jacketProfile = [
      new THREE.Vector2(0.176, -0.12), // crisp tailored jacket hem
      new THREE.Vector2(0.156, 0.06),  // trim waist
      new THREE.Vector2(0.186, 0.24),  // broad chest
      new THREE.Vector2(0.194, 0.38),  // broad athletic shoulders
      new THREE.Vector2(0.065, 0.44),  // mandarin cekak musang collar base
    ];
    const jacket = new THREE.Mesh(new THREE.LatheGeometry(jacketProfile, 24), mTop);
    jacket.scale.set(1.06, 1.0, 0.76);
    waist.add(jacket);

    // Cekak Musang standing collar + Songket front placket + 5 gold Butang Baju Melayu buttons
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.05, 16), mDeep);
    collar.position.y = 0.455;
    waist.add(collar);

    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.26, 0.016), mDeep);
    placket.position.set(0, 0.29, 0.144);
    waist.add(placket);

    [0.44, 0.38, 0.32, 0.26, 0.2].forEach((py) => {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), mGold);
      btn.position.set(0, py, 0.154);
      waist.add(btn);
    });

    // Pocket Batik Kerchief (Sapu Tangan Batik) + Gold Wing Pin on chest
    const kerchief = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.042, 4), mAccent);
    kerchief.position.set(0.088, 0.32, 0.142);
    kerchief.rotation.z = -0.2;
    const wingPin = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.012, 0.01), mGold);
    wingPin.position.set(-0.088, 0.33, 0.144);
    waist.add(kerchief, wingPin);
  }

  /* ---------------- ARMS, 3/4 KEBAYA SLEEVES & HANDS ---------------- */
  const shoulderY = isFemale ? 0.365 : 0.395;
  const shoulderX = isFemale ? 0.168 : 0.218;

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-shoulderX, shoulderY, 0);
  armR.position.set(shoulderX, shoulderY, 0);
  waist.add(armL, armR);

  const foreL = new THREE.Group();
  const foreR = new THREE.Group();
  foreL.position.y = -0.23;
  foreR.position.y = -0.23;

  [
    [armL, foreL, -1],
    [armR, foreR, 1],
  ].forEach(([arm, fore]) => {
    const a = arm as THREE.Group;
    const f = fore as THREE.Group;
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.046 : 0.056, 12, 10), mTop);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(isFemale ? 0.043 : 0.053, isFemale ? 0.038 : 0.046, 0.23, 12),
      mTop
    );
    upper.position.y = -0.115;
    a.add(shoulderCap, upper, f);

    if (isFemale) {
      // 3/4 flared Kebaya sleeve + exposed graceful Malay forearm + gold Gelang bangle!
      const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.052, 0.11, 12), mTop);
      flare.position.y = -0.055;
      const cuffTrim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.005, 8, 16), mGold);
      cuffTrim.rotation.x = Math.PI / 2;
      cuffTrim.position.y = -0.11;
      const lowerSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.13, 10), mSkin);
      lowerSkin.position.y = -0.165;
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 8, 14), mGold);
      bangle.rotation.x = Math.PI / 2;
      bangle.position.y = -0.21;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), mSkin);
      hand.scale.set(0.85, 1.25, 0.65);
      hand.position.y = -0.245;
      f.add(flare, cuffTrim, lowerSkin, bangle, hand);
    } else {
      // Full tailored sleeve + Songket gold cuff + hand
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.21, 12), mTop);
      lower.position.y = -0.105;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 12), mDeep);
      cuff.position.y = -0.2;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), mSkin);
      hand.scale.set(0.9, 1.2, 0.7);
      hand.position.y = -0.245;
      f.add(lower, cuff, hand);
    }
  });

  /* ---------------- NECK, SCULPTED 3D MALAY HEAD & HAIR ---------------- */
  const head = new THREE.Group();
  head.position.y = isFemale ? 0.44 : 0.475;
  waist.add(head);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.038 : 0.048, isFemale ? 0.044 : 0.056, 0.1, 12),
    mSkin
  );
  neck.position.y = 0.025;
  head.add(neck);

  const faceTex = getFaceTexture({ skinHex, female: isFemale, glam: true, mood: "happy" });
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.56,
    metalness: 0.02,
  });

  const headR = isFemale ? 0.104 : 0.11;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 20), headMat);
  skull.scale.set(0.92, 1.06, 0.96);
  skull.rotation.y = -Math.PI / 2; // u = 0.5 faces directly along +Z front!
  skull.position.y = 0.135;
  head.add(skull);

  // Crisp 3D sculpted brows, sparkling eyes with white catchlights & rose/warm smile on +Z front!
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const irisMat = new THREE.MeshBasicMaterial({ color: "#2b160c" });
  const browMat = new THREE.MeshBasicMaterial({ color: "#1c110d" });
  const lipMat = new THREE.MeshStandardMaterial({
    color: isFemale ? "#cc3b52" : "#96463e",
    roughness: 0.35,
  });
  const eyeGroups: THREE.Group[] = [];
  const brows: THREE.Mesh[] = [];
  for (const sgn of [-1, 1]) {
    const ex = sgn * 0.036;
    const ey = 0.146;
    const ez = headR * 0.9;
    const eye = new THREE.Group();
    eye.position.set(ex, ey, ez);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeWhiteMat);
    sclera.scale.set(1.15, isFemale ? 0.95 : 0.82, 0.45);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 10, 10), irisMat);
    pupil.scale.set(1.0, 1.05, 0.45);
    pupil.position.set(0, 0, 0.004);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 8), eyeWhiteMat);
    catchlight.position.set(-0.0035, 0.004, 0.0085);

    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.034, isFemale ? 0.0055 : 0.004, 0.01), browMat);
    lash.position.set(0, 0.011, 0.002);
    lash.rotation.z = -sgn * (isFemale ? 0.12 : 0.04);
    eye.add(sclera, pupil, catchlight, lash);
    eyeGroups.push(eye);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, isFemale ? 0.0048 : 0.007, 0.008), browMat);
    brow.position.set(ex, ey + 0.028, ez - 0.002);
    brow.rotation.z = -sgn * (isFemale ? 0.14 : 0.08);
    brows.push(brow);

    head.add(eye, brow);
  }
  const smileArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, isFemale ? 0.0052 : 0.0042, 8, 14, Math.PI * 0.82),
    lipMat
  );
  smileArc.rotation.z = Math.PI * 1.09;
  smileArc.position.set(0, 0.106, headR * 0.89);
  head.add(smileArc);

  // Lip-sync mouth opening (dark inner mouth + lower lip) — scales with speech amplitude
  const mouthInner = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 12, 10),
    new THREE.MeshStandardMaterial({ color: "#4a1420", roughness: 0.6 })
  );
  mouthInner.scale.set(1.25, 0.12, 0.45);
  mouthInner.position.set(0, 0.1, headR * 0.9);
  mouthInner.visible = false;
  const lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.019, isFemale ? 0.0048 : 0.004, 8, 12, Math.PI * 0.8), lipMat);
  lowerLip.rotation.z = Math.PI * 1.1;
  lowerLip.position.set(0, 0.104, headR * 0.905);
  lowerLip.visible = false;
  head.add(mouthInner, lowerLip);

  /* ---------------- PA INTERPHONE HANDSET & ILLUMINATED SCRIPT BINDER ---------------- */
  const paGroup = new THREE.Group(); // attached to right forearm (hand)
  const handsetMat = new THREE.MeshStandardMaterial({ color: "#1b2233", roughness: 0.35, metalness: 0.45 });
  const handsetBody = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.15, 0.04), handsetMat);
  const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 14), handsetMat);
  earCup.rotation.z = Math.PI / 2;
  earCup.position.set(0, 0.078, 0.004);
  const micCup = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.018, 14), handsetMat);
  micCup.rotation.z = Math.PI / 2;
  micCup.position.set(0, -0.078, 0.01);
  const pttKey = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.03, 0.01),
    new THREE.MeshStandardMaterial({ color: "#ff5e5e", emissive: "#ff2d2d", emissiveIntensity: 0.9 })
  );
  pttKey.position.set(0.018, 0.0, 0.016);
  const paLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.0045, 8, 8),
    new THREE.MeshBasicMaterial({ color: "#7dffb2" })
  );
  paLed.position.set(-0.012, 0.03, 0.021);
  paGroup.add(handsetBody, earCup, micCup, pttKey, paLed);
  // Coiled cord trailing from handset base
  const cordMat = new THREE.MeshStandardMaterial({ color: "#2f3a52", roughness: 0.5 });
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0025, 6, 12), cordMat);
    ring.position.set(0.004 * i, -0.095 - i * 0.016, -0.004 - i * 0.004);
    ring.rotation.x = Math.PI / 2.3;
    paGroup.add(ring);
  }
  paGroup.visible = false;
  waist.add(paGroup);

  const binderGroup = new THREE.Group(); // attached to left forearm (hand)
  const binderCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.225, 0.012),
    new THREE.MeshStandardMaterial({ color: pal.deep, roughness: 0.42, metalness: 0.15 })
  );
  const binderPage = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.2),
    new THREE.MeshStandardMaterial({
      color: "#fffaf0",
      emissive: new THREE.Color("#ffe9b8"),
      emissiveIntensity: 0.9,
      roughness: 0.9,
    })
  );
  binderPage.position.z = 0.0065;
  // printed script lines
  const lineMat = new THREE.MeshBasicMaterial({ color: "#2a3450" });
  for (let i = 0; i < 7; i++) {
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.11 - (i % 3) * 0.018, 0.0045), lineMat);
    ln.position.set(-0.008 - (i % 3) * 0.009, 0.07 - i * 0.022, 0.0072);
    binderGroup.add(ln);
  }
  const binderStrip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.013), mGold);
  binderStrip.position.y = 0.112;
  const binderLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.06),
    new THREE.MeshBasicMaterial({ map: getKdSkyLogoTexture("crest"), transparent: true })
  );
  binderLogo.position.set(0.045, -0.075, 0.0075);
  binderGroup.add(binderCover, binderPage, binderStrip, binderLogo);
  binderGroup.visible = false;
  waist.add(binderGroup);

  /* ---- Two-bone IK so hands land exactly on the handset & binder ---- */
  const L1 = 0.23;
  const L2 = 0.245;
  const DOWN = new THREE.Vector3(0, -1, 0);
  const ikDir = new THREE.Vector3();
  const ikAxis = new THREE.Vector3();
  const ikUpper = new THREE.Vector3();
  const ikElbow = new THREE.Vector3();
  const ikFore = new THREE.Vector3();
  const ikTest = new THREE.Vector3();
  const ikInv = new THREE.Quaternion();
  const solveArm = (arm: THREE.Group, fore: THREE.Group, target: THREE.Vector3, pole: THREE.Vector3) => {
    ikDir.subVectors(target, arm.position);
    const d = Math.max(0.06, Math.min(L1 + L2 - 0.004, ikDir.length()));
    ikDir.normalize();
    const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
    ikAxis.crossVectors(ikDir, pole);
    if (ikAxis.lengthSq() < 1e-6) ikAxis.set(1, 0, 0);
    ikAxis.normalize();
    ikUpper.copy(ikDir).applyAxisAngle(ikAxis, alpha);
    ikTest.copy(ikUpper).sub(ikDir);
    if (ikTest.dot(pole) < 0) ikUpper.copy(ikDir).applyAxisAngle(ikAxis, -alpha);
    arm.quaternion.setFromUnitVectors(DOWN, ikUpper);
    ikElbow.copy(arm.position).addScaledVector(ikUpper, L1);
    ikFore.subVectors(target, ikElbow).normalize();
    ikInv.copy(arm.quaternion).invert();
    ikFore.applyQuaternion(ikInv);
    fore.quaternion.setFromUnitVectors(DOWN, ikFore);
  };
  const headY = isFemale ? 0.44 : 0.475;
  const shoulderYv = isFemale ? 0.365 : 0.395;
  const shoulderXv = isFemale ? 0.168 : 0.218;
  // Handset: earpiece by the ear, mouthpiece by the lips (+X side), hand grips the middle
  const handsetPos = new THREE.Vector3(0.118, headY + 0.098, 0.082);
  const handsetQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0.05, 0.065, -0.11).normalize()
  );
  const handsetRest = new THREE.Vector3(shoulderXv * 0.9, -0.02, 0.1);
  const handsetRestQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0.3));
  // Binder: chest height in front, tilted so the lit page faces up toward the crew & camera
  const binderPos = new THREE.Vector3(-0.09, shoulderYv - 0.1, 0.24);
  const binderQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.62, 0.18, 0.06));
  const binderRest = new THREE.Vector3(-shoulderXv * 0.95, -0.03, 0.08);
  const binderRestQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0.2));
  const tgtR = new THREE.Vector3();
  const tgtL = new THREE.Vector3();
  const restHandR = new THREE.Vector3(shoulderXv, shoulderYv - (L1 + L2) * 0.985, 0.03);
  const restHandL = new THREE.Vector3(-shoulderXv, shoulderYv - (L1 + L2) * 0.985, 0.03);
  const binderBottom = new THREE.Vector3();
  const poleR = new THREE.Vector3(1, -0.45, 0.35);
  const poleL = new THREE.Vector3(-1, -0.6, 0.1);

  let blinkT = 1.8 + Math.random() * 2;
  let blinkAmt = 0;

  // Subtle sculpted 3D nose bridge + ears + pearl earrings (for lady)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.028, 8), mSkin);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.128, headR * 0.95);
  head.add(nose);

  for (const sgn of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), mSkin);
    ear.scale.set(0.45, 0.85, 0.65);
    ear.position.set(sgn * headR * 0.9, 0.132, 0);
    head.add(ear);
    if (isFemale && app.hairStyle === 0) {
      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 8, 8),
        new THREE.MeshStandardMaterial({ color: "#fffaf0", roughness: 0.18, metalness: 0.3 })
      );
      pearl.position.set(sgn * headR * 0.93, 0.112, 0.008);
      head.add(pearl);
    }
  }

  if (isFemale) {
    if (app.hairStyle === 0) {
      // Classic Stewardess Sanggul (glossy dark hair swept back without covering eyes, + Sanggul bun + Bunga Raya at ear!)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 1.045, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
        mHair
      );
      crown.scale.set(0.95, 1.06, 1.0);
      crown.position.set(0, 0.146, -0.012);
      crown.rotation.x = -0.46;

      // Soft side-parted curtain wave framing upper temples
      for (const sgn of [-1, 1]) {
        const templeLock = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), mHair);
        templeLock.scale.set(0.55, 1.15, 0.85);
        templeLock.position.set(sgn * 0.078, 0.175, 0.048);
        templeLock.rotation.z = sgn * 0.35;
        head.add(templeLock);
      }

      // Voluminous low Sanggul bun at nape
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), mHair);
      bun.scale.set(1.14, 0.92, 0.95);
      bun.position.set(0, 0.105, -0.112);

      // Golden Cucuk Sanggul hairpin + 5-petal Bunga Raya tucked visibly behind ear AND on bun!
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.17, 8), mGold);
      pin.position.set(0.015, 0.128, -0.118);
      pin.rotation.z = 0.95;
      const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), mGold);
      pinHead.position.set(-0.055, 0.176, -0.118);

      const earHibiscus = new THREE.Group();
      earHibiscus.position.set(0.094, 0.158, 0.018);
      earHibiscus.rotation.y = 0.45;
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), mAccent);
        petal.scale.set(1, 0.65, 0.35);
        const ang = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.015, Math.sin(ang) * 0.015, 0);
        petal.rotation.z = ang;
        earHibiscus.add(petal);
      }
      const stamen = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), mGold);
      stamen.position.z = 0.005;
      earHibiscus.add(stamen);

      head.add(crown, bun, pin, pinHead, earHibiscus);
    } else {
      // Graceful Malaysian Silk Tudung Kebaya style (clean open face oval framing eyes & smile!)
      const tudungCap = new THREE.Mesh(
        new THREE.SphereGeometry(headR * 1.09, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        mDeep
      );
      tudungCap.position.set(0, 0.144, -0.016);
      tudungCap.rotation.x = -0.48;
      const drape = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.18, 16, 1, true), mDeep);
      drape.position.set(0, 0.042, 0.0);
      const brooch = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 1), mGold);
      brooch.position.set(0, 0.045, 0.1);
      head.add(tudungCap, drape, brooch);
    }
  } else {
    // Handsome Malay Guy Hair: voluminous side-part swept quiff OR sleek Songkok Purser cap!
    const backHair = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.045, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.54),
      mHair
    );
    backHair.scale.set(0.95, 1.05, 1.0);
    backHair.position.set(0, 0.15, -0.014);
    backHair.rotation.x = -0.48;
    head.add(backHair);

    // Tapered sideburns
    for (const sgn of [-1, 1]) {
      const burn = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.025), mHair);
      burn.position.set(sgn * headR * 0.88, 0.155, 0.02);
      head.add(burn);
    }

    if (app.hairStyle === 0) {
      // Sculpted swept Malay quiff wave at forehead
      const quiff = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), mHair);
      quiff.scale.set(1.38, 0.58, 0.95);
      quiff.position.set(0.012, 0.232, 0.036);
      quiff.rotation.set(-0.22, 0.1, 0.1);
      head.add(quiff);
    } else {
      // Crisp velvet black Songkok with gold Songket band!
      const songkokMat = new THREE.MeshStandardMaterial({ color: "#12131a", roughness: 0.78 });
      const songkok = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.106, 0.088, 20), songkokMat);
      songkok.scale.set(0.92, 1, 1.06);
      songkok.position.set(0, 0.242, 0.004);
      songkok.rotation.x = -0.06;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.108, 0.016, 20), mGold);
      band.scale.set(0.92, 1, 1.06);
      band.position.set(0, 0.21, 0.004);
      head.add(songkok, band);
    }
  }

  /* ---------------- GLEAMING 3D SILVER SERVICE TRAY ---------------- */
  const trayAnchor = new THREE.Group();
  trayAnchor.position.set(0, 0.14, 0.34);
  waist.add(trayAnchor);

  const traySilver = new THREE.MeshStandardMaterial({
    color: "#e6edf7",
    roughness: 0.2,
    metalness: 0.82,
  });
  const trayMatTop = new THREE.MeshStandardMaterial({
    map: sarongTex,
    roughness: 0.55,
    metalness: 0.08,
  });
  const trayDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.195, 0.018, 24), traySilver);
  const trayLiner = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.006, 24), trayMatTop);
  trayLiner.position.y = 0.01;
  const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.011, 8, 28), mGold);
  trayRim.rotation.x = Math.PI / 2;
  trayRim.position.y = 0.012;
  trayAnchor.add(trayDisc, trayLiner, trayRim);

  const trayItemsGroup = new THREE.Group();
  trayItemsGroup.position.y = 0.013;
  trayAnchor.add(trayItemsGroup);

  let lastSig = "";
  const setTrayItems = (items: (number | null)[], maxSlots: number) => {
    const sig = items.slice(0, maxSlots).map((x) => (x === null ? "_" : x)).join(",");
    if (sig === lastSig) return;
    lastSig = sig;
    while (trayItemsGroup.children.length) {
      trayItemsGroup.remove(trayItemsGroup.children[0]);
    }
    const filled = items.slice(0, maxSlots);
    filled.forEach((it, idx) => {
      if (it == null) return;
      const mesh = buildItem3D(it);
      const angle = maxSlots === 1 ? 0 : ((idx / maxSlots) * Math.PI * 2) - Math.PI / 2;
      const rad = maxSlots === 1 ? 0 : 0.092;
      mesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad * 0.85);
      trayItemsGroup.add(mesh);
    });
  };

  /* ---------------- PROCEDURAL ANIMATION ---------------- */
  let lastT = 0;
  const animate: CrewRig["animate"] = ({
    t,
    speed,
    carrying,
    balanceX,
    servingSide,
    pouring,
    emote,
    emoteT,
    pa,
  }) => {
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;
    const walkPhase = t * 7.2;
    const stride = isFemale ? 0.34 : 0.44; // Sarong kebaya has a graceful, poised shorter stride!
    const swing = Math.sin(walkPhase) * stride * speed;

    legL.rotation.x = swing;
    legR.rotation.x = -swing;

    // Natural blinking
    blinkT -= dt;
    if (blinkT <= 0) {
      blinkAmt = 1;
      blinkT = 2.4 + Math.random() * 2.6;
    }
    blinkAmt = Math.max(0, blinkAmt - dt * 9);
    const lid = blinkAmt > 0.5 ? 1 - (1 - blinkAmt) * 2 : blinkAmt * 2; // quick close/open
    for (const g of eyeGroups) g.scale.y = 1 - lid * 0.92;

    // Subtle graceful hip sway & walk bob
    const baseHipY = isFemale ? 0.89 : 0.94;
    hips.position.y = baseHipY + Math.abs(Math.cos(walkPhase)) * 0.022 * speed;
    hips.rotation.z = Math.sin(walkPhase) * (isFemale ? 0.045 : 0.022) * speed;
    waist.rotation.y = -Math.sin(walkPhase) * 0.05 * speed + servingSide * -0.45;
    waist.rotation.z = servingSide * 0.08;

    // Breathing + head poise
    head.rotation.y = Math.sin(t * 1.4) * 0.05 + servingSide * -0.25;
    head.rotation.x = pouring ? 0.22 : Math.sin(t * 1.9) * 0.03;

    /* ---- PA announcement pose: handset to the ear, illuminated binder in the other hand ---- */
    const paBlend = pa ? pa.blend : 0;
    paGroup.visible = paBlend > 0.02;
    binderGroup.visible = paBlend > 0.02;
    if (pa && paBlend > 0.02) {
      const m = pa.mouth;
      const k = paBlend;
      const e = k * k * (3 - 2 * k); // smoothstep
      trayAnchor.visible = false;
      waist.rotation.x = 0.02 * e;
      waist.rotation.y *= 1 - e;
      // Props glide from the hip to the ear / chest; hands follow via IK
      paGroup.position.lerpVectors(handsetRest, handsetPos, e);
      paGroup.quaternion.slerpQuaternions(handsetRestQuat, handsetQuat, e);
      binderGroup.position.lerpVectors(binderRest, binderPos, e);
      binderGroup.quaternion.slerpQuaternions(binderRestQuat, binderQuat, e);
      const bob = Math.sin(t * 1.7) * 0.004;
      paGroup.position.y += bob + pa.pulse * 0.006;
      binderBottom.set(0, -0.112, 0).applyQuaternion(binderGroup.quaternion).add(binderGroup.position);
      tgtR.copy(paGroup.position);
      tgtL.copy(binderBottom);
      tgtR.lerpVectors(restHandR, tgtR, e);
      tgtL.lerpVectors(restHandL, tgtL, e);
      solveArm(armR, foreR, tgtR, poleR);
      solveArm(armL, foreL, tgtL, poleL);
      // Speaking cadence: gentle nods on word onsets, slight glance between binder and cabin
      const glance = Math.sin(t * 0.55) > 0.6 ? 0.18 : 0;
      head.rotation.x = (0.1 + pa.pulse * 0.07 + glance) * k;
      head.rotation.y = (Math.sin(t * 0.9) * 0.08 - 0.08) * k;
      head.rotation.z = Math.sin(t * 1.3) * 0.025 * k;
      // Expressive brows & lip-sync
      for (const b of brows) b.position.y = 0.146 + 0.028 + (0.006 * pa.pulse + 0.003 * m) * k;
      mouthInner.visible = true;
      lowerLip.visible = true;
      mouthInner.scale.set(1.3 + 0.1 * m, 0.1 + 1.05 * m, 0.45 + 0.3 * m);
      mouthInner.position.y = 0.1 - 0.005 * m;
      lowerLip.position.y = 0.104 - 0.013 * m;
      smileArc.scale.set(1 - 0.25 * m, 1 - 0.35 * m, 1);
      smileArc.position.y = 0.106 + 0.004 * m;
      pttKey.scale.set(1, 1, 1 + 0.6 * m);
      return;
    } else {
      mouthInner.visible = false;
      lowerLip.visible = false;
      smileArc.scale.set(1, 1, 1);
      smileArc.position.y = 0.106;
      head.rotation.z = 0;
      for (const b of brows) b.position.y = 0.146 + 0.028;
    }

    if (emote === "salam" && emoteT > 0) {
      // Traditional Malaysian "Salam Hormat / Tangan di Dada" bow!
      const k = Math.sin(Math.min(1, emoteT) * Math.PI);
      trayAnchor.visible = false;
      waist.rotation.x = 0.28 * k;
      head.rotation.x = 0.26 * k;
      armL.rotation.set(-0.75 * k, 0.42 * k, -0.35 * k);
      foreL.rotation.set(-1.35 * k, 0, -0.45 * k);
      armR.rotation.set(-0.75 * k, -0.42 * k, 0.35 * k);
      foreR.rotation.set(-1.35 * k, 0, 0.45 * k);
      return;
    }

    if (emote === "wave" && emoteT > 0) {
      const k = Math.sin(Math.min(1, emoteT) * Math.PI);
      trayAnchor.visible = carrying;
      armR.rotation.set(-2.3 * k, 0, 0.35 * k + Math.sin(t * 12) * 0.22 * k);
      foreR.rotation.set(-0.4 * k, 0, Math.sin(t * 12) * 0.35 * k);
      armL.rotation.set(carrying ? -0.55 : -swing * 0.5, 0, -0.1);
      foreL.rotation.set(carrying ? -1.05 : -0.15, 0, 0);
      waist.rotation.x = 0;
      return;
    }

    waist.rotation.x = pouring ? 0.16 : 0;
    trayAnchor.visible = carrying || pouring;

    if (pouring) {
      // Left hand steadies tray, right hand leans forward to pour gracefully!
      armL.rotation.set(-0.62, 0.22, -0.12);
      foreL.rotation.set(-1.05, 0, 0);
      armR.rotation.set(-1.05 - Math.sin(t * 5) * 0.05, -0.18, 0.12);
      foreR.rotation.set(-0.55, 0, -0.35);
      trayAnchor.position.set(-0.06, 0.14, 0.33);
      trayAnchor.rotation.z = -balanceX * 0.22;
    } else if (carrying) {
      // Poised two-hand silver tray hold, dynamically tilting with tray balance!
      armL.rotation.set(-0.55, 0.28, -0.12 + balanceX * 0.08);
      foreL.rotation.set(-1.08, 0, 0);
      armR.rotation.set(-0.55, -0.28, 0.12 + balanceX * 0.08);
      foreR.rotation.set(-1.08, 0, 0);
      trayAnchor.position.set(balanceX * 0.05, 0.13 + Math.sin(walkPhase * 2) * 0.008 * speed, 0.34);
      trayAnchor.rotation.z = -balanceX * 0.28;
      trayAnchor.rotation.x = Math.sin(walkPhase) * 0.03 * speed;
    } else {
      // Graceful natural arm swing when empty-handed
      armL.rotation.set(-swing * 0.65, 0, -0.08);
      foreL.rotation.set(-0.22, 0, 0);
      armR.rotation.set(swing * 0.65, 0, 0.08);
      foreR.rotation.set(-0.22, 0, 0);
    }
  };

  return {
    root,
    hips,
    waist,
    head,
    armL,
    foreL,
    armR,
    foreR,
    legL,
    legR,
    trayAnchor,
    trayItemsGroup,
    isFemale,
    setTrayItems,
    animate,
  };
}

export interface PassengerRig {
  root: THREE.Group;
  head: THREE.Group;
  raiseArm: THREE.Group;
  crown: THREE.Mesh;
  setMood: (mood: "happy" | "worried" | "sleep") => void;
}

const PASSENGER_TOPS = ["#3b6fb6", "#c95b63", "#2f8f72", "#7c58a6", "#d49a3f", "#457b9d", "#a84a5c", "#3d5a80"];
const HAIR_SHADES = ["#1c1411", "#2e1f18", "#473123", "#15151c", "#63462d"];

/** Builds a real 3D seated passenger (with diverse Malaysian/international attire, tudung, headphones, VIP crown) */
export function createPassenger3D(opts: {
  seed: number;
  aisleSide: -1 | 1;
  sleeping: boolean;
  headphones: boolean;
}): PassengerRig {
  const r1 = Math.abs(Math.sin(opts.seed * 12.9898) * 43758.5453) % 1;
  const r2 = Math.abs(Math.sin(opts.seed * 78.233) * 29432.1234) % 1;
  const r3 = Math.abs(Math.sin(opts.seed * 39.421) * 19283.7712) % 1;

  const female = r1 < 0.52;
  const skinHex = SKIN_HEX[Math.floor(r2 * SKIN_HEX.length)];
  const shirtHex = PASSENGER_TOPS[Math.floor(r3 * PASSENGER_TOPS.length)];
  const wearsTudung = female && r2 > 0.55;

  const root = new THREE.Group();
  // Passenger faces forward (-Z in cabin coordinates where galley is at -Z, tail at +Z!)
  root.rotation.y = Math.PI;

  const mSkin = skinMat(skinHex);
  const mShirt = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.62 });
  const mPants = new THREE.MeshStandardMaterial({ color: "#252d3d", roughness: 0.72 });

  // Seated thighs & torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.44, 14), mShirt);
  torso.scale.set(1.08, 1, 0.75);
  torso.position.set(0, 0.74, -0.02);
  root.add(torso);

  const lap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), opts.sleeping ? new THREE.MeshStandardMaterial({ color: "#5e81ac", roughness: 0.7 }) : mPants);
  lap.position.set(0, 0.52, 0.12);
  root.add(lap);

  // Resting arm + raising arm (aisle-side arm raises when calling crew!)
  const restArm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.3, 10), mShirt);
  restArm.position.set(opts.aisleSide * 0.17, 0.7, 0.03);
  restArm.rotation.x = -0.45;
  root.add(restArm);

  const raiseArm = new THREE.Group();
  // Since root is rotated PI on Y, local -X corresponds to world +X! So local X sign = opts.aisleSide * -1
  raiseArm.position.set(-opts.aisleSide * 0.17, 0.9, -0.01);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.3, 10), mShirt);
  upper.position.y = -0.14;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), mSkin);
  hand.position.y = -0.3;
  raiseArm.add(upper, hand);
  raiseArm.rotation.x = -0.45;
  root.add(raiseArm);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.02, -0.02);
  root.add(head);

  const matHappy = new THREE.MeshStandardMaterial({
    map: getFaceTexture({ skinHex, female, mood: opts.sleeping ? "sleep" : "happy" }),
    roughness: 0.6,
  });
  const matWorried = new THREE.MeshStandardMaterial({
    map: getFaceTexture({ skinHex, female, mood: "worried" }),
    roughness: 0.6,
  });
  const matSleep = new THREE.MeshStandardMaterial({
    map: getFaceTexture({ skinHex, female, mood: "sleep" }),
    roughness: 0.6,
  });

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 16), matHappy);
  skull.scale.set(0.92, 1.04, 0.95);
  skull.rotation.y = -Math.PI / 2;
  skull.position.y = 0.09;
  head.add(skull);

  if (wearsTudung) {
    const scarfMat = new THREE.MeshStandardMaterial({ color: PASSENGER_TOPS[(Math.floor(r1 * 10) + 2) % PASSENGER_TOPS.length], roughness: 0.55 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.114, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), scarfMat);
    cap.position.set(0, 0.098, -0.014);
    cap.rotation.x = -0.48;
    const collar = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 14, 1, true), scarfMat);
    collar.position.set(0, 0.01, 0);
    head.add(cap, collar);
  } else {
    const hMat = hairMat(HAIR_SHADES[Math.floor(r1 * HAIR_SHADES.length)]);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), hMat);
    hair.position.set(0, 0.104, -0.014);
    hair.rotation.x = -0.46;
    head.add(hair);
    if (female) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), hMat);
      bun.position.set(0, 0.075, -0.1);
      head.add(bun);
    }
  }

  if (opts.headphones) {
    const hpMat = new THREE.MeshStandardMaterial({ color: "#1d222e", roughness: 0.35, metalness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.01, 8, 16, Math.PI), hpMat);
    band.position.y = 0.1;
    head.add(band);
    for (const sgn of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10), hpMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(sgn * 0.106, 0.09, 0);
      head.add(cup);
    }
  }

  // VIP Crown (hidden until passenger has a VIP order)
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.05, 5), goldMat());
  crown.position.set(0, 0.23, 0);
  crown.visible = false;
  head.add(crown);

  let curMood = opts.sleeping ? "sleep" : "happy";
  const setMood = (mood: "happy" | "worried" | "sleep") => {
    if (mood === curMood) return;
    curMood = mood;
    skull.material = mood === "worried" ? matWorried : mood === "sleep" ? matSleep : matHappy;
  };

  return { root, head, raiseArm, crown, setMood };
}
