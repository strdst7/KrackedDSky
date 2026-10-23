import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  Coffee,
  Crown,
  Flame,
  HandHeart,
  Heart,
  HelpCircle,
  Mic,
  Moon,
  Navigation,
  Pause,
  Plane,
  Radio,
  RotateCcw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  AlertTriangle,
  Briefcase,
  ShieldCheck,
  Swords,
  Trophy,
  Utensils,
  Volume2,
  VolumeX,
  Wind,
  X,
} from "lucide-react";
import {
  CabinGame,
  ITEMS,
  PA_ORDER,
  PA_SCRIPTS,
  type CameraPreset,
  type FlightResult,
  type GameConfig,
  type GameMode,
  type HudState,
  type PaHud,
  type PaPhase,
} from "./game/engine";
import { splitWords } from "./game/pa";
import { HibiscusDot, ItemSvg } from "./components/GameIcons";
import { CareerModal } from "./components/CareerModal";
import {
  FLIGHT_SECTORS,
  getRankInfo,
  loadCareer,
  recordFlightAudit,
  type AuditGrade,
  type CareerProfile,
} from "./game/career";
import { audio } from "./game/audio";
import { BATIK_PALETTES, SKIN_HEX } from "./game/textures";
import {
  loadPrefs,
  loadScores,
  savePrefs,
  saveScore,
  type BatikTheme,
  type CrewAppearance,
  type HighScore,
  type SkyMood,
} from "./game/storage";
import { cn } from "./utils/cn";

const SKY_ORDER: SkyMood[] = ["sunset", "day", "dawn", "night"];

function SkyIcon({ sky }: { sky: SkyMood }) {
  if (sky === "sunset") return <Sunset className="h-4 w-4 text-amber-300" />;
  if (sky === "day") return <Sun className="h-4 w-4 text-sky-300" />;
  if (sky === "dawn") return <Sunrise className="h-4 w-4 text-pink-300" />;
  return <Moon className="h-4 w-4 text-indigo-300" />;
}

const CAM_LABEL: Record<CameraPreset, string> = {
  cutaway: "CABIN",
  follow: "CLOSE",
  pov: "POV",
  wing: "WING",
};

const MODE_INFO: Record<GameMode, { label: string; icon: typeof Plane }> = {
  economy: { label: "Economy", icon: Plane },
  first: { label: "VIP", icon: Crown },
  match: { label: "1v1", icon: Swords },
};

/** KD SKY airline emblem — plane silhouette + hibiscus, gold on teal */
function KdSkyEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="kdBg" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#0f6e66" />
          <stop offset="1" stopColor="#06283a" />
        </linearGradient>
        <linearGradient id="kdGold" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffe08a" />
          <stop offset="1" stopColor="#e4ae2e" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29.5" fill="url(#kdBg)" stroke="url(#kdGold)" strokeWidth="2.5" />
      <path
        d="M32 12c1.6 4 2.2 8 2 12l16 9v3.6L34 31.5l-.6 9 4.6 3.2v2.6L32 44.6l-6 1.7v-2.6l4.6-3.2-.6-9L14 36.6V33l16-9c-.2-4 .4-8 2-12z"
        fill="url(#kdGold)"
      />
      <circle cx="32" cy="21" r="2" fill="#ff758f" />
      <text x="32" y="58" textAnchor="middle" fontFamily="Sora, Rajdhani, Inter, sans-serif" fontWeight="800" fontSize="9" fill="#e9f2ff" letterSpacing="1">
        KD SKY
      </text>
    </svg>
  );
}

function SkillRing({ icon, lv, prog }: { icon: ReactNode; lv: number; prog: number }) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  return (
    <div className="glass relative flex items-center gap-1 rounded-full pr-2.5 pl-1 py-0.5">
      <div className="relative flex h-7 w-7 items-center justify-center">
        <svg width="28" height="28" className="-rotate-90">
          <circle cx="14" cy="14" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" fill="none" />
          <circle
            cx="14"
            cy="14"
            r={r}
            stroke="#f5c756"
            strokeWidth="2.5"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - prog)}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="absolute flex items-center justify-center text-amber-200">{icon}</span>
      </div>
      <span className="font-hud text-[11px] font-black text-amber-200">{lv}</span>
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  className,
  active,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "glass flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold tracking-wider transition-all hover:-translate-y-px hover:bg-white/10 active:translate-y-0",
        active && "ring-1 ring-amber-300/60",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------ PA Teleprompter ------------------------------ */

