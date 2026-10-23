import { useState } from "react";
import { Award, CheckCircle2, Compass, Lock, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, X } from "lucide-react";
import {
  ACHIEVEMENTS,
  CAREER_RANKS,
  EQUIPMENT_CATALOG,
  FLIGHT_SECTORS,
  getRankInfo,
  hasAchievedGrade,
  saveCareer,
  type CareerProfile,
  type EquipmentUpgrade,
} from "../game/career";
import { audio } from "../game/audio";
import { cn } from "../utils/cn";

export function CareerModal({
  career,
  onChangeCareer,
  onSelectSectorAndFly,
  onClose,
}: {
  career: CareerProfile;
  onChangeCareer: (next: CareerProfile) => void;
  onSelectSectorAndFly: (sectorId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"sectors" | "ranks" | "shop" | "medals">("sectors");
  const { current: rank, next: nextRank, progress } = getRankInfo(career);

  const buyGear = (item: EquipmentUpgrade) => {
    if (career.ownedGear.includes(item.id) || career.credits < item.cost) {
      audio.denied();
      return;
    }
    audio.levelUp();
    const updated: CareerProfile = {
      ...career,
      credits: career.credits - item.cost,
      ownedGear: [...career.ownedGear, item.id],
    };
    saveCareer(updated);
    onChangeCareer(updated);
  };

  const selectSector = (sectorId: string) => {
    audio.click();
    const updated: CareerProfile = { ...career, selectedSector: sectorId };
    saveCareer(updated);
    onChangeCareer(updated);
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass anim-in flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl text-white"
      >
        {/* Top Career Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-300/40">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-extrabold tracking-wide text-white">{rank.title}</span>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-emerald-300">
                  RANK {rank.order}/7
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                <span>{career.xp.toLocaleString()} XP</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="text-slate-400">
                  {nextRank ? `Next: ${nextRank.short} (${nextRank.minXp} XP)` : "Max Rank"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-right">
              <div className="text-[9px] font-bold tracking-widest text-amber-200/80">SKYCREDITS</div>
              <div className="font-display text-sm font-extrabold text-amber-300">{career.credits.toLocaleString()} SC</div>
            </div>
            <div className="hidden sm:block rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-right">
              <div className="text-[9px] font-bold tracking-widest text-cyan-200/80">REPUTATION</div>
              <div className="font-display text-sm font-extrabold text-cyan-200">{career.reputation}%</div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 border-b border-white/10 px-5 py-2">
          {(
            [
              ["sectors", "Flight Sectors", Compass],
              ["ranks", "Career Ladder", ShieldCheck],
              ["shop", "Quartermaster", ShoppingBag],
              ["medals", "Commendations", Award],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                audio.click();
                setTab(id);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider transition",
                tab === id ? "bg-amber-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === "sectors" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {FLIGHT_SECTORS.map((sec) => {
                const locked = rank.order < sec.minRankOrder;
                const active = career.selectedSector === sec.id;
                const best = career.bestGrades[sec.id];
                const reqRank = CAREER_RANKS.find((r) => r.order === sec.minRankOrder);
                return (
                  <div
                    key={sec.id}
                    onClick={() => !locked && selectSector(sec.id)}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-3.5 transition",
                      locked
                        ? "border-white/5 bg-white/[0.02] opacity-55"
                        : active
                          ? "cursor-pointer border-amber-300/70 bg-amber-400/10 ring-1 ring-amber-300/40"
                          : "cursor-pointer border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black tracking-widest text-cyan-300">
                          {sec.flightNo} · {sec.route}
                        </span>
                        {locked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Lock className="h-3 w-3" /> {reqRank?.short}
                          </span>
                        ) : best ? (
                          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                            BEST {best}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300">+{sec.rewardCredits} SC</span>
                        )}
                      </div>
                      <div className="font-display mt-1 text-sm font-bold text-white">{sec.name}</div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300/90">{sec.briefing}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>{sec.durationSec}s · {sec.incidents} Events</span>
                      {!locked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSector(sec.id);
                            onSelectSectorAndFly(sec.id);
                          }}
                          className="rounded-lg bg-emerald-400 px-2.5 py-1 text-[11px] font-black tracking-wider text-slate-950 hover:bg-emerald-300"
                        >
                          FLY SECTOR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "ranks" && (
            <div className="space-y-2">
              {CAREER_RANKS.map((r) => {
                const unlocked = career.xp >= r.minXp && hasAchievedGrade(career, r.checkRideGrade);
                const isCurrent = r.id === rank.id;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5",
                      isCurrent
                        ? "border-amber-300/70 bg-amber-400/15"
                        : unlocked
                          ? "border-emerald-400/25 bg-white/[0.04]"
                          : "border-white/5 bg-white/[0.02] opacity-65"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-white">
                          {r.order}. {r.title}
                        </span>
                        {r.checkRideGrade && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                            Check-Ride {r.checkRideGrade}+
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300">{r.responsibility}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-300">{r.perkLabel}</div>
                      <div className="text-[10px] font-bold text-slate-400">{r.minXp.toLocaleString()} XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "shop" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EQUIPMENT_CATALOG.map((item) => {
                const owned = career.ownedGear.includes(item.id);
                const canAfford = career.credits >= item.cost;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-white">{item.name}</span>
                        <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                          {item.effect}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{item.desc}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">{item.cost} SC</span>
                      {owned ? (
                        <span className="flex items-center gap-1 text-xs font-black text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" /> EQUIPPED
                        </span>
                      ) : (
                        <button
                          onClick={() => buyGear(item)}
                          disabled={!canAfford}
                          className={cn(
                            "rounded-xl px-3 py-1 text-xs font-black tracking-wider transition",
                            canAfford
                              ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                              : "cursor-not-allowed bg-white/10 text-slate-500"
                          )}
                        >
                          ISSUE GEAR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "medals" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((ach) => {
                const earned = career.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border p-3",
                      earned ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] opacity-65"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-display text-sm font-bold text-white">
                        <Sparkles className={cn("h-4 w-4", earned ? "text-amber-300" : "text-slate-500")} />
                        {ach.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-300">{ach.desc}</div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-amber-400/20 px-2 py-1 text-xs font-black text-amber-300">
                      +{ach.rewardCredits} SC
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
