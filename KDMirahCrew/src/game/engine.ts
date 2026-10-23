/* KrackedDSky · KDMirah Crew — Real-Time WebGL 3D Engine (Three.js, 60fps Desktop & Mobile) */
import * as THREE from "three";
import { audio } from "./audio";
import { ITEMS, drawItemIcon } from "./items";
import { createMalayCrew3D, type CrewRig } from "./characters";
import {
  CABIN_ROWS,
  GALLEY_LOAD_Z,
  GALLEY_Z,
  ROW_PITCH,
  ROW_Z0,
  buildWorld3D,
  type World3D,
} from "./world3d";
import { paintBubbleCanvas } from "./textures";
import { PA_SCRIPTS, createPaReader, type PaPhase, type PaReader } from "./pa";
import {
  loadSkills,
  saveSkills,
  xpToLevel,
  type CrewAppearance,
  type CrewSkills,
  type SkyMood,
} from "./storage";

export { ITEMS } from "./items";
export type { ItemDef } from "./items";
export { PA_ORDER, PA_SCRIPTS } from "./pa";
export type { PaPhase } from "./pa";

export type GameMode = "economy" | "first" | "match";
export type CameraPreset = "follow" | "cutaway" | "pov" | "wing";

import {
  FLIGHT_SECTORS,
  getRankInfo,
  loadCareer,
  type CareerProfile,
  type SectorDef,
} from "./career";

export interface CabinIncident {
  kind: "bin" | "anxious" | "medical";
  rowI: number;
  side: -1 | 1;
  timer: number;
  maxTimer: number;
  label: string;
}

export interface GameConfig {
  mode: GameMode;
  flights: 1 | 3 | 5;
  sectorId?: string;
  tilt: boolean;
  sound: boolean;
  haptics: boolean;
}

export type MiniGame =
  | { type: "pour"; fill: number; band: [number, number]; item: number; rowI: number; side: -1 | 1 }
  | { type: "needle"; pos: number; dir: number; speed: number; zone: number; item: number; rowI: number; side: -1 | 1 };

export interface SkillSummary {
  pourLv: number;
  pourProg: number;
  plateLv: number;
  plateProg: number;
  graceLv: number;
  graceProg: number;
}

export interface HudState {
  flightScore: number;
  totalScore: number;
  streak: number;
  mult: number;
  satisfaction: number;
  flightIndex: number;
  flightsTotal: number;
  shiftsWon: number;
  shiftsLost: number;
  timeLeft: number;
  timeTotal: number;
  opponentScore: number;
  parScore: number;
  perfects: number;
  served: number;
  turbulence: "idle" | "warn" | "active";
  stability: number;
  mode: GameMode;
  inGalley: boolean;
  trayItems: (number | null)[];
  trayMax: number;
  neededItems: number[]; // items currently requested by cabin passengers!
  balanceX: number;
  camPreset: CameraPreset;
  skills: SkillSummary;
  miniGame: MiniGame | null;
  canServeItem: number | null; // item idx if standing beside a servable passenger
  pa: PaHud;
  safety: number;
  sectorCode: string;
  incident: CabinIncident | null;
}

export interface PaHud {
  active: boolean;
  phase: PaPhase | null;
  wordIndex: number;
  progress: number;
  used: PaPhase[];
  recommended: PaPhase;
  crewName: string;
}

export interface FlightResult {
  flightIndex: number;
  flightsTotal: number;
  flightScore: number;
  totalScore: number;
  perfects: number;
  served: number;
  missed: number;
  maxStreak: number;
  satisfaction: number;
  win: boolean;
  failed: boolean;
  opponentScore: number;
  parScore: number;
  shiftsWon: number;
  shiftsLost: number;
  matchOver: boolean;
  matchWon: boolean;
  safety: number;
  incidentsResolved: number;
  paCount: number;
  sectorId: string;
}

interface RowRequest {
  side: -1 | 1;
  item: number;
  vip: boolean;
  business: boolean;
  picky: number;
  patienceMax: number;
  patience: number;
  indecisive: boolean;
  indecisiveDone: boolean;
  contested: boolean;
  rivalTimer: number;
  state: "pending" | "served" | "missed" | "stolen";
}

interface Floater {
  x: number;
  y: number;
  itemIdx?: number;
  text: string;
  color: string;
  t: number;
  life: number;
}

interface Particle2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Callbacks {
  onHud: (h: HudState) => void;
  onFlightEnd: (r: FlightResult) => void;
  onSelectCrewInPreview?: (gender: "female" | "male") => void;
  /** Fired when the player presses C (open the PA interphone picker) */
  onPaRequest?: () => void;
  /** Live PA readout state for the teleprompter overlay (also in preview mode) */
  onPa?: (pa: PaHud) => void;
}