function PaTeleprompter({
  pa,
  onStop,
}: {
  pa: PaHud;
  onStop: () => void;
}) {
  const script = pa.phase ? PA_SCRIPTS[pa.phase] : null;
  const words = useMemo(() => (script ? splitWords(script.text(pa.crewName)) : []), [script, pa.crewName]);
  const activeRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const top = el.offsetTop - box.clientHeight * 0.5 + el.clientHeight * 0.5;
    box.scrollTo({ top, behavior: "smooth" });
  }, [pa.wordIndex]);

  if (!script) return null;
  return (
    <div className="pointer-events-auto anim-in mx-auto w-full max-w-2xl px-3">
      <div
        className="glass relative overflow-hidden rounded-3xl p-0"
        style={{
          background: "linear-gradient(180deg, rgba(8,14,30,0.94), rgba(5,10,22,0.9))",
          boxShadow: `0 20px 60px rgba(0,0,0,.55), 0 0 0 1px ${script.accent}44, 0 0 56px ${script.accent}26`,
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="pa-live flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: `${script.accent}22`, color: script.accent }}
            >
              <Mic className="h-4 w-4" />
            </span>
            <div>
              <div className="font-hud text-[10px] font-bold tracking-[0.3em] text-white/60">PA INTERPHONE · LIVE</div>
              <div className="font-display text-sm font-bold text-white">{script.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-hud rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/70">
              {pa.crewName.toUpperCase()} · KDMIRAH CREW
            </span>
            <button
              onClick={onStop}
              title="Hang up (C)"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-rose-500/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* script */}
        <div
          ref={scrollRef}
          className="max-h-[26vh] overflow-y-auto px-5 py-5 sm:max-h-[22vh]"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
          }}
        >
          <p className="font-display text-[17px] leading-[1.75] text-white/55 sm:text-[19px]">
            {words.map((w, i) => {
              const state = i < pa.wordIndex ? "done" : i === pa.wordIndex ? "now" : "next";
              return (
                <span
                  key={i}
                  ref={state === "now" ? activeRef : undefined}
                  className={cn(
                    "mr-[0.32em] inline-block rounded-md px-0.5 transition-colors duration-150",
                    state === "done" && "text-white/85",
                    state === "now" && "text-slate-950 font-semibold",
                    state === "next" && "text-white/40"
                  )}
                  style={state === "now" ? { background: script.accent, boxShadow: `0 0 16px ${script.accent}99` } : undefined}
                >
                  {w.text}
                </span>
              );
            })}
          </p>
        </div>
        {/* progress */}
        <div className="h-1 w-full bg-white/10">
          <div className="h-full transition-[width] duration-150" style={{ width: `${pa.progress * 100}%`, background: script.accent }} />
        </div>
      </div>
    </div>
  );
}

