/* KrackedDSky — Career Progression, Sector Missions, Economy & Flight Audit System */
import type { SkyMood } from "./storage";

export interface RankDef {
  id: string;
  order: number;
  title: string;
  short: string;
  minXp: number;
  checkRideGrade?: "B" | "A" | "S";
  responsibility: string;
  perkLabel: string;
  patienceBonus: number; // extra seconds buffer on passenger patience
  scoreMult: number; // career seniority multiplier
}

export const CAREER_RANKS: RankDef[] = [
  {
    id: "trainee",
    order: 1,
    title: "Trainee Cabin Crew",
    short: "Trainee",
    minXp: 0,
    responsibility: "Domestic induction, beverage cart basics & cabin familiarity",
    perkLabel: "Starter Gear Issued",
    patienceBonus: 1.5,
    scoreMult: 1.0,
  },
  {
    id: "junior",
    order: 2,
    title: "Junior Flight Attendant",
    short: "Jr. Crew",
    minXp: 350,
    responsibility: "Solo aisle service, hot meal timing & standard PA briefings",
    perkLabel: "+5% Score · Langkawi Sector",
    patienceBonus: 1.0,
    scoreMult: 1.05,
  },
  {
    id: "senior",
    order: 3,
    title: "Senior Flight Attendant",
    short: "Sr. Crew",
    minXp: 950,
    checkRideGrade: "B",
    responsibility: "High-density business shuttles, special requests & bin checks",
    perkLabel: "+10% Score · Singapore Shuttle",
    patienceBonus: 1.5,
    scoreMult: 1.1,
  },
  {
    id: "leading",
    order: 4,
    title: "Leading Cabin Crew",
    short: "Lead Crew",
    minXp: 1900,
    checkRideGrade: "B",
    responsibility: "VIP Gold cabin service, monsoon weather advisories & passenger care",
    perkLabel: "+15% Score · Borneo Sector",
    patienceBonus: 2.0,
    scoreMult: 1.15,
  },
  {
    id: "ifs",
    order: 5,
    title: "Inflight Supervisor",
    short: "Supervisor",
    minXp: 3200,
    checkRideGrade: "A",
    responsibility: "Cabin safety audits, medical assist response & night red-eye ops",
    perkLabel: "+20% Score · Tokyo Red-Eye",
    patienceBonus: 2.5,
    scoreMult: 1.2,
  },
  {
    id: "purser",
    order: 6,
    title: "Chief Purser",
    short: "Purser",
    minXp: 5000,
    checkRideGrade: "A",
    responsibility: "Full flagship cabin command, VIP commendations & zero-incident leadership",
    perkLabel: "+25% Score · London Flagship",
    patienceBonus: 3.0,
    scoreMult: 1.25,
  },
  {
    id: "instructor",
    order: 7,
    title: "Line Instructor Purser",
    short: "Instructor",
    minXp: 7500,
    checkRideGrade: "S",
    responsibility: "Check-ride evaluator, fleet standards mentor & elite irregular ops",
    perkLabel: "+35% Master Multiplier",
    patienceBonus: 3.5,
    scoreMult: 1.35,
  },
];

export interface SectorDef {
  id: string;
  flightNo: string;
  route: string;
  name: string;
  stage: number;
  minRankOrder: number;
  sky: SkyMood;
  durationSec: number;
  turbulenceFreq: number; // 0.6 calm .. 1.5 rough
  vipBonusRate: number;
  incidents: number; // expected special cabin events per sector
  rewardCredits: number;
  briefing: string;
}