const SERVE_DZ = 1.05;
const WALK_SPEED = 2.65;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class CabinGame {
  private wrap: HTMLElement;
  private glCanvas: HTMLCanvasElement;
  private fxCanvas: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private world: World3D;
  private cb: Callbacks;

  cfg: GameConfig;
  private appearance: CrewAppearance;
  private skyMood: SkyMood = "sunset";
  private skills: CrewSkills = loadSkills();
  private career: CareerProfile = loadCareer();
  private sector: SectorDef = FLIGHT_SECTORS[1];
  private safety = 100;
  private incidentsResolved = 0;
  private incident: CabinIncident | null = null;
  private nextIncidentAt = 20;

  // Crew 3D rigs
  private playerRig!: CrewRig;
  private partnerRig!: CrewRig;
  private selectionHalo: THREE.Mesh;

  // Loop state
  private raf = 0;
  private lastT = 0;
  private running = false;
  private paused = false;
  private destroyed = false;
  private time = 0;
  private previewMode = true;

  // Player movement & orientation
  private playerZ = 0.5;
  private playerX = 0;
  private playerYaw = 0; // 0 = facing +Z (aft toward rows), PI = facing -Z (toward galley)
  private targetWalkZ: number | null = null;
  private autoServeRow: number | null = null;
  private queuedGalleyLoad: number[] = [];
  private facingSide: -1 | 0 | 1 = 0;
  private walkSpeedNorm = 0;
  private stepTimer = 0;

  // Emotes
  private emote: "none" | "salam" | "wave" = "none";
  private emoteTimer = 0;
  private partnerEmote: "none" | "salam" | "wave" = "none";
  private partnerEmoteTimer = 0;

  // PA interphone announcement
  private paReader: PaReader | null = null;
  private paPhase: PaPhase | null = null;
  private paBlend = 0;
  private paUsed: PaPhase[] = [];
  private crewName = "MIRAH";
  private wallDt = 0.016;
  private paEmitAcc = 0;
  private paLastWord = -2;

  // Rival / partner movement
  private partnerZ = -1.1;
  private partnerX = -0.45;
  private partnerYaw = 0;
  private partnerSpeedNorm = 0;

  // Camera orbit & presets (Pendekar-style free drag + zoom + smooth presets!)
  private camPreset: CameraPreset = "follow";
  private orbitYaw = 0.42;
  private orbitPitch = 0.42;
  private orbitDist = 3.2;
  private camPos = new THREE.Vector3(1.2, 1.85, -1.6);
  private camLook = new THREE.Vector3(0, 1.15, 0.9);
  private draggingCam = false;
  private canvasPointerActive = false;
  private pointerDownPos = { x: 0, y: 0, moved: false, button: 0 };

  // Balance & input
  private balanceX = 0;
  private balanceVel = 0;
  private corrImpulse = 0;
  private tiltValue = 0;
  private tipTimer = 0;
  private keyFwd = false;
  private keyBack = false;
  private keyLeft = false;
  private keyRight = false;
  private joyWalk = 0;
  private joyLane = 0;

  // Tray & Skill-Shot MiniGames
  private trayMax = 3;
  private trayItems: (number | null)[] = [];
  private miniGame: MiniGame | null = null;
  private serveHeld = false;

  // Requests per row
  private requests: (RowRequest | null)[] = new Array(CABIN_ROWS).fill(null);
  private rowCooldown: number[] = new Array(CABIN_ROWS).fill(0);

  // Turbulence
  private turbState: "idle" | "warn" | "active" = "idle";
  private turbT = 0;
  private turbDuration = 3.4;
  private nextTurb = 12;
  private turbIntensity = 0;
  private stability = 1;
  private rollRad = 0;
  private pitchRad = 0.025;
  private lastHaptic = 0;

  // Scoring
  private flightScore = 0;
  private streak = 0;
  private maxStreak = 0;
  private perfects = 0;
  private served = 0;
  private missed = 0;
  private satisfaction = 100;
  private opponentScore = 0;
  parScore = 1400;

  private flightIndex = 1;
  private totalScore = 0;
  private shiftsWon = 0;
  private shiftsLost = 0;
  private timeTotal = 80;
  private timeLeft = 80;
  private phase: "flying" | "landing" | "done" = "flying";
  private landT = 0;
  private failed = false;

  // Screen FX
  private particles: Particle2D[] = [];
  private floaters: Floater[] = [];
  private clickRipple = 0;
  private ovenOpenAmt = 0;
  private hudTimer = 0;
  private raycaster = new THREE.Raycaster();
  private detachFns: (() => void)[] = [];

  constructor(
    container: HTMLElement,
    cfg: GameConfig,
    appearance: CrewAppearance,
    sky: SkyMood,
    cb: Callbacks
  ) {
    this.wrap = container;
    this.cfg = cfg;
    this.appearance = { ...appearance };
    this.skyMood = sky;
    this.cb = cb;

    // WebGL Canvas
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;";
    container.appendChild(this.glCanvas);

    // Crisp 2D FX Overlay Canvas
    this.fxCanvas = document.createElement("canvas");
    this.fxCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    container.appendChild(this.fxCanvas);
    this.fxCtx = this.fxCanvas.getContext("2d")!;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.glCanvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.08, 420);
    this.world = buildWorld3D(2026);
    this.world.setSkyMood(sky);

    // Golden selection halo under active character in preview
    this.selectionHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.33, 28),
      new THREE.MeshBasicMaterial({ color: "#ffd75e", side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.selectionHalo.rotation.x = -Math.PI / 2;
    this.selectionHalo.position.y = 0.015;
    this.world.cabinGroup.add(this.selectionHalo);

    this.rebuildCrewRigs();
    this.enterPreviewMode();
    this.attachInput();
    this.resize();
  }

  /* ----------------------- CREW APPEARANCE & RIGS ----------------------- */

  private rebuildCrewRigs() {
    if (this.playerRig) this.world.cabinGroup.remove(this.playerRig.root);
    if (this.partnerRig) this.world.cabinGroup.remove(this.partnerRig.root);

    this.playerRig = createMalayCrew3D(this.appearance);
    const partnerApp: CrewAppearance = {
      gender: this.appearance.gender === "female" ? "male" : "female",
      batik: this.appearance.batik,
      skin: (this.appearance.skin + 1) % 4,
      hairStyle: this.appearance.hairStyle,
    };
    this.partnerRig = createMalayCrew3D(partnerApp);

    // Tag both crew rigs so clicking them in Live Preview selects or triggers Salam!
    this.playerRig.root.traverse((o) => {
      o.userData.crewRole = "player";
    });
    this.partnerRig.root.traverse((o) => {
      o.userData.crewRole = "partner";
    });

    this.world.cabinGroup.add(this.playerRig.root);
    this.world.cabinGroup.add(this.partnerRig.root);
    this.syncTrayMeshes();
  }

  setAppearance(app: CrewAppearance) {
    const genderSwapped = app.gender !== this.appearance.gender;
    this.appearance = { ...app };
    this.rebuildCrewRigs();
    if (this.previewMode) {
      this.positionPreviewCrew();
      if (genderSwapped) {
        this.triggerEmote("salam");
      }
    }
  }

  setSky(sky: SkyMood) {
    this.skyMood = sky;
    this.world.setSkyMood(sky);
  }

  getSky(): SkyMood {
    return this.skyMood;
  }

  cycleCamera(): CameraPreset {
    const order: CameraPreset[] = ["follow", "cutaway", "pov", "wing"];
    const next = order[(order.indexOf(this.camPreset) + 1) % order.length];
    this.setCameraPreset(next);
    return next;
  }

  setCameraPreset(preset: CameraPreset) {
    this.camPreset = preset;
    if (preset === "cutaway") {
      this.orbitYaw = 0.58;
      this.orbitPitch = 0.72;
      this.orbitDist = 7.8;
    } else if (preset === "follow") {
      this.orbitYaw = 0;
      this.orbitPitch = 0.24;
      this.orbitDist = 2.15;
    } else if (preset === "wing") {
      this.orbitYaw = -0.62;
      this.orbitPitch = 0.28;
      this.orbitDist = 13.5;
    }
    this.emitHud();
  }

  /* ----------------------- PREVIEW MODE VS FLIGHT MODE ----------------------- */

  enterPreviewMode() {
    this.previewMode = true;
    this.paused = false;
    this.miniGame = null;
    this.targetWalkZ = null;
    this.world.setCutaway(true);
    // Load sample Malaysian delicacies onto tray so both Kebaya crew look alive & authentic!
    this.trayItems = [0, 4, 3];
    this.syncTrayMeshes();
    this.positionPreviewCrew();
    // Seed a couple lively ambient passengers with trays open
    this.world.rows.forEach((r, idx) => {
      r.bubbleSprite.visible = false;
      r.left[0].trayTarget = idx === 2 ? 1 : 0;
    });
    this.orbitYaw = 0.32;
    this.orbitPitch = 0.22;
    this.orbitDist = 2.38;
    this.triggerEmote("salam");
    this.emitPa();
  }

  private positionPreviewCrew() {
    // Stand prominently in mid-forward cabin facing +Z camera so crew faces, Kebaya embroidery, Galley, Seats, Wings & Islands all shine!
    const ladySelected = this.appearance.gender === "female";
    if (ladySelected) {
      this.playerX = -0.23;
      this.playerZ = 2.85;
      this.playerYaw = 0.24;
      this.partnerX = 0.28;
      this.partnerZ = 2.55;
      this.partnerYaw = -0.2;
    } else {
      this.playerX = 0.23;
      this.playerZ = 2.85;
      this.playerYaw = -0.24;
      this.partnerX = -0.28;
      this.partnerZ = 2.55;
      this.partnerYaw = 0.2;
    }
    this.partnerRig.setTrayItems([2, 6], 2);
  }

  setCareer(profile: CareerProfile) {
    this.career = { ...profile };
    const found = FLIGHT_SECTORS.find((s) => s.id === profile.selectedSector);
    if (found) this.sector = found;
  }

  resolveIncidentAction() {
    if (!this.incident || this.phase !== "flying" || this.previewMode) return;
    const row = this.world.rows[this.incident.rowI];
    if (!row) return;
    if (Math.abs(this.playerZ - row.z) <= SERVE_DZ + 0.35) {
      this.completeIncident();
    } else {
      this.targetWalkZ = row.z;
      this.facingSide = this.incident.side;
      this.showClickRing(0, row.z);
      audio.click();
    }
  }

  private completeIncident() {
    if (!this.incident) return;
    const inc = this.incident;
    const row = this.world.rows[inc.rowI];
    this.incident = null;
    this.incidentsResolved++;
    if (row) {
      if (inc.kind === "bin") {
        row.binTarget[inc.side === -1 ? 0 : 1] = 0;
      }
      const pax = (inc.side === -1 ? row.left : row.right)[0]?.pax;
      if (pax) pax.setMood("happy");
    }
    const rankMult = getRankInfo(this.career).current.scoreMult;
    const pts = Math.round((inc.kind === "medical" ? 190 : 140) * rankMult);
    this.flightScore += pts;
    this.safety = clamp(this.safety + (inc.kind === "bin" ? 10 : 8), 0, 100);
    this.satisfaction = clamp(this.satisfaction + 7, 0, 100);
    this.addSkillXp("grace", 18);
    audio.perfect();
    this.haptic([24, 30, 24]);
    this.spawnBurst(0.5, 0.44, "#52ffa8", 22);
    this.floaters.push({
      x: 0.5,
      y: 0.4,
      text: `${inc.kind === "bin" ? "BIN SECURED" : inc.kind === "medical" ? "CARE ASSIST" : "CALMED"} +${pts}`,
      color: "#52ffa8",
      t: 0,
      life: 1.25,
    });
    this.emitHud();
  }

  startMatch(cfg: GameConfig) {
    this.cfg = cfg;
    this.career = loadCareer();
    const chosen = FLIGHT_SECTORS.find((s) => s.id === (cfg.sectorId || this.career.selectedSector)) || FLIGHT_SECTORS[1];
    this.sector = chosen;
    this.setSky(chosen.sky);
    this.previewMode = false;
    this.paused = false;
    this.flightIndex = 1;
    this.totalScore = 0;
    this.shiftsWon = 0;
    this.shiftsLost = 0;
    this.trayMax = cfg.mode === "first" ? 2 : 3;
    this.timeTotal = cfg.mode === "match" ? Math.max(76, chosen.durationSec) : chosen.durationSec;
    this.computePar();
    this.camPreset = "cutaway";
    this.orbitYaw = 0.52;
    this.orbitPitch = 0.56;
    this.orbitDist = 5.4;
    this.resetFlight();
    this.emitPa();
    audio.chime();
    if (cfg.sound) {
      audio.setEnabled(true);
      audio.startMusic();
    } else {
      audio.setEnabled(false);
    }
  }

  private computePar() {
    const rate = this.cfg.mode === "first" ? 0.15 : 0.17;
    const avg = this.cfg.mode === "first" ? 245 : 175;
    this.parScore = Math.round((this.timeTotal * rate * avg * 0.56) / 25) * 25;
  }

  private resetFlight() {
    this.playerZ = 1.65;
    this.playerX = 0;
    this.playerYaw = 0;
    this.targetWalkZ = null;
    this.autoServeRow = null;
    this.queuedGalleyLoad = [];
    this.facingSide = 0;
    this.balanceX = 0;
    this.balanceVel = 0;
    this.corrImpulse = 0;
    this.tipTimer = 0;
    // Start with a helpful starter drink & snack already on tray so players have fun in the FIRST 3 SECONDS!
    this.trayItems = this.cfg.mode === "first" ? [3, 4] : [0, 4, 6];
    this.syncTrayMeshes();
    this.miniGame = null;
    this.serveHeld = false;

    this.partnerX = this.cfg.mode === "match" ? 0.05 : -0.82;
    this.partnerZ = this.cfg.mode === "match" ? 3.2 : GALLEY_Z + 0.95;
    this.partnerYaw = 0;
    this.partnerRig.setTrayItems(this.cfg.mode === "match" ? [0, 5] : [], 2);

    this.flightScore = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.perfects = 0;
    this.served = 0;
    this.missed = 0;
    this.satisfaction = 100;
    this.safety = 100;
    this.incidentsResolved = 0;
    this.incident = null;
    this.nextIncidentAt = this.time + Math.max(12, this.timeTotal / (this.sector.incidents + 1));
    this.opponentScore = 0;

    this.turbState = "idle";
    this.turbT = 0;
    this.nextTurb = this.time + (15 / this.sector.turbulenceFreq) + Math.random() * 4;
    this.turbIntensity = 0;
    this.stability = 1;
    this.timeLeft = this.timeTotal;
    this.phase = "flying";
    this.landT = 0;
    this.failed = false;

    this.requests.fill(null);
    this.paUsed = [];
    if (this.paReader) this.stopPA(false);
    for (let i = 0; i < CABIN_ROWS; i++) {
      this.rowCooldown[i] = i < 2 ? 0.8 + i * 1.2 : 2 + Math.random() * 7;
      const row = this.world.rows[i];
      row.bubbleSprite.visible = false;
      row.left.forEach((s) => (s.trayTarget = 0));
      row.right.forEach((s) => (s.trayTarget = 0));
    }
    // Spawn 2 immediate passenger requests near front rows so action starts within seconds!
    this.spawnRequest(1, 0);
    this.spawnRequest(4, 4);
    this.emitHud();
  }

  startNextFlight() {
    this.flightIndex++;
    this.resetFlight();
    this.paused = false;
    audio.chime();
  }

  /* ----------------------- INPUT & RAYCAST INTERACTION ----------------------- */

  private attachInput() {
    const el = this.glCanvas;

    const onPointerDown = (e: PointerEvent) => {
      audio.unlock();
      this.canvasPointerActive = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
      if (e.button === 2 || this.previewMode) {
        this.draggingCam = true;
      }
      // If a pour/needle minigame is active, clicking immediately interacts with it!
      if (!this.previewMode && !this.paused && this.miniGame) {
        this.pressServe();
        return;
      }
      this.draggingCam = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      if (!this.previewMode && !this.draggingCam) {
        // Subtle mouse balance nudge
        this.corrImpulse = clamp(this.corrImpulse + e.movementX * 0.004, -1.4, 1.4);
      }
      if (this.draggingCam) {
        if (Math.hypot(dx, dy) > 6) this.pointerDownPos.moved = true;
        if (this.pointerDownPos.moved) {
          this.orbitYaw -= e.movementX * 0.0065;
          this.orbitPitch = clamp(this.orbitPitch + e.movementY * 0.005, -0.12, 1.28);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = this.canvasPointerActive && !this.pointerDownPos.moved;
      this.canvasPointerActive = false;
      this.draggingCam = false;
      this.releaseServe();
      if (wasClick && !this.paused) {
        this.handleSceneClick(e.clientX, e.clientY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const maxD = this.previewMode || this.camPreset === "cutaway" || this.camPreset === "wing" ? 22 : 6.5;
      this.orbitDist = clamp(this.orbitDist + e.deltaY * 0.004, 1.35, maxD);
    };

    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);

    this.detachFns.push(() => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
    });

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (this.previewMode) {
        if (e.code === "KeyC" && down && !e.repeat) {
          if (this.paReader) this.stopPA(false);
          else this.cb.onPaRequest?.();
        }
        return;
      }
      if (this.paReader && e.code !== "KeyC" && e.code !== "KeyV") return; // crew is on the interphone
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          this.keyFwd = down;
          if (down) this.clearAutoWalk();
          break;
        case "KeyS":
        case "ArrowDown":
          this.keyBack = down;
          if (down) this.clearAutoWalk();
          break;
        case "KeyA":
        case "ArrowLeft":
          this.keyLeft = down;
          if (down) this.corrImpulse -= 0.48;
          break;
        case "KeyD":
        case "ArrowRight":
          this.keyRight = down;
          if (down) this.corrImpulse += 0.48;
          break;
        case "KeyG":
          if (down && !e.repeat) this.triggerEmote("salam");
          break;
        case "KeyV":
          if (down && !e.repeat) this.cycleCamera();
          break;
        case "KeyC":
          if (down && !e.repeat) {
            if (this.paReader) this.stopPA(false);
            else this.cb.onPaRequest?.();
          }
          break;
        case "Space":
        case "KeyE":
          e.preventDefault();
          if (down && !e.repeat) this.pressServe();
          if (!down) this.releaseServe();
          break;
        default:
          if (down && !e.repeat && e.code.startsWith("Digit")) {
            const n = parseInt(e.code.slice(5), 10);
            if (n >= 1 && n <= 8) this.requestLoadItem(n - 1);
          }
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    this.detachFns.push(() => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    });

    if (this.cfg.tilt) {
      const onTilt = (e: DeviceOrientationEvent) => {
        if (e.gamma != null) this.tiltValue = clamp(e.gamma / 24, -1.2, 1.2);
      };
      window.addEventListener("deviceorientation", onTilt);
      this.detachFns.push(() => window.removeEventListener("deviceorientation", onTilt));
    }

    const onResize = () => this.resize();
    window.addEventListener("resize", onResize);
    this.detachFns.push(() => window.removeEventListener("resize", onResize));
  }

  private clearAutoWalk() {
    this.targetWalkZ = null;
    this.autoServeRow = null;
  }

  /** Raycast click directly into the 3D world: crew selection, bins, window shades, tray tables, galley, aisle walk & passenger serve! */
  private handleSceneClick(clientX: number, clientY: number) {
    if (this.paReader) return;
    const rect = this.glCanvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    // 1. Check crew character clicks first (especially fun in Live Preview!)
    const crewHits = this.raycaster.intersectObjects([this.playerRig.root, this.partnerRig.root], true);
    if (crewHits.length > 0) {
      const role = crewHits[0].object.userData.crewRole;
      if (this.previewMode) {
        if (role === "partner") {
          const nextGender = this.appearance.gender === "female" ? "male" : "female";
          this.cb.onSelectCrewInPreview?.(nextGender);
        } else {
          this.triggerEmote("salam");
        }
        return;
      } else if (role === "player") {
        this.triggerEmote("salam");
        return;
      }
    }

    // 2. Check interactive cabin props (bins, window shades, tray tables, galley, rows, aisle)
    const hits = this.raycaster.intersectObjects(this.world.interactables, false);
    if (hits.length === 0) return;

    const hit = hits[0];
    const data = hit.object.userData.interact as Record<string, any> | undefined;
    if (!data) return;

    if (data.kind === "bin") {
      const r = this.world.rows[data.row];
      const s = data.side as 0 | 1;
      r.binTarget[s] = r.binTarget[s] > 0.5 ? 0 : 1;
      r.binHold[s] = 0;
      if (this.incident && this.incident.kind === "bin" && this.incident.rowI === data.row) {
        this.completeIncident();
      } else {
        audio.click();
      }
      return;
    }

    if (data.kind === "shade") {
      const r = this.world.rows[data.row];
      const s = data.side as 0 | 1;
      r.shadeClosed[s] = !r.shadeClosed[s];
      audio.click();
      return;
    }

    if (data.kind === "tray") {
      const r = this.world.rows[data.row];
      const seat = (data.side === 0 ? r.left : r.right)[data.seat];
      seat.trayTarget = seat.trayTarget > 0.5 ? 0 : 1;
      audio.click();
      return;
    }

    if (this.previewMode) return;

    if (data.kind === "galleyStation") {
      const station = data.station as "bar" | "oven" | "cart";
      // Pick smart needed item from this station first, otherwise cycle station items!
      const candidates = ITEMS.map((d, idx) => ({ d, idx })).filter((x) => x.d.station === station);
      const needed = this.getNeededItems();
      const pick = candidates.find((c) => needed.includes(c.idx)) || candidates[0];
      if (pick) this.requestLoadItem(pick.idx);
      return;
    }

    if (data.kind === "row") {
      const rowIdx = data.row as number;
      const row = this.world.rows[rowIdx];
      const req = this.requests[rowIdx];
      this.targetWalkZ = row.z;
      this.autoServeRow = rowIdx;
      this.facingSide = req && req.state === "pending" ? req.side : (data.side as -1 | 1);
      this.showClickRing(0, row.z);
      // If already right beside this row, serve immediately!
      if (Math.abs(this.playerZ - row.z) <= SERVE_DZ) {
        this.pressServe();
      }
      return;
    }

    if (data.kind === "aisle") {
      const localPt = this.world.cabinGroup.worldToLocal(hit.point.clone());
      const tz = clamp(localPt.z, -0.3, ROW_Z0 + (CABIN_ROWS - 1) * ROW_PITCH + 0.6);
      this.targetWalkZ = tz;
      this.autoServeRow = null;
      this.showClickRing(0, tz);
    }
  }

  private showClickRing(x: number, z: number) {
    this.world.clickRing.position.set(x, 0.015, z);
    this.clickRipple = 1;
  }

  /* ----------------------- EXTERNAL / UI CONTROLS ----------------------- */

  setJoystick(walk: number, lane: number) {
    this.joyWalk = clamp(walk, -1, 1);
    this.joyLane = clamp(lane, -1, 1);
    if (Math.abs(walk) > 0.15) this.clearAutoWalk();
  }

  pressServeExternal() {
    this.pressServe();
  }

  releaseServeExternal() {
    this.releaseServe();
  }

  /** Smart Galley Load: loads immediately if at Galley, OR walks to Galley automatically & loads it! */
  requestLoadItem(itemIdx: number) {
    if (itemIdx < 0 || itemIdx >= ITEMS.length || this.phase !== "flying") return;
    if (this.playerZ <= GALLEY_LOAD_Z) {
      this.loadItemNow(itemIdx);
    } else {
      // Walk back to galley & queue item automatically (Pendekar click-to-act style!)
      if (this.trayItems.length + this.queuedGalleyLoad.length < this.trayMax) {
        this.queuedGalleyLoad.push(itemIdx);
      }
      this.targetWalkZ = 0.15;
      this.autoServeRow = null;
      this.showClickRing(0, 0.15);
      audio.click();
    }
  }

  dropTraySlot(slotIdx: number) {
    if (slotIdx >= 0 && slotIdx < this.trayItems.length) {
      this.trayItems.splice(slotIdx, 1);
      this.syncTrayMeshes();
      audio.click();
      this.emitHud();
    }
  }

  setCrewName(name: string) {
    this.crewName = (name || "MIRAH").trim().slice(0, 12) || "MIRAH";
  }

  isPaActive() {
    return this.paReader !== null;
  }

  /** Which script fits the current flight moment best (earns the Perfect Timing bonus) */
  recommendedPa(): PaPhase {
    if (this.previewMode) return "welcome";
    const prog = 1 - this.timeLeft / this.timeTotal;
    if (this.turbState !== "idle" && !this.paUsed.includes("weather")) return "weather";
    const order: PaPhase[] = prog < 0.22 ? ["welcome", "service", "weather", "approach"]
      : prog < 0.55 ? ["service", "welcome", "weather", "approach"]
      : prog < 0.8 ? ["weather", "service", "approach", "welcome"]
      : ["approach", "weather", "service", "welcome"];
    return order.find((p) => !this.paUsed.includes(p)) || "approach";
  }

  /** Lift the interphone and read a phase script (Web Speech + teleprompter + lip-sync) */
  startPA(phase: PaPhase) {
    if (this.paReader || this.paused) return;
    if (!this.previewMode && this.phase !== "flying") return;
    audio.unlock();
    audio.handset();
    audio.hiLo();
    this.miniGame = null;
    this.serveHeld = false;
    this.clearAutoWalk();
    this.paPhase = phase;
    const script = PA_SCRIPTS[phase];
    const text = script.text(this.toTitle(this.crewName));
    this.paReader = createPaReader(
      text,
      this.appearance.gender === "female",
      () => this.finishPA(),
      () => {
        if (this.paReader && this.paReader.wordIndex !== this.paLastWord) {
          this.paLastWord = this.paReader.wordIndex;
          this.emitPa();
        }
      }
    );
    this.emitPa();
  }

  stopPA(completed: boolean) {
    if (!this.paReader) return;
    if (!completed) {
      this.paReader.stop();
      audio.handset();
    }
    this.paReader = null;
    this.paPhase = null;
    this.emitPa();
    this.emitHud();
  }

  private toTitle(n: string) {
    const s = n.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private finishPA() {
    const phase = this.paPhase;
    if (!phase) return;
    audio.paEnd();
    const script = PA_SCRIPTS[phase];
    const perfect = this.recommendedPa() === phase;
    if (!this.previewMode) {
      this.paUsed.push(phase);
      const mult = perfect ? 1.5 : 1;
      const pts = Math.round(script.points * mult);
      this.flightScore += pts;
      this.satisfaction = clamp(this.satisfaction + script.satisfaction * (perfect ? 1.25 : 1), 0, 100);
      // Cabin stability: calm the air & the passengers
      this.stability = clamp(this.stability + script.stability, 0, 1);
      if (phase === "weather" && this.turbState !== "idle") {
        this.turbIntensity *= 0.35;
        this.turbDuration = Math.min(this.turbDuration, this.turbT + 1.2);
      }
      if (phase === "weather") this.nextTurb = Math.max(this.nextTurb, this.time + 16);
      for (const req of this.requests) {
        if (req && req.state === "pending") {
          req.patience = Math.min(req.patienceMax, req.patience + req.patienceMax * (0.18 + script.stability * 0.2));
        }
      }
      this.addSkillXp("grace", perfect ? 22 : 14);
      this.spawnBurst(0.5, 0.4, perfect ? "#ffd75e" : "#7dffb2", perfect ? 30 : 16);
      this.floaters.push({ x: 0.5, y: 0.4, text: `PA +${pts}`, color: perfect ? "#ffd75e" : "#7dffb2", t: 0, life: 1.3 });
      if (perfect) this.floaters.push({ x: 0.5, y: 0.47, text: "PERFECT TIMING ×1.5", color: "#ffffff", t: 0, life: 1.3 });
      this.haptic([30, 40, 30]);
    } else {
      this.partnerEmote = "wave";
      this.partnerEmoteTimer = 1.35;
    }
    this.stopPA(true);
  }

  private emitPa() {
    this.cb.onPa?.(this.paHud());
  }

  private paHud(): PaHud {
    return {
      active: this.paReader !== null,
      phase: this.paPhase,
      wordIndex: this.paReader ? this.paReader.wordIndex : -1,
      progress: this.paReader ? this.paReader.progress : 0,
      used: [...this.paUsed],
      recommended: this.recommendedPa(),
      crewName: this.toTitle(this.crewName),
    };
  }

  triggerEmote(kind: "salam" | "wave") {
    if (this.paReader) return;
    this.emote = kind;
    this.emoteTimer = 1.35;
    if (kind === "salam") {
      audio.salam();
      this.addSkillXp("grace", 6);
      if (this.previewMode) {
        this.partnerEmote = "wave";
        this.partnerEmoteTimer = 1.35;
      } else {
        if (
          this.incident &&
          this.incident.kind !== "bin" &&
          Math.abs(this.world.rows[this.incident.rowI].z - this.playerZ) <= 2.4
        ) {
          this.completeIncident();
        }
        // Salam calms nearby waiting passengers!
        let calmed = 0;
        this.requests.forEach((req, idx) => {
          if (req && req.state === "pending" && Math.abs(this.world.rows[idx].z - this.playerZ) < 3.6) {
            req.patience = Math.min(req.patienceMax, req.patience + 3.2);
            calmed++;
          }
        });
        if (calmed > 0) {
          this.satisfaction = clamp(this.satisfaction + 2, 0, 100);
          this.floaters.push({ x: 0.5, y: 0.42, text: `SALAM +${calmed * 10}`, color: "#ffd75e", t: 0, life: 1.0 });
        }
      }
    } else {
      audio.click();
    }
  }

  private loadItemNow(idx: number) {
    if (this.trayItems.length >= this.trayMax) {
      this.trayItems.shift();
    }
    this.trayItems.push(idx);
    this.syncTrayMeshes();
    if (ITEMS[idx].station === "oven") this.ovenOpenAmt = 1;
    audio.load();
    this.floaters.push({
      x: 0.5,
      y: 0.62,
      itemIdx: idx,
      text: "+1",
      color: "#ffd75e",
      t: 0,
      life: 0.75,
    });
    this.emitHud();
  }

  private syncTrayMeshes() {
    this.playerRig.setTrayItems(this.trayItems, this.trayMax);
  }

  /* ----------------------- SERVING & SKILL SHOTS ----------------------- */

  private findServableRow(): number | null {
    let bestIdx: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < CABIN_ROWS; i++) {
      const req = this.requests[i];
      if (!req || req.state !== "pending") continue;
      const d = Math.abs(this.world.rows[i].z - this.playerZ);
      if (d <= SERVE_DZ && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private pressServe() {
    if (this.phase !== "flying" || this.previewMode) return;
    if (this.miniGame) {
      if (this.miniGame.type === "needle") this.resolveNeedle();
      return;
    }

    if (this.incident && Math.abs(this.world.rows[this.incident.rowI].z - this.playerZ) <= SERVE_DZ + 0.35) {
      this.completeIncident();
      return;
    }

    const rowIdx = this.findServableRow();
    if (rowIdx === null) {
      // If standing in the galley, pressing E loads the most urgently needed item!
      if (this.playerZ <= GALLEY_LOAD_Z) {
        const needed = this.getNeededItems();
        const pick = needed.find((it) => !this.trayItems.includes(it)) ?? needed[0] ?? 0;
        this.loadItemNow(pick);
      }
      return;
    }

    const req = this.requests[rowIdx]!;
    this.facingSide = req.side;
    const slotIdx = this.trayItems.findIndex((it) => it === req.item);
    if (slotIdx === -1) {
      audio.denied();
      this.floaters.push({
        x: 0.5,
        y: 0.48,
        itemIdx: req.item,
        text: "NEED",
        color: "#ff9f7a",
        t: 0,
        life: 0.95,
      });
      return;
    }

    const def = ITEMS[req.item];
    const carafeBonus = this.career.ownedGear.includes("thermoCarafe") ? 0.045 : 0;
    const pourSkillBonus = xpToLevel(this.skills.pourXp).level * 0.004 + carafeBonus;
    const plateSkillBonus = xpToLevel(this.skills.plateXp).level * 0.004;

    if (def.cat === "quick") {
      const tipped = Math.abs(this.balanceX) > 0.88;
      this.finishServe(rowIdx, tipped ? "weak" : "good", slotIdx);
    } else if (def.cat === "drink") {
      this.serveHeld = true;
      const bandW = clamp(lerp(0.28, 0.13, req.picky) + pourSkillBonus, 0.13, 0.38);
      const center = 0.68;
      this.miniGame = {
        type: "pour",
        fill: 0.04,
        band: [center - bandW / 2, center + bandW / 2],
        item: req.item,
        rowI: rowIdx,
        side: req.side,
      };
      this.emitHud();
    } else {
      const zoneHalf = clamp(lerp(0.36, 0.15, req.picky) + plateSkillBonus, 0.15, 0.42);
      const speed = (1.15 + Math.random() * 0.45) * (this.turbState === "active" ? 1.3 : 1);
      this.miniGame = {
        type: "needle",
        pos: -0.95,
        dir: 1,
        speed,
        zone: zoneHalf,
        item: req.item,
        rowI: rowIdx,
        side: req.side,
      };
      this.emitHud();
    }
  }

  private releaseServe() {
    this.serveHeld = false;
    if (this.miniGame && this.miniGame.type === "pour") {
      this.resolvePour();
    }
  }

  private resolvePour() {
    const mg = this.miniGame;
    if (!mg || mg.type !== "pour") return;
    this.miniGame = null;
    const req = this.requests[mg.rowI];
    if (!req || req.state !== "pending") return;
    const [lo, hi] = mg.band;
    const slotIdx = this.trayItems.findIndex((it) => it === mg.item);
    const f = mg.fill;
    const grade =
      f >= lo && f <= hi ? "perfect" : f >= lo - 0.12 && f <= hi + 0.12 ? "good" : f < lo - 0.12 ? "weak" : "spill";
    this.finishServe(mg.rowI, grade, slotIdx);
  }

  private resolveNeedle() {
    const mg = this.miniGame;
    if (!mg || mg.type !== "needle") return;
    this.miniGame = null;
    const req = this.requests[mg.rowI];
    if (!req || req.state !== "pending") return;
    const a = Math.abs(mg.pos);
    const slotIdx = this.trayItems.findIndex((it) => it === mg.item);
    const grade = a < mg.zone * 0.45 ? "flawless" : a < mg.zone ? "good" : "spill";
    this.finishServe(mg.rowI, grade, slotIdx);
  }

  private streakMult() {
    const rankMul = getRankInfo(this.career).current.scoreMult;
    const base = this.streak >= 8 ? 2.0 : this.streak >= 5 ? 1.6 : this.streak >= 3 ? 1.3 : 1.0;
    return Number((base * rankMul).toFixed(2));
  }

  private addSkillXp(kind: "pour" | "plate" | "grace", amount: number) {
    const prev =
      kind === "pour"
        ? xpToLevel(this.skills.pourXp).level
        : kind === "plate"
          ? xpToLevel(this.skills.plateXp).level
          : xpToLevel(this.skills.graceXp).level;

    if (kind === "pour") this.skills.pourXp += amount;
    else if (kind === "plate") this.skills.plateXp += amount;
    else this.skills.graceXp += amount;
    saveSkills(this.skills);

    const after =
      kind === "pour"
        ? xpToLevel(this.skills.pourXp).level
        : kind === "plate"
          ? xpToLevel(this.skills.plateXp).level
          : xpToLevel(this.skills.graceXp).level;

    if (after > prev) {
      audio.levelUp();
      this.floaters.push({ x: 0.5, y: 0.34, text: `★ LV ${after}`, color: "#ffd75e", t: 0, life: 1.4 });
    }
  }

  private finishServe(
    rowIdx: number,
    grade: "flawless" | "perfect" | "good" | "weak" | "spill",
    slotIdx: number
  ) {
    const req = this.requests[rowIdx];
    const row = this.world.rows[rowIdx];
    if (!req || !row) return;

    if (slotIdx >= 0) {
      this.trayItems.splice(slotIdx, 1);
      this.syncTrayMeshes();
    }

    req.state = grade === "spill" ? "missed" : "served";
    row.bubbleSprite.visible = false;
    this.rowCooldown[rowIdx] = 6 + Math.random() * 6;

    const def = ITEMS[req.item];
    const vipMul = req.vip ? 2 : 1;
    const mult = this.streakMult();
    const pax = (req.side === -1 ? row.left : row.right)[0].pax;
    if (pax) pax.crown.visible = false;

    if (grade !== "spill") {
      if (def.cat === "meal") {
        this.world.setRowMeal(rowIdx, req.side, req.item);
        this.addSkillXp("plate", grade === "flawless" ? 18 : 10);
      } else if (def.cat === "drink") {
        this.addSkillXp("pour", grade === "perfect" ? 18 : 10);
      } else {
        this.addSkillXp("grace", 10);
      }
      if (def.id === "pillow") {
        const sIdx = req.side === -1 ? 0 : 1;
        row.binTarget[sIdx] = 1;
        row.binHold[sIdx] = 3.2;
      }
      if (pax) pax.setMood("happy");
    } else if (pax) {
      pax.setMood("worried");
    }

    if (grade === "flawless" || grade === "perfect") {
      const pts = Math.round((grade === "flawless" ? 175 : 155) * vipMul * mult);
      this.flightScore += pts;
      this.streak++;
      this.perfects++;
      this.served++;
      this.satisfaction = clamp(this.satisfaction + (req.vip ? 10 : 7), 0, 100);
      this.addSkillXp("grace", 8);
      audio.perfect();
      this.haptic([22]);
      this.spawnBurst(0.5, 0.48, req.vip ? "#ffd75e" : "#52ffa8", 24);
      this.floaters.push({
        x: 0.5,
        y: 0.44,
        itemIdx: req.item,
        text: `★ +${pts}`,
        color: req.vip ? "#ffd75e" : "#52ffa8",
        t: 0,
        life: 1.15,
      });
    } else if (grade === "good") {
      const pts = Math.round(85 * vipMul * mult);
      this.flightScore += pts;
      this.streak++;
      this.served++;
      this.satisfaction = clamp(this.satisfaction + 4, 0, 100);
      audio.good();
      this.haptic([12]);
      this.spawnBurst(0.5, 0.48, "#7fd4ff", 12);
      this.floaters.push({ x: 0.5, y: 0.44, itemIdx: req.item, text: `+${pts}`, color: "#9fd8ff", t: 0, life: 0.95 });
    } else if (grade === "weak") {
      const pts = Math.round(30 * vipMul);
      this.flightScore += pts;
      this.served++;
      audio.good();
      this.floaters.push({ x: 0.5, y: 0.44, text: `+${pts}`, color: "#cfd9ec", t: 0, life: 0.85 });
    } else {
      this.missed++;
      const dmg = req.vip ? 14 : 10;
      this.satisfaction = clamp(this.satisfaction - dmg, 0, 100);
      this.streak = 0;
      audio.spill();
      this.haptic([85]);
      this.spawnBurst(0.5, 0.52, def.color, 18);
      this.floaters.push({ x: 0.5, y: 0.44, itemIdx: req.item, text: `-${dmg}%`, color: "#ff6b6b", t: 0, life: 1.1 });
    }

    this.maxStreak = Math.max(this.maxStreak, this.streak);
    if (this.cfg.mode === "match" && grade !== "spill") {
      const skill = 0.38 + this.flightIndex * 0.05;
      if (Math.random() < skill) this.opponentScore += Math.round(135 * vipMul);
      else if (Math.random() < 0.45) this.opponentScore += Math.round(70 * vipMul);
    }
    this.emitHud();
  }

  /* ----------------------- MAIN LOOP ----------------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const tick = (now: number) => {
      if (!this.running || this.destroyed) return;
      const raw = (now - this.lastT) / 1000;
      const dt = Math.min(0.033, raw);
      this.wallDt = Math.min(0.5, raw);
      this.lastT = now;
      if (!this.paused) {
        this.update(dt);
      }
      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.emitPa();
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.paReader?.setPaused(p);
    if (!p) this.lastT = performance.now();
  }

  resize() {
    const w = this.wrap.clientWidth || window.innerWidth;
    const h = this.wrap.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();

    this.fxCanvas.width = Math.round(w * dpr);
    this.fxCanvas.height = Math.round(h * dpr);
    this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    if (this.paReader) this.paReader.stop();
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.detachFns.forEach((fn) => fn());
    this.renderer.dispose();
    if (this.glCanvas.parentElement) this.glCanvas.parentElement.removeChild(this.glCanvas);
    if (this.fxCanvas.parentElement) this.fxCanvas.parentElement.removeChild(this.fxCanvas);
  }

  /* ----------------------- UPDATE SIMULATION ----------------------- */

  private update(dt: number) {
    this.time += dt;

    if (this.emoteTimer > 0) {
      this.emoteTimer = Math.max(0, this.emoteTimer - dt);
      if (this.emoteTimer === 0) this.emote = "none";
    }
    if (this.partnerEmoteTimer > 0) {
      this.partnerEmoteTimer = Math.max(0, this.partnerEmoteTimer - dt);
      if (this.partnerEmoteTimer === 0) this.partnerEmote = "none";
    }

    this.ovenOpenAmt = Math.max(0, this.ovenOpenAmt - dt * 0.85);
    this.world.ovenDoor.rotation.x = this.ovenOpenAmt * 1.15;

    // PA readout
    if (this.paReader) {
      // Wall-clock so the teleprompter/lip-sync stay locked to real speech even if frames drop
      this.paReader.update(this.wallDt);
      this.paBlend = Math.min(1, this.paBlend + this.wallDt * 2.6);
      // Turn to face the cabin camera while on the interphone
      const dx = this.camPos.x - this.playerX;
      const dz = this.camPos.z - this.playerZ;
      let desired = Math.atan2(dx, dz);
      let dyaw = desired - this.playerYaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      this.playerYaw += dyaw * Math.min(1, this.wallDt * 5);
      this.paEmitAcc += this.wallDt;
      if (this.paEmitAcc > 0.1) {
        this.paEmitAcc = 0;
        this.emitPa();
      }
    } else {
      this.paBlend = Math.max(0, this.paBlend - this.wallDt * 3.2);
    }

    if (this.previewMode) {
      // Gentle cruising flight bank over Malaysian islands in Live Preview
      this.rollRad = Math.sin(this.time * 0.45) * 0.032;
      this.pitchRad = 0.025 + Math.sin(this.time * 0.3) * 0.01;
      this.world.updateEnvironment(dt, this.time, 1.0, this.rollRad, this.pitchRad);
      this.updatePreviewCharacters(dt);
      this.updateCamera(dt);
      this.updateFx(dt);
      return;
    }

    if (this.phase === "flying") {
      this.timeLeft -= dt;
      if (this.paReader) {
        // Crew is on the interphone: cabin calms, time still flows at half pressure
        this.walkSpeedNorm = lerp(this.walkSpeedNorm, 0, dt * 8);
        this.updateBalance(dt * 0.5);
        this.updateTurbulence(dt);
        this.updateRequests(dt * 0.45);
        this.updatePartner(dt);
      } else {
        this.updateMovement(dt);
        this.updateBalance(dt);
        this.updateTurbulence(dt);
        this.updateMiniGame(dt);
        this.updateRequests(dt);
        this.updatePartner(dt);
      }
      this.satisfaction = clamp(this.satisfaction + dt * 0.3, 0, 100);

      if (this.timeLeft <= 0) {
        this.phase = "landing";
        this.landT = 0;
        audio.chime();
      }
      if (this.satisfaction <= 0 && !this.failed) {
        this.failed = true;
        this.phase = "landing";
        this.landT = 0;
        audio.lose();
      }
    } else if (this.phase === "landing") {
      this.landT += dt;
      this.walkSpeedNorm = lerp(this.walkSpeedNorm, 0, dt * 4);
      if (this.landT > 1.4) {
        this.phase = "done";
        this.finishFlight();
      }
    }

    this.world.updateEnvironment(dt, this.time, 1.0, this.rollRad, this.pitchRad);
    this.syncCharacters();
    this.updateCamera(dt);
    this.updateFx(dt);

    this.hudTimer -= dt;
    if (this.miniGame || this.hudTimer <= 0) {
      this.hudTimer = 0.07;
      this.emitHud();
    }
  }

  private updatePreviewCharacters(_dt: number) {
    this.selectionHalo.visible = true;
    this.selectionHalo.position.set(this.playerX, 0.016, this.playerZ);
    const pulse = 1 + Math.sin(this.time * 3.5) * 0.06;
    this.selectionHalo.scale.set(pulse, pulse, 1);

    this.world.galleyRing.visible = false;
    this.world.serveHighlight.visible = false;

    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.playerRig.animate({
      t: this.time,
      speed: 0,
      carrying: true,
      balanceX: Math.sin(this.time * 1.4) * 0.08,
      servingSide: 0,
      pouring: false,
      emote: this.emote,
      emoteT: this.emoteTimer / 1.35,
      pa: {
        active: this.paReader !== null,
        mouth: this.paReader ? this.paReader.mouth : 0,
        pulse: this.paReader ? this.paReader.pulse : 0,
        blend: this.paBlend,
      },
    });

    this.partnerRig.root.position.set(this.partnerX, 0, this.partnerZ);
    this.partnerRig.root.rotation.y = this.partnerYaw;
    this.partnerRig.animate({
      t: this.time + 1.2,
      speed: 0,
      carrying: true,
      balanceX: Math.cos(this.time * 1.2) * 0.06,
      servingSide: 0,
      pouring: false,
      emote: this.partnerEmote,
      emoteT: this.partnerEmoteTimer / 1.35,
    });
  }

  private updateMovement(dt: number) {
    this.selectionHalo.visible = false;

    const keyAxis = (this.keyFwd ? 1 : 0) - (this.keyBack ? 1 : 0);
    const manualWalk = Math.abs(keyAxis) > 0 ? keyAxis : this.joyWalk;
    let dzMove = 0;

    if (Math.abs(manualWalk) > 0.12) {
      dzMove = manualWalk * WALK_SPEED;
      this.facingSide = 0;
    } else if (this.targetWalkZ !== null) {
      const diff = this.targetWalkZ - this.playerZ;
      if (Math.abs(diff) < 0.08) {
        this.playerZ = this.targetWalkZ;
        this.targetWalkZ = null;
        // Execute queued galley items if arrived at galley!
        if (this.playerZ <= GALLEY_LOAD_Z && this.queuedGalleyLoad.length > 0) {
          while (this.queuedGalleyLoad.length > 0) {
            const nextIt = this.queuedGalleyLoad.shift()!;
            this.loadItemNow(nextIt);
          }
        }
        // Auto-initiate serve if player clicked directly on a calling passenger!
        if (this.autoServeRow !== null) {
          const rIdx = this.autoServeRow;
          this.autoServeRow = null;
          const req = this.requests[rIdx];
          if (req && req.state === "pending") {
            this.facingSide = req.side;
            this.pressServe();
          }
        }
      } else {
        dzMove = Math.sign(diff) * WALK_SPEED;
      }
    }

    const maxZ = ROW_Z0 + (CABIN_ROWS - 1) * ROW_PITCH + 0.65;
    this.playerZ = clamp(this.playerZ + dzMove * dt, -0.35, maxZ);

    // Smooth yaw turn toward travel direction (or toward seated passenger when leaning/serving!)
    const laneKey = (this.keyRight ? 1 : 0) - (this.keyLeft ? 1 : 0);
    const laneAxis = Math.abs(laneKey) > 0 ? laneKey : this.joyLane;
    if (Math.abs(laneAxis) > 0.25 && Math.abs(dzMove) < 0.2) {
      // Relative to camera forward (+Z): negative X = port (+1/-1)
      this.facingSide = laneAxis > 0 ? -1 : 1;
    }

    let desiredYaw = this.playerYaw;
    if (Math.abs(dzMove) > 0.15) {
      desiredYaw = dzMove > 0 ? 0 : Math.PI;
    } else if (this.facingSide !== 0) {
      desiredYaw = this.facingSide === -1 ? -Math.PI * 0.45 : Math.PI * 0.45;
    }

    let dyaw = desiredYaw - this.playerYaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.playerYaw += dyaw * Math.min(1, dt * 9);

    const targetX = this.facingSide * 0.14;
    this.playerX = lerp(this.playerX, targetX, Math.min(1, dt * 8));

    const spd = Math.min(1, Math.abs(dzMove) / WALK_SPEED);
    this.walkSpeedNorm = lerp(this.walkSpeedNorm, spd, Math.min(1, dt * 10));
    if (this.walkSpeedNorm > 0.25) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.32;
        audio.footstep();
      }
    }

    // Highlight galley floor ring & active servable row
    this.world.galleyRing.visible = true;
    const ringPulse = 1 + Math.sin(this.time * 4) * 0.08;
    this.world.galleyRing.scale.set(ringPulse, ringPulse, 1);

    const servableIdx = this.findServableRow();
    if (servableIdx !== null) {
      const r = this.world.rows[servableIdx];
      const req = this.requests[servableIdx]!;
      this.world.serveHighlight.visible = true;
      this.world.serveHighlight.position.set(req.side * 0.2, 0.013, r.z);
      (this.world.serveHighlight.material as THREE.MeshBasicMaterial).opacity = 0.72;
    } else {
      this.world.serveHighlight.visible = false;
    }
  }

  private syncCharacters() {
    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.playerRig.animate({
      t: this.time,
      speed: this.walkSpeedNorm,
      carrying: this.trayItems.length > 0,
      balanceX: this.balanceX,
      servingSide: this.miniGame ? 0 : 0,
      pouring: this.miniGame !== null,
      emote: this.emote,
      emoteT: this.emoteTimer / 1.35,
      pa: {
        active: this.paReader !== null,
        mouth: this.paReader ? this.paReader.mouth : 0,
        pulse: this.paReader ? this.paReader.pulse : 0,
        blend: this.paBlend,
      },
    });

    this.partnerRig.root.position.set(this.partnerX, 0, this.partnerZ);
    this.partnerRig.root.rotation.y = this.partnerYaw;
    this.partnerRig.animate({
      t: this.time + 0.9,
      speed: this.partnerSpeedNorm,
      carrying: this.cfg.mode === "match",
      balanceX: Math.sin(this.time * 2) * 0.1,
      servingSide: 0,
      pouring: false,
      emote: this.partnerEmote,
      emoteT: this.partnerEmoteTimer / 1.35,
    });
  }

  private updatePartner(dt: number) {
    if (this.cfg.mode !== "match") {
      // Co-crew tends the forward galley gracefully
      this.partnerX = -0.85;
      this.partnerZ = GALLEY_Z + 0.95;
      this.partnerYaw = Math.sin(this.time * 0.7) * 0.4;
      this.partnerSpeedNorm = 0;
      return;
    }
    let goalZ = 4.0;
    let bestD = Infinity;
    for (let i = 0; i < CABIN_ROWS; i++) {
      const req = this.requests[i];
      if (req && req.state === "pending" && req.contested) {
        const d = Math.abs(this.world.rows[i].z - this.partnerZ);
        if (d < bestD) {
          bestD = d;
          goalZ = this.world.rows[i].z;
        }
      }
    }
    const diff = goalZ - this.partnerZ;
    const step = Math.abs(diff) > 0.2 ? Math.sign(diff) * 1.75 : 0;
    this.partnerZ += step * dt;
    this.partnerX = 0.14;
    if (Math.abs(step) > 0.1) this.partnerYaw = step > 0 ? 0 : Math.PI;
    this.partnerSpeedNorm = lerp(this.partnerSpeedNorm, Math.abs(step) > 0.1 ? 0.7 : 0, dt * 6);
  }

  private updateBalance(dt: number) {
    const count = this.trayItems.length;
    const turbAmp = this.turbState === "active" ? this.turbIntensity : this.turbState === "warn" ? 0.16 : 0.04;
    const wave = Math.sin(this.time * 3.1) * 0.5 + Math.sin(this.time * 6.7 + 1.3) * 0.35;
    const loadWobble = count >= 2 ? 0.055 * count * this.walkSpeedNorm : 0;
    const target = wave * turbAmp * 0.85 + loadWobble * Math.sin(this.time * 4.2);

    const gearDamp = this.career.ownedGear.includes("gripMat") ? 0.75 : 1.0;
    const graceDamp = (1 - Math.min(0.35, xpToLevel(this.skills.graceXp).level * 0.015)) * gearDamp;
    const corr = this.corrImpulse + this.tiltValue * 0.8;
    this.balanceVel += (target * graceDamp - this.balanceX) * 9.5 * dt;
    this.balanceVel += corr * 6.5 * dt;
    this.balanceVel *= Math.pow(0.0012, dt);
    this.balanceX = clamp(this.balanceX + this.balanceVel * dt, -1.25, 1.25);
    this.corrImpulse *= Math.pow(0.0005, dt);

    if (Math.abs(this.balanceX) > 0.92 && (count > 0 || this.miniGame)) {
      this.tipTimer += dt;
      if (this.tipTimer > 0.6) {
        this.tipTimer = 0;
        this.triggerTip();
      }
    } else {
      this.tipTimer = 0;
    }
  }

  private triggerTip() {
    audio.tip();
    this.safety = clamp(this.safety - 6, 0, 100);
    this.haptic([65, 40, 65]);
    if (this.miniGame) {
      const rIdx = this.miniGame.rowI;
      const slot = this.trayItems.findIndex((x) => x === this.miniGame!.item);
      this.miniGame = null;
      this.finishServe(rIdx, "spill", slot);
    } else if (this.trayItems.length > 0) {
      const removed = this.trayItems.pop()!;
      this.syncTrayMeshes();
      this.spawnBurst(0.5, 0.72, ITEMS[removed].color, 14);
      this.floaters.push({ x: 0.5, y: 0.65, itemIdx: removed, text: "TIP!", color: "#ff8c66", t: 0, life: 0.9 });
    }
    this.balanceVel *= -0.35;
  }

  private spawnIncident(kind?: CabinIncident["kind"]) {
    if (this.incident || this.timeLeft < 10) return;
    const rowI = 1 + Math.floor(Math.random() * (CABIN_ROWS - 3));
    const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
    const chosenKind: CabinIncident["kind"] =
      kind ?? (Math.random() < 0.45 ? "anxious" : Math.random() < 0.55 ? "medical" : "bin");
    const row = this.world.rows[rowI];
    if (chosenKind === "bin") {
      const sIdx = side === -1 ? 0 : 1;
      row.binTarget[sIdx] = 1;
      row.binHold[sIdx] = 18;
    } else {
      const pax = (side === -1 ? row.left : row.right)[0]?.pax;
      if (pax) pax.setMood("worried");
    }
    const maxTimer = chosenKind === "bin" ? 14 : 18;
    this.incident = {
      kind: chosenKind,
      rowI,
      side,
      timer: maxTimer,
      maxTimer,
      label:
        chosenKind === "bin"
          ? `Row ${rowI + 1} Open Bin`
          : chosenKind === "medical"
            ? `Row ${rowI + 1} Guest Assist`
            : `Row ${rowI + 1} Anxious Flyer`,
    };
    audio.tick();
  }

  private updateTurbulence(dt: number) {
    // Tick active cabin incident timer
    if (this.incident) {
      this.incident.timer -= dt;
      if (this.incident.timer <= 0) {
        const expired = this.incident;
        this.incident = null;
        if (expired.kind === "bin") {
          this.world.rows[expired.rowI].binTarget[expired.side === -1 ? 0 : 1] = 0;
        }
        this.safety = clamp(this.safety - 12, 0, 100);
        this.satisfaction = clamp(this.satisfaction - 6, 0, 100);
        this.floaters.push({ x: 0.5, y: 0.42, text: "SAFETY -12%", color: "#ff6b6b", t: 0, life: 1.0 });
      }
    } else if (this.sector.incidents > 0 && this.time > this.nextIncidentAt && this.timeLeft > 12) {
      this.spawnIncident();
      this.nextIncidentAt = this.time + Math.max(16, this.timeTotal / (this.sector.incidents + 0.6));
    }

    this.turbT += dt;
    if (this.turbState === "idle") {
      this.stability = Math.min(1, this.stability + dt * 0.25);
      this.rollRad = lerp(this.rollRad, Math.sin(this.time * 0.4) * 0.018, dt * 2);
      if (this.time > this.nextTurb && this.timeLeft > 9) {
        this.turbState = "warn";
        this.turbT = 0;
        if (!this.incident && Math.random() < 0.65) this.spawnIncident("bin");
        audio.warn();
        this.haptic([55, 70, 55]);
      }
    } else if (this.turbState === "warn") {
      if (this.turbT > 2.8) {
        this.turbState = "active";
        this.turbT = 0;
        this.turbIntensity = (0.5 + Math.random() * 0.35) * clamp(this.sector.turbulenceFreq, 0.7, 1.35);
        this.turbDuration = 3.5 + Math.random() * 1.8;
        if (this.incident && this.incident.kind === "bin") {
          // Entering active turbulence with an unlatched overhead bin hurts Safety Compliance!
          this.safety = clamp(this.safety - 9, 0, 100);
          this.floaters.push({ x: 0.5, y: 0.38, text: "UNLATCHED BIN -9%", color: "#ff9f5a", t: 0, life: 1.1 });
        }
        audio.rumble(this.turbDuration);
      }
    } else {
      const i = this.turbIntensity * Math.min(1, this.turbT * 3) * Math.min(1, (this.turbDuration - this.turbT) * 2);
      this.stability = clamp(1 - i, 0.08, 1);
      this.rollRad = Math.sin(this.time * 2.6) * 0.055 * i + Math.sin(this.time * 6.3) * 0.02 * i;
      this.pitchRad = 0.025 + Math.sin(this.time * 3.9) * 0.018 * i;
      if (this.time - this.lastHaptic > 0.26) {
        this.lastHaptic = this.time;
        this.haptic([Math.round(16 + i * 26)]);
      }
      if (this.turbT > this.turbDuration) {
        this.turbState = "idle";
        this.turbT = 0;
        this.nextTurb = this.time + (13 / this.sector.turbulenceFreq) + Math.random() * 7;
        this.addSkillXp("grace", 6);
      }
    }
  }

  private updateMiniGame(dt: number) {
    const mg = this.miniGame;
    if (!mg) return;
    const req = this.requests[mg.rowI];
    if (!req || req.state !== "pending") {
      this.miniGame = null;
      this.serveHeld = false;
      return;
    }
    if (mg.type === "pour") {
      if (this.serveHeld) {
        const jitter = this.turbState === "active" ? (Math.random() - 0.5) * 0.35 * this.turbIntensity : 0;
        mg.fill += (0.64 + jitter) * dt;
        if (mg.fill >= 1.06) {
          const slot = this.trayItems.findIndex((x) => x === mg.item);
          this.miniGame = null;
          this.serveHeld = false;
          this.finishServe(mg.rowI, "spill", slot);
        }
      }
    } else {
      mg.pos += mg.dir * mg.speed * dt;
      if (mg.pos >= 1) {
        mg.pos = 1;
        mg.dir = -1;
      } else if (mg.pos <= -1) {
        mg.pos = -1;
        mg.dir = 1;
      }
    }
  }

  private spawnRequest(rowIdx: number, forceItem?: number) {
    const row = this.world.rows[rowIdx];
    const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
    const seat = (side === -1 ? row.left : row.right)[0];
    if (!seat.pax) {
      // Try opposite aisle seat if this one happened to be empty
      const other = (side === -1 ? row.right : row.left)[0];
      if (!other.pax) return;
      return this.spawnRequestSide(rowIdx, (side * -1) as -1 | 1, forceItem);
    }
    this.spawnRequestSide(rowIdx, side, forceItem);
  }

  private spawnRequestSide(rowIdx: number, side: -1 | 1, forceItem?: number) {
    const row = this.world.rows[rowIdx];
    const seat = (side === -1 ? row.left : row.right)[0];
    if (!seat.pax) return;

    const baseVip = this.cfg.mode === "first" ? 0.45 : this.cfg.mode === "match" ? 0.22 : 0.16;
    const vip = Math.random() < clamp(baseVip + this.sector.vipBonusRate * 0.5, 0.1, 0.7);
    const business = !vip && Math.random() < 0.28;
    const prog = 1 - this.timeLeft / this.timeTotal;
    const picky = clamp((this.cfg.mode === "first" ? 0.38 : 0.18) + prog * 0.22 + (1 - this.stability) * 0.25, 0, 0.92);
    const pool = vip ? [3, 4, 5] : [0, 1, 2, 4, 5, 6, 7];
    const item = forceItem !== undefined ? forceItem : pool[Math.floor(Math.random() * pool.length)];
    const rankPatience = getRankInfo(this.career).current.patienceBonus;
    const aromaMul = this.career.ownedGear.includes("aromaDiffuser") ? 1.15 : 1.0;
    const patienceMax = clamp(((vip ? 20 : business ? 19 : 25) + rankPatience - prog * 3.5) * aromaMul, 12, 32);

    seat.pax.crown.visible = vip;
    seat.pax.setMood("happy");
    row.bubbleSprite.userData.interact = { kind: "row", row: rowIdx, side };

    this.requests[rowIdx] = {
      side,
      item,
      vip,
      business,
      picky,
      patienceMax,
      patience: patienceMax,
      indecisive: !vip && Math.random() < 0.16,
      indecisiveDone: false,
      contested: this.cfg.mode === "match" && Math.random() < 0.32,
      rivalTimer: patienceMax * (0.52 + Math.random() * 0.32),
      state: "pending",
    };
  }

  private updateRequests(dt: number) {
    const maxActive = this.cfg.mode === "first" ? 3 : this.cfg.mode === "match" ? 5 : 4;
    let activeCount = 0;
    for (const r of this.requests) if (r && r.state === "pending") activeCount++;

    for (let i = 0; i < CABIN_ROWS; i++) {
      const row = this.world.rows[i];
      const req = this.requests[i];

      // Relax non-calling passengers' arms
      [row.left[0], row.right[0]].forEach((st, sIdx) => {
        const sSide = sIdx === 0 ? -1 : 1;
        if (st.pax && (!req || req.state !== "pending" || req.side !== sSide)) {
          st.pax.raiseArm.rotation.x = lerp(st.pax.raiseArm.rotation.x, -0.45, Math.min(1, dt * 6));
        }
      });

      if (!req || req.state !== "pending") {
        row.bubbleSprite.visible = false;
        this.rowCooldown[i] -= dt;
        if (this.rowCooldown[i] <= 0 && activeCount < maxActive && this.timeLeft > 6) {
          this.spawnRequest(i);
          activeCount++;
          this.rowCooldown[i] = 12;
        }
        continue;
      }

      // Active passenger raises hand & waves gently!
      const pax = (req.side === -1 ? row.left : row.right)[0].pax;
      if (pax) {
        const wave = -2.35 + Math.sin(this.time * 5.5 + i) * 0.14;
        pax.raiseArm.rotation.x = lerp(pax.raiseArm.rotation.x, wave, Math.min(1, dt * 7));
        pax.setMood(req.patience / req.patienceMax < 0.32 ? "worried" : "happy");
      }

      const turbMul = this.turbState === "active" ? 1.25 : 1;
      req.patience -= dt * turbMul * (req.business ? 1.18 : 1);

      if (req.indecisive && !req.indecisiveDone && req.patience < req.patienceMax * 0.58) {
        req.indecisiveDone = true;
        req.item = (req.item + 2) % 7;
        req.patience = Math.min(req.patienceMax, req.patience + 4);
        audio.tick();
      }

      if (req.contested) {
        req.rivalTimer -= dt;
        if (req.rivalTimer <= 0) {
          req.state = "stolen";
          row.bubbleSprite.visible = false;
          this.rowCooldown[i] = 8;
          this.opponentScore += Math.round(120 * (req.vip ? 2 : 1));
          audio.steal();
          if (pax) pax.crown.visible = false;
          if (this.miniGame && this.miniGame.rowI === i) this.miniGame = null;
          continue;
        }
      }

      if (req.patience <= 0) {
        req.state = "missed";
        row.bubbleSprite.visible = false;
        this.rowCooldown[i] = 8;
        this.missed++;
        const dmg = req.vip ? 12 : 8;
        this.satisfaction = clamp(this.satisfaction - dmg, 0, 100);
        this.streak = 0;
        if (pax) {
          pax.crown.visible = false;
          pax.setMood("worried");
        }
        audio.spill();
        if (this.miniGame && this.miniGame.rowI === i) this.miniGame = null;
        continue;
      }

      // Update floating 3D call bubble sprite!
      row.bubbleSprite.visible = true;
      row.bubbleSprite.position.set(req.side * 0.66, 1.56 + Math.sin(this.time * 3.2 + i) * 0.04, row.z);
      paintBubbleCanvas(
        row.bubbleCanvas,
        req.item,
        clamp(req.patience / req.patienceMax, 0, 1),
        req.vip,
        req.contested ? clamp(req.rivalTimer / req.patienceMax, 0, 1) : -1
      );
      row.bubbleTex.needsUpdate = true;
    }
  }

  /* ----------------------- SMOOTH CAMERA RIG ----------------------- */

  private updateCamera(dt: number) {
    let desiredLook = new THREE.Vector3();
    let desiredPos = new THREE.Vector3();

    if (this.paReader || this.paBlend > 0.05) {
      // PA close-up: crew faces the cabin camera with handset & binder, cabin rows as backdrop
      this.world.setCutaway(this.previewMode || this.camPreset !== "pov");
      const side = this.appearance.gender === "female" ? 1 : -1;
      desiredLook.set(this.playerX + 0.02 * side, 1.31, this.playerZ);
      desiredPos.set(this.playerX + 0.38 * side, 1.5, this.playerZ + 1.42);
      this.camera.fov = lerp(this.camera.fov, 36, Math.min(1, dt * 5));
      this.camera.updateProjectionMatrix();
    } else if (this.previewMode) {
      // Showcase BOTH the Pretty Malay Lady & Handsome Malay Guy in Kebaya inside the sunlit cutaway cabin with Galley, Seats, Wings & Islands!
      this.world.setCutaway(true);
      desiredLook.set(0, 1.15, 2.65);
      const horiz = Math.cos(this.orbitPitch) * this.orbitDist;
      desiredPos.set(
        desiredLook.x + Math.sin(this.orbitYaw) * horiz,
        desiredLook.y + Math.sin(this.orbitPitch) * this.orbitDist,
        desiredLook.z + Math.cos(this.orbitYaw) * horiz
      );
      this.camera.fov = lerp(this.camera.fov, 45, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    } else if (this.camPreset === "pov") {
      this.world.setCutaway(false);
      const eyeY = this.appearance.gender === "female" ? 1.53 : 1.62;
      const fx = Math.sin(this.playerYaw);
      const fz = Math.cos(this.playerYaw);
      desiredPos.set(this.playerX, eyeY, this.playerZ);
      desiredLook.set(this.playerX + fx * 3.5, eyeY - 0.16, this.playerZ + fz * 3.5);
      this.camera.fov = lerp(this.camera.fov, 58, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    } else if (this.camPreset === "cutaway") {
      // Pendekar.io isometric cutaway view centered directly on our 3D Kebaya Crew!
      this.world.setCutaway(true);
      desiredLook.set(this.playerX * 0.4, 1.02, this.playerZ + 0.65);
      const horiz = Math.cos(this.orbitPitch) * this.orbitDist;
      desiredPos.set(
        desiredLook.x + Math.sin(this.orbitYaw) * horiz,
        desiredLook.y + Math.sin(this.orbitPitch) * this.orbitDist,
        desiredLook.z - Math.cos(this.orbitYaw) * horiz
      );
      this.camera.fov = lerp(this.camera.fov, 46, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    } else if (this.camPreset === "wing") {
      // Live aviation environment view: wing, turbofan engine, clouds, islands + cutaway cabin!
      this.world.setCutaway(true);
      desiredLook.set(0, 0.9, 6.5);
      const horiz = Math.cos(this.orbitPitch) * this.orbitDist;
      desiredPos.set(
        desiredLook.x + Math.sin(this.orbitYaw) * horiz,
        desiredLook.y + Math.sin(this.orbitPitch) * this.orbitDist,
        desiredLook.z - Math.cos(this.orbitYaw) * horiz
      );
      this.camera.fov = lerp(this.camera.fov, 48, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    } else {
      // "follow": Lush 3rd-person aisle camera showing full 3D Kebaya Crew + Cabin Rows + Windows!
      this.world.setCutaway(false);
      desiredLook.set(this.playerX * 0.4, 1.18, this.playerZ + 2.1);
      desiredPos.set(
        clamp(Math.sin(this.orbitYaw) * 0.85 + this.playerX * 0.35, -0.82, 0.82),
        clamp(1.72 + (this.orbitPitch - 0.24) * 0.65, 1.35, 2.08),
        this.playerZ - clamp(this.orbitDist, 1.45, 3.1)
      );
      this.camera.fov = lerp(this.camera.fov, 52, Math.min(1, dt * 6));
      this.camera.updateProjectionMatrix();
    }

    const k = Math.min(1, (this.paReader ? Math.max(dt, this.wallDt) : dt) * 7.5);
    this.camPos.lerp(desiredPos, k);
    this.camLook.lerp(desiredLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /* ----------------------- FINISH FLIGHT & HUD ----------------------- */

  private getNeededItems(): number[] {
    const out: number[] = [];
    for (const r of this.requests) {
      if (r && r.state === "pending" && !out.includes(r.item)) out.push(r.item);
    }
    return out;
  }

  private finishFlight() {
    const win =
      !this.failed &&
      (this.cfg.mode === "match" ? this.flightScore > this.opponentScore : this.flightScore >= this.parScore);
    if (win) this.shiftsWon++;
    else this.shiftsLost++;
    this.totalScore += this.flightScore;
    const need = Math.ceil(this.cfg.flights / 2);
    const matchOver = this.shiftsWon >= need || this.shiftsLost >= need || this.flightIndex >= this.cfg.flights;
    if (win) audio.fanfare();
    else if (!this.failed) audio.lose();
    this.emitHud();
    this.cb.onFlightEnd({
      flightIndex: this.flightIndex,
      flightsTotal: this.cfg.flights,
      flightScore: this.flightScore,
      totalScore: this.totalScore,
      perfects: this.perfects,
      served: this.served,
      missed: this.missed,
      maxStreak: this.maxStreak,
      satisfaction: Math.round(this.satisfaction),
      win,
      failed: this.failed,
      opponentScore: this.opponentScore,
      parScore: this.parScore,
      shiftsWon: this.shiftsWon,
      shiftsLost: this.shiftsLost,
      matchOver,
      matchWon: this.shiftsWon > this.shiftsLost,
      safety: Math.round(this.safety),
      incidentsResolved: this.incidentsResolved,
      paCount: this.paUsed.length,
      sectorId: this.sector.id,
    });
  }

  private emitHud() {
    if (this.previewMode) return;
    const pour = xpToLevel(this.skills.pourXp);
    const plate = xpToLevel(this.skills.plateXp);
    const grace = xpToLevel(this.skills.graceXp);
    const servableRow = this.findServableRow();
    const canServeItem = servableRow !== null ? this.requests[servableRow]!.item : null;

    this.cb.onHud({
      flightScore: this.flightScore,
      totalScore: this.totalScore + this.flightScore,
      streak: this.streak,
      mult: this.streakMult(),
      satisfaction: Math.round(this.satisfaction),
      flightIndex: this.flightIndex,
      flightsTotal: this.cfg.flights,
      shiftsWon: this.shiftsWon,
      shiftsLost: this.shiftsLost,
      timeLeft: Math.max(0, this.timeLeft),
      timeTotal: this.timeTotal,
      opponentScore: this.opponentScore,
      parScore: this.parScore,
      perfects: this.perfects,
      served: this.served,
      turbulence: this.turbState,
      stability: this.stability,
      mode: this.cfg.mode,
      inGalley: this.playerZ <= GALLEY_LOAD_Z,
      trayItems: [...this.trayItems, ...Array(Math.max(0, this.trayMax - this.trayItems.length)).fill(null)],
      trayMax: this.trayMax,
      neededItems: this.getNeededItems(),
      balanceX: this.balanceX,
      camPreset: this.camPreset,
      skills: {
        pourLv: pour.level,
        pourProg: pour.progress,
        plateLv: plate.level,
        plateProg: plate.progress,
        graceLv: grace.level,
        graceProg: grace.progress,
      },
      miniGame: this.miniGame ? { ...this.miniGame } : null,
      canServeItem,
      pa: this.paHud(),
      safety: Math.round(this.safety),
      sectorCode: this.sector.route,
      incident: this.incident ? { ...this.incident } : null,
    });
  }

  private haptic(p: number[]) {
    if (!this.cfg.haptics) return;
    try {
      navigator.vibrate?.(p);
    } catch {
      /* ignore */
    }
  }

  /* ----------------------- RENDER + JUICY 2D FX ----------------------- */

  private spawnBurst(nx: number, ny: number, color: string, n: number) {
    const w = this.wrap.clientWidth;
    const h = this.wrap.clientHeight;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 170;
      this.particles.push({
        x: nx * w,
        y: ny * h,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        g: 420,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.4,
        size: 3 + Math.random() * 3.5,
        color,
      });
    }
  }

  spawnConfetti() {
    const w = this.wrap.clientWidth;
    const colors = ["#ffd75e", "#52ffa8", "#7fd4ff", "#ff8c94", "#d580ff"];
    for (let i = 0; i < 75; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: -15 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 90,
        vy: 70 + Math.random() * 130,
        g: 170,
        life: 0,
        maxLife: 2 + Math.random() * 1.4,
        size: 4 + Math.random() * 3.5,
        color: colors[i % colors.length],
      });
    }
  }

  private updateFx(dt: number) {
    if (this.clickRipple > 0) {
      this.clickRipple = Math.max(0, this.clickRipple - dt * 1.8);
      const s = 0.6 + (1 - this.clickRipple) * 0.9;
      this.world.clickRing.scale.set(s, s, 1);
      (this.world.clickRing.material as THREE.MeshBasicMaterial).opacity = this.clickRipple * 0.85;
    } else {
      (this.world.clickRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.floaters = this.floaters.filter((f) => (f.t += dt) < f.life);
  }

  private render() {
    this.renderer.render(this.world.scene, this.camera);

    const ctx = this.fxCtx;
    const w = this.wrap.clientWidth;
    const h = this.wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Crisp Particles
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Minimalist Crisp Vector Icon + Number Floaters
    for (const fl of this.floaters) {
      const prog = fl.t / fl.life;
      const alpha = prog < 0.15 ? prog / 0.15 : 1 - Math.max(0, (prog - 0.55) / 0.45);
      const y = fl.y * h - prog * 42;
      const fx = fl.x * w;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (fl.itemIdx !== undefined) {
        drawItemIcon(ctx, fx - 26, y - 6, 12, fl.itemIdx);
      }
      ctx.font = "800 22px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(8,14,28,0.88)";
      const tx = fl.itemIdx !== undefined ? fx + 12 : fx;
      ctx.strokeText(fl.text, tx, y);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, tx, y);
    }
    ctx.globalAlpha = 1;
  }
}
