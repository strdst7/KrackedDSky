export interface HighScore {
  name: string;
  score: number;
  mode: string;
  flights: number;
  perfects: number;
  shifts: string;
  date: number;
}

export type BatikTheme = "emerald" | "royal" | "crimson" | "violet";
export type SkyMood = "sunset" | "day" | "dawn" | "night";

export interface CrewAppearance {
  gender: "female" | "male";
  batik: BatikTheme;
  skin: number; // 0..3
  hairStyle: number; // 0..1
}

export interface CrewSkills {
  pourXp: number;
  plateXp: number;
  graceXp: number;
}

const KEY = "krackeddsky-kdmirah-scores-v1";
const PREFS_KEY = "krackeddsky-kdmirah-prefs-v1";
const SKILLS_KEY = "krackeddsky-kdmirah-skills-v1";

export function loadScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: HighScore): HighScore[] {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 8);
  try {
    localStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    /* ignore */
  }
  return top;
}

export interface Prefs {
  name: string;
  sound: boolean;
  haptics: boolean;
  tilt: boolean;
  sky: SkyMood;
  appearance: CrewAppearance;
}

export const DEFAULT_APPEARANCE: CrewAppearance = {
  gender: "female",
  batik: "emerald",
  skin: 1,
  hairStyle: 0,
};

export function loadPrefs(): Prefs {
  const fallback: Prefs = {
    name: "MIRAH",
    sound: true,
    haptics: true,
    tilt: false,
    sky: "sunset",
    appearance: { ...DEFAULT_APPEARANCE },
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        appearance: { ...DEFAULT_APPEARANCE, ...(parsed.appearance || {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadSkills(): CrewSkills {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (raw) return { pourXp: 0, plateXp: 0, graceXp: 0, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { pourXp: 0, plateXp: 0, graceXp: 0 };
}

export function saveSkills(s: CrewSkills) {
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function xpToLevel(xp: number): { level: number; progress: number } {
  // Smooth Pendekar-inspired curve starting at Lv 1
  const level = Math.min(99, Math.floor(1 + Math.sqrt(Math.max(0, xp) / 35)));
  const curBase = Math.pow(level - 1, 2) * 35;
  const nextBase = Math.pow(level, 2) * 35;
  const progress = level >= 99 ? 1 : (xp - curBase) / Math.max(1, nextBase - curBase);
  return { level, progress: Math.max(0, Math.min(1, progress)) };
}