export const FLIGHT_SECTORS: SectorDef[] = [
  {
    id: "kul-pen",
    flightNo: "KD 102",
    route: "KUL → PEN",
    name: "Penang Heritage Hop",
    stage: 1,
    minRankOrder: 1,
    sky: "day",
    durationSec: 78,
    turbulenceFreq: 0.75,
    vipBonusRate: 0.0,
    incidents: 1,
    rewardCredits: 90,
    briefing: "Calm domestic hop. Focus on clean pours, warm Salam greetings, and your Welcome PA.",
  },
  {
    id: "kul-lgk",
    flightNo: "KD 118",
    route: "KUL → LGK",
    name: "Langkawi Sunset Charter",
    stage: 2,
    minRankOrder: 1,
    sky: "sunset",
    durationSec: 80,
    turbulenceFreq: 0.95,
    vipBonusRate: 0.12,
    incidents: 2,
    rewardCredits: 125,
    briefing: "Golden-hour resort charter. Expect thirsty holidaymakers and coastal sea-breeze chop.",
  },
  {
    id: "kul-sin",
    flightNo: "KD 204",
    route: "KUL → SIN",
    name: "Straits Express Shuttle",
    stage: 3,
    minRankOrder: 2,
    sky: "dawn",
    durationSec: 68,
    turbulenceFreq: 1.0,
    vipBonusRate: 0.2,
    incidents: 2,
    rewardCredits: 160,
    briefing: "Tight 68-second commuter sprint! High ratio of impatient business flyers—pre-load smart.",
  },
  {
    id: "kul-bki",
    flightNo: "KD 312",
    route: "KUL → BKI",
    name: "Borneo Monsoon Crossing",
    stage: 4,
    minRankOrder: 3,
    sky: "day",
    durationSec: 84,
    turbulenceFreq: 1.35,
    vipBonusRate: 0.18,
    incidents: 3,
    rewardCredits: 210,
    briefing: "Active weather radar over the South China Sea. Secure open bins & time your Weather PA!",
  },
  {
    id: "kul-nrt",
    flightNo: "KD 508",
    route: "KUL → NRT",
    name: "Tokyo Night Red-Eye",
    stage: 5,
    minRankOrder: 4,
    sky: "night",
    durationSec: 86,
    turbulenceFreq: 1.15,
    vipBonusRate: 0.28,
    incidents: 3,
    rewardCredits: 270,
    briefing: "Overnight service. Watch for lightheaded passengers, anxious flyers, and precision meal plating.",
  },
  {
    id: "kul-lhr",
    flightNo: "KD 001",
    route: "KUL → LHR",
    name: "London Royal Flagship",
    stage: 6,
    minRankOrder: 5,
    sky: "sunset",
    durationSec: 92,
    turbulenceFreq: 1.28,
    vipBonusRate: 0.36,
    incidents: 4,
    rewardCredits: 360,
    briefing: "Flagship check-ride sector. Demanding VIPs, safety checks, and full 4-phase purser command.",
  },
];

export interface EquipmentUpgrade {
  id: "gripMat" | "thermoCarafe" | "aromaDiffuser" | "purserPin";
  name: string;
  desc: string;
  effect: string;
  cost: number;
}

export const EQUIPMENT_CATALOG: EquipmentUpgrade[] = [
  {
    id: "gripMat",
    name: "Woven Non-Slip Tray Liner",
    desc: "Micro-textured batik tray mat dampens turbulence sway.",
    effect: "-25% Tray Wobble",
    cost: 180,
  },
  {
    id: "thermoCarafe",
    name: "Precision Spout Carafe",
    desc: "Balanced gooseneck pour spout widens drink target bands.",
    effect: "+18% Pour Band",
    cost: 240,
  },
  {
    id: "aromaDiffuser",
    name: "Pandan & Lemongrass Cabin Mist",
    desc: "Subtle signature cabin scent keeps waiting guests calmer.",
    effect: "+15% Guest Patience",
    cost: 300,
  },
  {
    id: "purserPin",
    name: "Gold Hibiscus Wing Pin",
    desc: "Official KDMirah commendation insignia boosting career prestige.",
    effect: "+20% Career XP & Credits",
    cost: 420,
  },
];

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  rewardCredits: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_win", title: "Wings Earned", desc: "Win your first flight shift.", rewardCredits: 75 },
  { id: "zero_spill", title: "Silk Hands", desc: "Complete a winning flight with 0 spills or missed orders.", rewardCredits: 120 },
  { id: "safety_ace", title: "Safety First", desc: "Finish a flight with 95%+ Safety Compliance.", rewardCredits: 110 },
  { id: "pa_master", title: "Golden Voice", desc: "Deliver 3+ phase PA announcements on a single flight.", rewardCredits: 130 },
  { id: "s_rank", title: "Check-Ride Distinction", desc: "Achieve an S-Grade Flight Audit.", rewardCredits: 180 },
];

export type AuditGrade = "S" | "A" | "B" | "C";

export interface CareerProfile {
  xp: number;
  credits: number;
  reputation: number; // 0..100 airline trust score
  flightsCompleted: number;
  incidentsResolved: number;
  bestGrades: Record<string, AuditGrade>; // sectorId -> best grade
  ownedGear: EquipmentUpgrade["id"][];
  achievements: string[];
  selectedSector: string;
}

const CAREER_KEY = "krackeddsky-kdmirah-career-v1";

export const DEFAULT_CAREER: CareerProfile = {
  xp: 0,
  credits: 120,
  reputation: 75,
  flightsCompleted: 0,
  incidentsResolved: 0,
  bestGrades: {},
  ownedGear: [],
  achievements: [],
  selectedSector: "kul-lgk",
};

export function loadCareer(): CareerProfile {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CAREER,
        ...parsed,
        bestGrades: { ...(parsed.bestGrades || {}) },
        ownedGear: Array.isArray(parsed.ownedGear) ? parsed.ownedGear : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CAREER };
}