function PaPicker({
  pa,
  preview,
  onPick,
  onClose,
}: {
  pa: PaHud;
  preview: boolean;
  onPick: (p: PaPhase) => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto anim-in mx-auto w-full max-w-2xl px-3">
      <div className="glass rounded-3xl p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-amber-300" />
            <span className="font-hud text-[11px] font-bold tracking-[0.3em] text-white/70">PA INTERPHONE · SELECT SCRIPT</span>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PA_ORDER.map((p, i) => {
            const s = PA_SCRIPTS[p];
            const used = pa.used.includes(p) && !preview;
            const rec = pa.recommended === p && !preview;
            return (
              <button
                key={p}
                disabled={used}
                onClick={() => onPick(p)}
                className={cn(
                  "group relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                  used
                    ? "cursor-not-allowed border-white/5 bg-white/[0.03] opacity-45"
                    : "border-white/10 bg-white/[0.05] hover:-translate-y-0.5 hover:bg-white/10",
                  rec && !used && "ring-1 ring-amber-300/70"
                )}
                style={!used ? { boxShadow: `inset 0 0 0 1px ${s.accent}22` } : undefined}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-hud text-[10px] font-black tracking-widest" style={{ color: s.accent }}>
                    PHASE {i + 1}
                  </span>
                  {rec && !used && (
                    <span className="font-hud rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-slate-950">
                      ×1.5
                    </span>
                  )}
                  {used && <span className="font-hud text-[9px] font-bold tracking-widest text-white/50">DONE</span>}
                </div>
                <div className="font-display text-[13px] font-bold leading-tight text-white">{s.title}</div>
                <div className="font-hud mt-0.5 flex items-center gap-2 text-[10px] font-bold text-white/55">
                  <span>+{s.points}</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" /> {s.satisfaction}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Wind className="h-3 w-3" /> {Math.round(s.stability * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ App ------------------------------------ */

export default function App() {
  const initialPrefs = useRef(loadPrefs()).current;

  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CabinGame | null>(null);

  const [screen, setScreen] = useState<"title" | "game">("title");
  const [appearance, setAppearance] = useState<CrewAppearance>(initialPrefs.appearance);
  const [sky, setSky] = useState<SkyMood>(initialPrefs.sky);
  const [mode, setMode] = useState<GameMode>("economy");
  const [flights, setFlights] = useState<1 | 3 | 5>(1);
  const [sound, setSound] = useState(initialPrefs.sound);
  const [haptics] = useState(initialPrefs.haptics);
  const [tilt, setTilt] = useState(initialPrefs.tilt);
  const [name, setName] = useState(initialPrefs.name);

  const [career, setCareer] = useState<CareerProfile>(() => loadCareer());
  const [auditReport, setAuditReport] = useState<{
    grade: AuditGrade;
    xpGained: number;
    creditsGained: number;
    promotedTitle: string | null;
    newMedals: string[];
  } | null>(null);

  const [hud, setHud] = useState<HudState | null>(null);
  const [pa, setPa] = useState<PaHud | null>(null);
  const [paPicker, setPaPicker] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<FlightResult | null>(null);
  const [modal, setModal] = useState<null | "help" | "scores" | "career">(null);
  const [scores, setScores] = useState<HighScore[]>(loadScores());
  const [savedDate, setSavedDate] = useState<number | null>(null);
  const [boardFlash, setBoardFlash] = useState(0);
  const savedMatchRef = useRef(false);

  useEffect(() => {
    const el = viewportRef.current!;
    const game = new CabinGame(
      el,
      { mode: "economy", flights: 1, tilt: initialPrefs.tilt, sound: initialPrefs.sound, haptics: initialPrefs.haptics },
      initialPrefs.appearance,
      initialPrefs.sky,
      {
        onHud: setHud,
        onPa: setPa,
        onPaRequest: () => setPaPicker((v) => !v),
        onFlightEnd: (r) => {
          if (r.win) game.spawnConfetti();
          const audit = recordFlightAudit(loadCareer(), {
            sectorId: r.sectorId,
            win: r.win,
            flightScore: r.flightScore,
            parScore: r.parScore,
            satisfaction: r.satisfaction,
            safety: r.safety,
            missed: r.missed,
            incidentsResolved: r.incidentsResolved,
            paCount: r.paCount,
          });
          setCareer(audit.updated);
          game.setCareer(audit.updated);
          if (audit.newRank) audio.levelUp();
          setAuditReport({
            grade: audit.grade,
            xpGained: audit.xpGained,
            creditsGained: audit.creditsGained,
            promotedTitle: audit.newRank ? audit.newRank.title : null,
            newMedals: audit.newAchievements.map((m) => m.title),
          });
          setResult(r);
        },
        onSelectCrewInPreview: (gender) => {
          setAppearance((prev) => ({ ...prev, gender }));
          setName((cur) => (cur === "MIRAH" && gender === "male" ? "HAFIZ" : cur === "HAFIZ" && gender === "female" ? "MIRAH" : cur));
        },
      }
    );
    engineRef.current = game;
    game.setCrewName(initialPrefs.name);
    game.start();
    audio.setEnabled(initialPrefs.sound);
    return () => {
      game.destroy();
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setAppearance(appearance);
    engineRef.current?.setCrewName(name);
    savePrefs({ name, sound, haptics, tilt, sky, appearance });
  }, [appearance, name, sound, haptics, tilt, sky]);

  useEffect(() => {
    if (result?.matchOver && !savedMatchRef.current) {
      savedMatchRef.current = true;
      const date = Date.now();
      const updated = saveScore({
        name: name.trim().toUpperCase() || "CREW",
        score: result.totalScore,
        mode: MODE_INFO[mode].label,
        flights,
        perfects: result.perfects,
        shifts: `${result.shiftsWon}-${result.shiftsLost}`,
        date,
      });
      setScores(updated);
      setSavedDate(date);
    }
  }, [result, mode, flights, name]);

  const cycleSky = () => {
    audio.unlock();
    audio.click();
    const next = SKY_ORDER[(SKY_ORDER.indexOf(sky) + 1) % SKY_ORDER.length];
    setSky(next);
    engineRef.current?.setSky(next);
  };

  const toggleSound = () => {
    audio.unlock();
    const next = !sound;
    setSound(next);
    audio.setEnabled(next);
    if (next && screen === "game") audio.startMusic();
  };

  const openPa = () => {
    audio.unlock();
    audio.click();
    if (engineRef.current?.isPaActive()) {
      engineRef.current.stopPA(false);
      return;
    }
    setPaPicker((v) => !v);
  };

  const pickPa = (p: PaPhase) => {
    setPaPicker(false);
    engineRef.current?.startPA(p);
  };

  const startFlight = async (sectorOverride?: string) => {
    audio.unlock();
    audio.click();
    if (tilt && typeof (DeviceOrientationEvent as any)?.requestPermission === "function") {
      try {
        await (DeviceOrientationEvent as any).requestPermission();
      } catch {
        setTilt(false);
      }
    }
    const sectorId = sectorOverride || career.selectedSector;
    const cfg: GameConfig = { mode, flights, sectorId, tilt, sound, haptics };
    savedMatchRef.current = false;
    setSavedDate(null);
    setAuditReport(null);
    setResult(null);
    setPaused(false);
    setModal(null);
    setPaPicker(false);
    setBoardFlash((k) => k + 1);
    setScreen("game");
    engineRef.current?.startMatch(cfg);
  };

  const returnToTitle = () => {
    audio.click();
    audio.stopMusic();
    setPaused(false);
    setResult(null);
    setHud(null);
    setPaPicker(false);
    setScreen("title");
    setScores(loadScores());
    engineRef.current?.enterPreviewMode();
  };

  const togglePause = useCallback(() => {
    if (screen !== "game" || result) return;
    setPaused((p) => {
      engineRef.current?.setPaused(!p);
      audio.click();
      return !p;
    });
  }, [screen, result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyP") {
        if (modal) setModal(null);
        else if (paPicker) setPaPicker(false);
        else if (e.code === "KeyP" || screen === "game") togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, paPicker, screen, togglePause]);

  const rankInfo = useMemo(() => getRankInfo(career), [career]);
  const activeSector = useMemo(
    () => FLIGHT_SECTORS.find((s) => s.id === career.selectedSector) || FLIGHT_SECTORS[1],
    [career.selectedSector]
  );

  const paActive = !!pa?.active;
  const paState: PaHud = pa ?? {
    active: false,
    phase: null,
    wordIndex: -1,
    progress: 0,
    used: [],
    recommended: "welcome",
    crewName: name,
  };

  return (
    <div className="font-hud relative h-dvh w-full overflow-hidden bg-[#06101f] select-none">
      {/* PERSISTENT LIVE 3D VIEWPORT */}
      <div ref={viewportRef} className="absolute inset-0" />

      {/* Cinematic finish: vignette + fine grain */}
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className="grain pointer-events-none absolute inset-0" />

      {/* Letterbox during PA announcements */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 bg-[#04080f] transition-all duration-700 ease-out",
          paActive ? "h-[7vh]" : "h-0"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-[#04080f] transition-all duration-700 ease-out",
          paActive ? "h-[7vh]" : "h-0"
        )}
      />

      {/* Boarding flash transition */}
      {boardFlash > 0 && <div key={boardFlash} className="board-flash pointer-events-none absolute inset-0 bg-[#f5c756]/60" />}

      {/* ==================== TITLE OVERLAY ==================== */}
      {screen === "title" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
          <div className={cn("flex items-start justify-between gap-2 transition-transform duration-700", paActive && "translate-y-[6vh]")}>
            <div className="glass pointer-events-auto anim-in flex items-center gap-3 rounded-2xl px-3.5 py-2">
              <div className="animate-[float_4s_ease-in-out_infinite]">
                <KdSkyEmblem size={46} />
              </div>
              <div>
                <div className="font-display text-[22px] font-extrabold leading-none tracking-tight text-white">
                  Kracked<span className="text-amber-300">D</span>Sky
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-hud text-[10px] font-bold tracking-[0.24em] text-emerald-300/95">{rankInfo.current.short.toUpperCase()}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="font-hud text-[10px] font-bold tracking-[0.2em] text-amber-300">{career.credits} SC</span>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto anim-in flex flex-wrap items-center justify-end gap-1.5">
              <IconBtn
                onClick={() => {
                  audio.click();
                  setModal("career");
                }}
                title="Career Logbook, Sectors & Gear Shop"
                className="text-emerald-200"
              >
                <Briefcase className="h-4 w-4 text-emerald-300" />
                <span className="hidden sm:inline">CAREER</span>
              </IconBtn>
              <IconBtn onClick={openPa} title="Read PA Announcement (C)" active={paActive} className="text-amber-200">
                <Mic className={cn("h-4 w-4", paActive ? "text-rose-400" : "text-amber-300")} />
                <span className="hidden sm:inline">{paActive ? "HANG UP" : "PA"}</span>
              </IconBtn>
              <IconBtn onClick={() => engineRef.current?.triggerEmote("salam")} title="Salam Hormat (G)" className="text-amber-200">
                <HandHeart className="h-4 w-4 text-amber-300" />
                <span className="hidden sm:inline">SALAM</span>
              </IconBtn>
              <IconBtn onClick={cycleSky} title="Sky Time">
                <SkyIcon sky={sky} />
              </IconBtn>
              <IconBtn onClick={toggleSound} title="Audio">
                {sound ? <Volume2 className="h-4 w-4 text-cyan-300" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              </IconBtn>
              <IconBtn
                onClick={() => {
                  audio.click();
                  setModal("scores");
                }}
                title="Leaderboard"
              >
                <Trophy className="h-4 w-4 text-amber-300" />
              </IconBtn>
              <IconBtn
                onClick={() => {
                  audio.click();
                  setModal("help");
                }}
                title="Guide"
              >
                <HelpCircle className="h-4 w-4 text-sky-300" />
              </IconBtn>
            </div>
          </div>

          {/* Center: PA picker in preview */}
          <div className="flex flex-col items-center gap-2">
            {!paActive && paPicker && <PaPicker pa={paState} preview onPick={pickPa} onClose={() => setPaPicker(false)} />}
          </div>

          {/* Bottom: teleprompter while on the interphone, otherwise the crew studio dock */}
          {paActive && (
            <div className="mb-[7vh] flex flex-col items-center">
              <PaTeleprompter pa={paState} onStop={() => engineRef.current?.stopPA(false)} />
            </div>
          )}
          <div className={cn("mx-auto flex w-full max-w-4xl flex-col items-stretch justify-between gap-2.5 transition-opacity duration-500 sm:flex-row sm:items-end", paActive && "hidden")}>
            <div className="glass pointer-events-auto anim-in flex flex-col gap-2 rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {(
                    [
                      ["female", "Pramugari"],
                      ["male", "Pramugara"],
                    ] as const
                  ).map(([g, label]) => (
                    <button
                      key={g}
                      onClick={() => {
                        audio.click();
                        setAppearance((a) => ({ ...a, gender: g }));
                        setName((cur) => (cur === "MIRAH" && g === "male" ? "HAFIZ" : cur === "HAFIZ" && g === "female" ? "MIRAH" : cur));
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider transition",
                        appearance.gender === g
                          ? "bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(245,199,86,0.45)]"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <HibiscusDot color={appearance.gender === g ? "#991b1b" : "#ff758f"} size={13} />
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  value={name}
                  maxLength={10}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  aria-label="Crew Name"
                  className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs font-black tracking-widest text-amber-200 outline-none focus:border-amber-300/60"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {(Object.keys(BATIK_PALETTES) as BatikTheme[]).map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        audio.click();
                        setAppearance((a) => ({ ...a, batik: b }));
                      }}
                      title={BATIK_PALETTES[b].name}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform",
                        appearance.batik === b ? "scale-110 border-amber-300 ring-2 ring-amber-300/40" : "border-white/30 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: BATIK_PALETTES[b].swatch }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {SKIN_HEX.map((hex, idx) => (
                    <button
                      key={hex}
                      onClick={() => {
                        audio.click();
                        setAppearance((a) => ({ ...a, skin: idx }));
                      }}
                      className={cn(
                        "h-5 w-5 rounded-full border transition-transform",
                        appearance.skin === idx ? "scale-110 border-white ring-2 ring-white/40" : "border-black/40 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    audio.click();
                    setAppearance((a) => ({ ...a, hairStyle: (a.hairStyle + 1) % 2 }));
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold tracking-wider text-cyan-200 transition hover:bg-white/15"
                >
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  {appearance.gender === "female" ? (appearance.hairStyle === 0 ? "Sanggul" : "Tudung") : appearance.hairStyle === 0 ? "Quiff" : "Songkok"}
                </button>
              </div>
            </div>

            <div className="glass pointer-events-auto anim-in flex flex-col gap-2 rounded-2xl p-3">
              <button
                onClick={() => {
                  audio.click();
                  setModal("career");
                }}
                title="Select Flight Sector"
                className="flex items-center justify-between gap-2 rounded-xl border border-cyan-300/25 bg-white/[0.04] px-2.5 py-1 text-left transition hover:bg-white/10"
              >
                <span className="text-[11px] font-black tracking-wider text-cyan-300">
                  {activeSector.flightNo} · {activeSector.route}
                </span>
                <span className="truncate text-[11px] font-bold text-slate-300">{activeSector.name} ▾</span>
              </button>
              <div className="flex items-center gap-1.5">
                {(Object.keys(MODE_INFO) as GameMode[]).map((m) => {
                  const Icon = MODE_INFO[m].icon;
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        audio.click();
                        setMode(m);
                      }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black tracking-wider transition",
                        active ? "bg-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.4)]" : "bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {MODE_INFO[m].label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {([1, 3, 5] as const).map((fc) => (
                    <button
                      key={fc}
                      onClick={() => {
                        audio.click();
                        setFlights(fc);
                      }}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-xs font-black transition",
                        flights === fc ? "border-amber-300/70 bg-amber-300/20 text-amber-200" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {fc}×
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => startFlight()}
                  className="btn-shimmer font-display flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#f5c756,#ffe08a,#34d399,#f5c756)] px-6 py-2 text-lg font-extrabold tracking-widest text-slate-950 shadow-[0_0_30px_rgba(245,199,86,0.45)] transition hover:scale-[1.03] active:scale-95"
                >
                  <span>PLAY</span>
                  <Navigation className="h-4 w-4 rotate-45 fill-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== IN-FLIGHT HUD ==================== */}
      {screen === "game" && hud && !result && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-4">
          <div className={cn("flex items-start justify-between gap-2 transition-all duration-500", paActive && "translate-y-[6vh]")}>
            <div className="flex flex-col gap-1.5">
              <div className="glass flex items-center gap-2 rounded-2xl px-3 py-1.5">
                <KdSkyEmblem size={22} />
                <span className="text-[11px] font-black tracking-wider text-cyan-300">{hud.sectorCode}</span>
                <span className="text-xs font-black tracking-wider text-amber-300">
                  F{hud.flightIndex}/{hud.flightsTotal}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: hud.flightsTotal }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        i < hud.shiftsWon ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : i < hud.shiftsWon + hud.shiftsLost ? "bg-rose-500" : "bg-white/20"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <SkillRing icon={<Coffee className="h-3.5 w-3.5" />} lv={hud.skills.pourLv} prog={hud.skills.pourProg} />
                <SkillRing icon={<Utensils className="h-3.5 w-3.5" />} lv={hud.skills.plateLv} prog={hud.skills.plateProg} />
                <SkillRing icon={<Sparkles className="h-3.5 w-3.5" />} lv={hud.skills.graceLv} prog={hud.skills.graceProg} />
              </div>
            </div>

            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-1.5">
              <div className="text-center">
                <div className="font-display text-2xl font-extrabold leading-none tabular-nums text-white">{hud.flightScore.toLocaleString()}</div>
                <div className="text-[10px] font-bold tracking-wider text-slate-400">{hud.mode === "match" ? `VS ${hud.opponentScore}` : `/ ${hud.parScore}`}</div>
              </div>
              {hud.streak >= 2 && (
                <div className="flex items-center gap-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
                  <Flame className="h-3.5 w-3.5 fill-slate-950" />×{hud.mult.toFixed(1)}
                </div>
              )}
              <div className="h-6 w-px bg-white/15" />
              <div className="text-sm font-black tabular-nums text-cyan-200">
                {Math.floor(hud.timeLeft / 60)}:{String(Math.floor(hud.timeLeft % 60)).padStart(2, "0")}
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              {hud.incident && (
                <button
                  onClick={() => engineRef.current?.resolveIncidentAction()}
                  title="Walk to incident & resolve"
                  className="flex animate-pulse items-center gap-1 rounded-xl border border-amber-300/70 bg-amber-400/20 px-2.5 py-1.5 text-[11px] font-black tracking-wider text-amber-200 hover:bg-amber-400/30"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  <span className="hidden md:inline">{hud.incident.label}</span>
                  <span>{Math.ceil(hud.incident.timer)}s</span>
                </button>
              )}
              {hud.turbulence !== "idle" && (
                <div
                  className={cn(
                    "animate-pulse rounded-xl border px-2 py-1.5 text-xs font-black",
                    hud.turbulence === "active" ? "border-rose-400/60 bg-rose-500/25 text-rose-200" : "border-amber-300/60 bg-amber-400/20 text-amber-200"
                  )}
                >
                  <Wind className="h-4 w-4" />
                </div>
              )}
              <div className="glass hidden sm:flex items-center gap-1 rounded-xl px-2 py-1.5" title="Safety Compliance">
                <ShieldCheck className={cn("h-4 w-4", hud.safety >= 80 ? "text-emerald-300" : "text-amber-300")} />
                <span className="text-xs font-black tabular-nums text-emerald-200">{hud.safety}%</span>
              </div>
              <div className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5">
                <Heart
                  className={cn(
                    "h-4 w-4",
                    hud.satisfaction > 60 ? "fill-emerald-400 text-emerald-400" : hud.satisfaction > 30 ? "fill-amber-400 text-amber-400" : "fill-rose-500 text-rose-500"
                  )}
                />
                <div className="h-2 w-14 overflow-hidden rounded-full bg-white/15 sm:w-16">
                  <div
                    className={cn("h-full rounded-full transition-all", hud.satisfaction > 60 ? "bg-emerald-400" : hud.satisfaction > 30 ? "bg-amber-400" : "bg-rose-500")}
                    style={{ width: `${hud.satisfaction}%` }}
                  />
                </div>
              </div>

              <IconBtn onClick={openPa} title="Read PA Announcement (C)" active={paActive} className="h-9 text-amber-200">
                <Mic className={cn("h-4 w-4", paActive ? "text-rose-400" : "text-amber-300")} />
                <span className="hidden sm:inline">{paActive ? "HANG UP" : "PA"}</span>
              </IconBtn>
              <IconBtn onClick={() => engineRef.current?.cycleCamera()} title="Switch Camera (V)" className="h-9 text-cyan-200">
                <Camera className="h-3.5 w-3.5" />
                <span>{CAM_LABEL[hud.camPreset]}</span>
              </IconBtn>
              <IconBtn onClick={cycleSky} title="Sky Mood" className="hidden h-9 sm:flex">
                <SkyIcon sky={sky} />
              </IconBtn>
              <IconBtn onClick={() => engineRef.current?.triggerEmote("salam")} title="Salam Hormat (G)" className="h-9 text-amber-300">
                <HandHeart className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={togglePause} title="Pause (P)" className="h-9 text-white">
                <Pause className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          {/* Center: PA picker / skill-shot */}
          <div className="flex flex-col items-center gap-2">
            {!paActive && paPicker && <PaPicker pa={paState} preview={false} onPick={pickPa} onClose={() => setPaPicker(false)} />}

            {hud.miniGame && !paActive && (
              <div className="pointer-events-auto anim-in flex flex-col items-center">
                {hud.miniGame.type === "pour" ? (
                  <div
                    onPointerDown={() => engineRef.current?.pressServeExternal()}
                    onPointerUp={() => engineRef.current?.releaseServeExternal()}
                    className="glass flex cursor-pointer flex-col items-center gap-2 rounded-3xl p-4"
                  >
                    <div className="relative h-32 w-12 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-white/40 bg-white/5">
                      <div
                        className="absolute inset-x-0 border-y-2 border-amber-300 bg-amber-300/35"
                        style={{ bottom: `${hud.miniGame.band[0] * 100}%`, height: `${(hud.miniGame.band[1] - hud.miniGame.band[0]) * 100}%` }}
                      />
                      <div
                        className="absolute inset-x-0 bottom-0"
                        style={{ height: `${Math.min(105, hud.miniGame.fill * 100)}%`, backgroundColor: hud.miniGame.fill > 1 ? "#ff5252" : ITEMS[hud.miniGame.item].color }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-amber-300">
                      <ItemSvg index={hud.miniGame.item} size={18} />
                      <span>RELEASE</span>
                    </div>
                  </div>
                ) : (
                  <div onPointerDown={() => engineRef.current?.pressServeExternal()} className="glass flex cursor-pointer flex-col items-center gap-2 rounded-3xl px-5 py-4">
                    <div className="relative h-9 w-60 overflow-hidden rounded-full border-2 border-white/35 bg-white/5">
                      <div className="absolute inset-y-0 bg-emerald-400/30" style={{ left: `${50 - hud.miniGame.zone * 50}%`, width: `${hud.miniGame.zone * 100}%` }} />
                      <div className="absolute inset-y-0 bg-amber-300/75" style={{ left: `${50 - hud.miniGame.zone * 22}%`, width: `${hud.miniGame.zone * 44}%` }} />
                      <div className="absolute inset-y-0 w-1.5 bg-white shadow-[0_0_10px_#fff]" style={{ left: `calc(${(hud.miniGame.pos * 0.5 + 0.5) * 100}% - 3px)` }} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-emerald-300">
                      <ItemSvg index={hud.miniGame.item} size={18} />
                      <span>STOP</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: teleprompter while on the interphone, otherwise the service dock */}
          {paActive && (
            <div className="mb-[7vh] flex flex-col items-center">
              <PaTeleprompter pa={paState} onStop={() => engineRef.current?.stopPA(false)} />
            </div>
          )}
          <div className={cn("flex items-end justify-between gap-2 transition-all duration-500", paActive && "hidden")}>
            <JoystickPad onMove={(w, l) => engineRef.current?.setJoystick(w, l)} />

            <div className="pointer-events-auto mx-auto flex flex-col items-center gap-1.5">
              <div className="glass relative flex h-3 w-40 items-center justify-center rounded-full">
                <div className="h-full w-14 rounded-full bg-emerald-400/25" />
                <div
                  className={cn("absolute h-2.5 w-2.5 rounded-full transition-transform duration-75", Math.abs(hud.balanceX) > 0.85 ? "scale-125 bg-rose-500" : "bg-amber-200")}
                  style={{ transform: `translateX(${clampPx(hud.balanceX * 58, -68, 68)}px)` }}
                />
              </div>

              <div className="glass flex flex-wrap items-center justify-center gap-1.5 rounded-2xl p-1.5">
                <div className="flex items-center gap-1 rounded-xl bg-white/5 px-2 py-1">
                  {hud.trayItems.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => engineRef.current?.dropTraySlot(idx)}
                      title="Tray Slot"
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                        it == null ? "border-dashed border-white/20 text-white/25" : "border-amber-300/60 bg-amber-300/15 shadow-inner hover:bg-rose-500/25"
                      )}
                    >
                      {it == null ? "·" : <ItemSvg index={it} size={22} />}
                    </button>
                  ))}
                </div>
                <div className="hidden h-7 w-px bg-white/15 sm:block" />
                <div className="flex items-center gap-1">
                  {ITEMS.map((item, idx) => {
                    const needed = hud.neededItems.includes(idx);
                    return (
                      <button
                        key={item.id}
                        onClick={() => engineRef.current?.requestLoadItem(idx)}
                        title={`${idx + 1}. ${item.name}`}
                        className={cn(
                          "relative flex h-10 w-8 flex-col items-center justify-center rounded-lg border transition active:scale-90 sm:w-9",
                          needed ? "border-amber-300 bg-amber-400/20 shadow-[0_0_12px_rgba(245,199,86,0.4)]" : "border-white/10 bg-white/5 hover:bg-white/15"
                        )}
                      >
                        <ItemSvg index={idx} size={20} />
                        <span className="text-[9px] font-black leading-none text-slate-300">{idx + 1}</span>
                        {needed && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-amber-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                audio.unlock();
                engineRef.current?.pressServeExternal();
              }}
              onPointerUp={() => engineRef.current?.releaseServeExternal()}
              onPointerLeave={() => engineRef.current?.releaseServeExternal()}
              className={cn(
                "pointer-events-auto flex h-14 w-16 shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 text-xs font-black tracking-wider shadow-xl backdrop-blur-md transition active:scale-95 sm:w-24",
                hud.canServeItem !== null || hud.miniGame
                  ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.55)]"
                  : "glass text-white hover:bg-white/15"
              )}
            >
              {hud.canServeItem !== null ? <ItemSvg index={hud.canServeItem} size={20} /> : <Sparkles className="h-4 w-4 text-amber-300" />}
              <span className="hidden sm:inline">SERVE</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== CAREER HUB ==================== */}
      {modal === "career" && (
        <CareerModal
          career={career}
          onChangeCareer={(next) => {
            setCareer(next);
            engineRef.current?.setCareer(next);
          }}
          onSelectSectorAndFly={(secId) => startFlight(secId)}
          onClose={() => setModal(null)}
        />
      )}

      {/* ==================== GUIDE & SCORES ==================== */}
      {modal && modal !== "career" && (
        <div onClick={() => setModal(null)} className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="glass anim-in w-full max-w-md rounded-3xl p-5 text-white">
            {modal === "help" ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-lg font-extrabold tracking-wide text-amber-300">Crew Controls</span>
                  <button onClick={() => setModal(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold">
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-center">
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <div className="flex gap-1">
                      <ItemSvg index={0} size={24} />
                      <ItemSvg index={4} size={24} />
                    </div>
                    <div className="mt-1.5 text-xs font-black text-amber-300">1–8 · LOAD</div>
                    <div className="text-[11px] text-slate-400">Tap item or galley</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <Navigation className="h-6 w-6 text-cyan-300" />
                    <div className="mt-1.5 text-xs font-black text-cyan-300">CLICK / WASD</div>
                    <div className="text-[11px] text-slate-400">Click a row or walk</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <div className="flex gap-1">
                      <ItemSvg index={3} size={24} />
                      <ItemSvg index={5} size={24} />
                    </div>
                    <div className="mt-1.5 text-xs font-black text-emerald-300">SPACE / E</div>
                    <div className="text-[11px] text-slate-400">Hold pour · Stop meal</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <Mic className="h-6 w-6 text-amber-300" />
                    <div className="mt-1.5 text-xs font-black text-amber-300">C · PA</div>
                    <div className="text-[11px] text-slate-400">4 scripts · ×1.5 timing</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <HandHeart className="h-6 w-6 text-pink-300" />
                    <div className="mt-1.5 text-xs font-black text-pink-300">G · SALAM</div>
                    <div className="text-[11px] text-slate-400">Calms nearby guests</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white/5 p-3">
                    <Camera className="h-6 w-6 text-sky-300" />
                    <div className="mt-1.5 text-xs font-black text-sky-300">V · DRAG</div>
                    <div className="text-[11px] text-slate-400">Camera · 360° orbit</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-display flex items-center gap-2 text-lg font-extrabold text-amber-300">
                    <Trophy className="h-5 w-5" /> Top Crew
                  </div>
                  <button onClick={() => setModal(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold">
                    ✕
                  </button>
                </div>
                <LeaderboardList scores={scores} highlight={savedDate ?? undefined} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== PAUSE ==================== */}
      {paused && !result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass anim-in w-full max-w-xs rounded-3xl p-6 text-center">
            <KdSkyEmblem size={44} />
            <h2 className="font-display mt-2 text-2xl font-extrabold tracking-wide text-amber-300">Paused</h2>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={togglePause} className="rounded-xl bg-emerald-400 py-2.5 text-base font-black tracking-widest text-slate-950">
                RESUME
              </button>
              <button onClick={() => startFlight()} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white hover:bg-white/15">
                <RotateCcw className="h-4 w-4" /> RESTART
              </button>
              <button onClick={returnToTitle} className="rounded-xl bg-white/5 py-2.5 text-sm font-bold text-slate-400 hover:text-white">
                CABIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DEBRIEF ==================== */}
      {result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="glass anim-in w-full max-w-sm rounded-3xl p-6 text-center">
            <div className="text-xs font-bold tracking-[0.3em] text-amber-300">{result.matchOver ? "FINAL DEBRIEF" : `FLIGHT ${result.flightIndex}/${result.flightsTotal}`}</div>
            <h2 className={cn("font-display mt-1 text-4xl font-extrabold tracking-wide", result.win ? "text-emerald-300" : "text-rose-400")}>
              {result.matchOver ? (result.matchWon ? "Lead Purser" : "Shift Ended") : result.win ? "Shift Won" : "Shift Lost"}
            </h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <MiniStat label="AUDIT" value={auditReport ? auditReport.grade : "B"} accent="text-amber-300" />
              <MiniStat label="SCORE" value={result.flightScore.toLocaleString()} accent="text-cyan-300" />
              <MiniStat label="SAFETY" value={`${result.safety}%`} accent="text-emerald-300" />
              <MiniStat label="SERVED" value={`${result.served}`} accent="text-white" />
            </div>
            {auditReport && (
              <div className="mt-2.5 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs">
                <div className="flex items-center justify-between font-black text-amber-200">
                  <span>+{auditReport.xpGained} CAREER XP</span>
                  <span>+{auditReport.creditsGained} SC</span>
                </div>
                {auditReport.promotedTitle && (
                  <div className="mt-1 font-display text-xs font-extrabold text-emerald-300">
                    ★ PROMOTED TO {auditReport.promotedTitle.toUpperCase()}!
                  </div>
                )}
                {auditReport.newMedals.length > 0 && (
                  <div className="mt-0.5 text-[11px] font-bold text-cyan-200">
                    Medal: {auditReport.newMedals.join(" · ")}
                  </div>
                )}
              </div>
            )}
            {result.matchOver && (
              <div className="mt-3">
                <LeaderboardList scores={scores.slice(0, 5)} highlight={savedDate ?? undefined} />
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {!result.matchOver ? (
                <button
                  onClick={() => {
                    audio.click();
                    setResult(null);
                    engineRef.current?.startNextFlight();
                  }}
                  className="rounded-xl bg-gradient-to-r from-amber-300 to-emerald-400 py-3 text-base font-black tracking-widest text-slate-950"
                >
                  NEXT FLIGHT
                </button>
              ) : (
                <button onClick={() => startFlight()} className="rounded-xl bg-gradient-to-r from-amber-300 to-emerald-400 py-3 text-base font-black tracking-widest text-slate-950">
                  FLY AGAIN
                </button>
              )}
              <button onClick={returnToTitle} className="rounded-xl bg-white/10 py-2.5 text-xs font-bold tracking-widest text-slate-300 hover:bg-white/15">
                CABIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function clampPx(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] font-bold tracking-widest text-slate-400">{label}</div>
      <div className={cn("font-display text-xl font-extrabold", accent)}>{value}</div>
    </div>
  );
}

function LeaderboardList({ scores, highlight }: { scores: HighScore[]; highlight?: number }) {
  if (scores.length === 0) return <div className="py-4 text-center text-xs text-slate-400">No flights logged yet</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-xs">
      {scores.map((s, i) => (
        <div
          key={s.date + "-" + i}
          className={cn("flex items-center justify-between border-b border-white/5 px-3 py-1.5 last:border-b-0", highlight === s.date ? "bg-amber-400/20 text-amber-200" : "text-slate-200")}
        >
          <span className="font-bold">
            <span className="mr-2 text-slate-500">#{i + 1}</span>
            {s.name}
          </span>
          <span className="font-black text-cyan-300">{s.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function JoystickPad({ onMove }: { onMove: (walk: number, lane: number) => void }) {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  const update = (e: React.PointerEvent) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    onMove(-dy, dx);
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
  };

  return (
    <div
      ref={padRef}
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (pid.current === e.pointerId) update(e);
      }}
      onPointerUp={(e) => {
        if (pid.current === e.pointerId) {
          pid.current = null;
          onMove(0, 0);
          if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
        }
      }}
      className="glass pointer-events-auto flex h-20 w-20 shrink-0 touch-none items-center justify-center rounded-full sm:hidden"
    >
      <div ref={knobRef} className="h-9 w-9 rounded-full border border-amber-300/50 bg-amber-300/25" />
    </div>
  );
}