export function saveCareer(profile: CareerProfile) {
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

const GRADE_RANK: Record<AuditGrade, number> = { C: 1, B: 2, A: 3, S: 4 };

export function hasAchievedGrade(profile: CareerProfile, minGrade?: "B" | "A" | "S"): boolean {
  if (!minGrade) return true;
  const need = GRADE_RANK[minGrade];
  return Object.values(profile.bestGrades).some((g) => GRADE_RANK[g] >= need);
}

export function getRankInfo(profile: CareerProfile): {
  current: RankDef;
  next: RankDef | null;
  progress: number;
} {
  let current = CAREER_RANKS[0];
  for (const r of CAREER_RANKS) {
    if (profile.xp >= r.minXp && hasAchievedGrade(profile, r.checkRideGrade)) {
      current = r;
    }
  }
  const idx = CAREER_RANKS.findIndex((r) => r.id === current.id);
  const next = CAREER_RANKS[idx + 1] || null;
  const progress = !next
    ? 1
    : Math.max(0, Math.min(1, (profile.xp - current.minXp) / Math.max(1, next.minXp - current.minXp)));
  return { current, next, progress };
}

export function computeAuditGrade(opts: {
  win: boolean;
  scoreRatio: number; // flightScore / parScore
  satisfaction: number;
  safety: number;
  missed: number;
}): AuditGrade {
  if (!opts.win) return "C";
  const composite = opts.scoreRatio * 38 + opts.satisfaction * 0.32 + opts.safety * 0.3 - opts.missed * 4;
  if (composite >= 94 && opts.safety >= 80 && opts.satisfaction >= 75) return "S";
  if (composite >= 78) return "A";
  if (composite >= 60) return "B";
  return "C";
}

export function recordFlightAudit(
  prev: CareerProfile,
  input: {
    sectorId: string;
    win: boolean;
    flightScore: number;
    parScore: number;
    satisfaction: number;
    safety: number;
    missed: number;
    incidentsResolved: number;
    paCount: number;
  }
): {
  updated: CareerProfile;
  grade: AuditGrade;
  xpGained: number;
  creditsGained: number;
  newRank: RankDef | null;
  newAchievements: AchievementDef[];
} {
  const beforeRank = getRankInfo(prev).current;
  const sector = FLIGHT_SECTORS.find((s) => s.id === input.sectorId) || FLIGHT_SECTORS[0];
  const scoreRatio = Math.min(2.2, input.flightScore / Math.max(200, input.parScore));
  const grade = computeAuditGrade({
    win: input.win,
    scoreRatio,
    satisfaction: input.satisfaction,
    safety: input.safety,
    missed: input.missed,
  });

  const pinMult = prev.ownedGear.includes("purserPin") ? 1.2 : 1.0;
  const gradeMult = grade === "S" ? 1.5 : grade === "A" ? 1.25 : grade === "B" ? 1.0 : 0.65;

  const xpGained = Math.round((95 + input.flightScore * 0.065 + input.incidentsResolved * 35 + input.safety * 0.4) * gradeMult * pinMult);
  let creditsGained = Math.round((sector.rewardCredits * gradeMult + input.incidentsResolved * 18) * pinMult);

  const nextBest = { ...prev.bestGrades };
  const prevBest = nextBest[sector.id];
  if (!prevBest || GRADE_RANK[grade] > GRADE_RANK[prevBest]) {
    nextBest[sector.id] = grade;
  }

  const unlockedSet = new Set(prev.achievements);
  const newAchievements: AchievementDef[] = [];
  const tryUnlock = (id: string, cond: boolean) => {
    if (cond && !unlockedSet.has(id)) {
      unlockedSet.add(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        newAchievements.push(def);
        creditsGained += def.rewardCredits;
      }
    }
  };

  tryUnlock("first_win", input.win);
  tryUnlock("zero_spill", input.win && input.missed === 0);
  tryUnlock("safety_ace", input.safety >= 95);
  tryUnlock("pa_master", input.paCount >= 3);
  tryUnlock("s_rank", grade === "S");

  const repDelta = grade === "S" ? 6 : grade === "A" ? 3 : grade === "B" ? 1 : -4;

  const updated: CareerProfile = {
    ...prev,
    xp: prev.xp + xpGained,
    credits: prev.credits + creditsGained,
    reputation: Math.max(0, Math.min(100, prev.reputation + repDelta)),
    flightsCompleted: prev.flightsCompleted + 1,
    incidentsResolved: prev.incidentsResolved + input.incidentsResolved,
    bestGrades: nextBest,
    achievements: Array.from(unlockedSet),
  };

  saveCareer(updated);
  const afterRank = getRankInfo(updated).current;
  const newRank = afterRank.order > beforeRank.order ? afterRank : null;

  return { updated, grade, xpGained, creditsGained, newRank, newAchievements };
}
