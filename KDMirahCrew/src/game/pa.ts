/* KrackedDSky — PA Interphone system: phase scripts, Web Speech readout, word tracking & lip-sync envelope */

export type PaPhase = "welcome" | "service" | "weather" | "approach";

export interface PaScript {
  id: PaPhase;
  title: string;
  short: string;
  accent: string; // tailwind-ish hex for UI
  points: number;
  satisfaction: number;
  stability: number; // 0..1 cabin-stability restore
  text: (crewName: string) => string;
}

export const PA_SCRIPTS: Record<PaPhase, PaScript> = {
  welcome: {
    id: "welcome",
    title: "Welcome Aboard & Safety Briefing",
    short: "Welcome",
    accent: "#5be2ff",
    points: 180,
    satisfaction: 8,
    stability: 0.3,
    text: (n) =>
      `Selamat datang, and a very warm welcome aboard KrackedDSky flight KD one one eight to Kuala Lumpur. I'm ${n}, flying with you today together with the KDMirah Crew. Please fasten your seatbelt, stow your tray table, and open your window shade. Sit back, relax, and enjoy the KD Sky experience.`,
  },
  service: {
    id: "service",
    title: "In-Flight Beverage & Dining Announcement",
    short: "Service",
    accent: "#ffd75e",
    points: 160,
    satisfaction: 7,
    stability: 0.2,
    text: () =>
      `Ladies and gentlemen, the KDMirah Crew will shortly begin our in-flight service, featuring freshly pulled Teh Tarik, chilled mango juice, Bandung rose, and for our Gold guests, the KD Sky Gold Reserve. Today's dining: fragrant Nasi Lemak or a smoky Satay platter. Kindly lower your tray table. Terima kasih.`,
  },
  weather: {
    id: "weather",
    title: "Weather Radar & Seatbelt Advisory",
    short: "Weather",
    accent: "#ff9f5a",
    points: 220,
    satisfaction: 5,
    stability: 1.0,
    text: () =>
      `Ladies and gentlemen, this is your purser. Our weather radar shows light to moderate turbulence ahead over the South China Sea, and the captain has switched on the fasten seatbelt sign. Please return to your seats and keep your seatbelt fastened. Service will resume once we reach smooth air. Thank you.`,
  },
  approach: {
    id: "approach",
    title: "Final Approach & Purser Commendation",
    short: "Approach",
    accent: "#7dffb2",
    points: 300,
    satisfaction: 12,
    stability: 0.4,
    text: () =>
      `Ladies and gentlemen, we have begun our final approach into Kuala Lumpur, where the local time is six fifteen and the weather is a pleasant thirty degrees. On behalf of Captain Rahman and the entire KDMirah Crew, I commend our cabin team for their exceptional service today. Thank you for flying KrackedDSky. Selamat jalan.`,
  },
};

export const PA_ORDER: PaPhase[] = ["welcome", "service", "weather", "approach"];

export interface PaWord {
  text: string;
  start: number; // char index in full text
  end: number;
}

export function splitWords(text: string): PaWord[] {
  const out: PaWord[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

/** Estimated duration (s) for a word in fallback timing mode (~165 wpm with punctuation pauses) */
function wordDuration(w: string): number {
  let d = 0.17 + Math.min(0.42, w.length * 0.036);
  if (/[,;:]$/.test(w)) d += 0.2;
  if (/[.!?]$/.test(w)) d += 0.38;
  return d;
}

export interface PaReader {
  words: PaWord[];
  wordIndex: number; // current highlighted word (-1 before start)
  progress: number; // 0..1
  done: boolean;
  speaking: boolean;
  /** 0..1 mouth-open amplitude for lip-sync */
  mouth: number;
  /** 0..1 onset pulse (decays), useful for head nods */
  pulse: number;
  update: (dt: number) => void;
  stop: () => void;
  setPaused: (p: boolean) => void;
}

/** Pick a pleasant English voice matching crew gender if available */
function pickVoice(female: boolean): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const n = v.name.toLowerCase();
    const l = v.lang.toLowerCase();
    if (l.startsWith("en")) s += 4;
    if (l === "en-gb" || l === "en-au" || l === "en-sg" || l === "en-in") s += 2;
    if (female && /(female|samantha|karen|moira|serena|zira|aria|jenny|sonia|libby|google uk english female|fiona|tessa)/.test(n)) s += 5;
    if (!female && /(male|daniel|david|george|guy|ryan|thomas|google uk english male|alex|fred|rishi)/.test(n)) s += 5;
    if (/natural|neural|premium|enhanced/.test(n)) s += 2;
    if (v.default) s += 1;
    return s;
  };
  return voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * Starts reading a script with the Web Speech API. Word boundary events drive highlighting;
 * if the browser doesn't deliver boundaries (or speech is unavailable) a timed fallback keeps
 * the teleprompter and lip-sync moving in natural cadence.
 */
export function createPaReader(
  text: string,
  female: boolean,
  onDone: () => void,
  onProgress?: () => void
): PaReader {
  const words = splitWords(text);
  const reader: PaReader = {
    words,
    wordIndex: -1,
    progress: 0,
    done: false,
    speaking: false,
    mouth: 0,
    pulse: 0,
    update: () => {},
    stop: () => {},
    setPaused: () => {},
  };
  let paused = false;
  let timer: number | null = null;
  let lastTick = performance.now();

  let usingBoundaries = false;
  let fallbackClock = 0;
  let fallbackNext = 0.35; // initial lead-in after chime
  let finished = false;
  let utter: SpeechSynthesisUtterance | null = null;
  let speechStarted = false;
  let startWait = 0;
  let talkPhase = 0;
  let mouthTarget = 0;
  let wordTimer = 0;
  let wordLen = 0.3;
  let lastBoundaryClock = 0;
  let keepAlive = 0;
  const desktopChrome =
    typeof navigator !== "undefined" && /Chrome\//.test(navigator.userAgent) && !/Mobile|Android/.test(navigator.userAgent);

  const setWord = (i: number) => {
    if (i <= reader.wordIndex || i >= words.length) return;
    reader.wordIndex = i;
    reader.progress = (i + 1) / words.length;
    reader.pulse = 1;
    wordTimer = 0;
    wordLen = wordDuration(words[i].text);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    reader.done = true;
    reader.speaking = false;
    reader.wordIndex = words.length - 1;
    reader.progress = 1;
    onDone();
  };

  const canSpeak = typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
  if (canSpeak) {
    try {
      speechSynthesis.cancel();
      utter = new SpeechSynthesisUtterance(text);
      const v = pickVoice(female);
      if (v) utter.voice = v;
      utter.rate = 1.0;
      utter.pitch = female ? 1.08 : 0.92;
      utter.volume = 1;
      utter.onstart = () => {
        speechStarted = true;
        reader.speaking = true;
      };
      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name && e.name !== "word") return;
        usingBoundaries = true;
        lastBoundaryClock = fallbackClock;
        const ci = e.charIndex ?? 0;
        let idx = words.findIndex((w) => ci >= w.start && ci < w.end);
        if (idx === -1) idx = words.findIndex((w) => w.start >= ci);
        if (idx !== -1) setWord(idx);
      };
      utter.onend = () => finish();
      utter.onerror = () => {
        // fall back to timed cadence silently
        usingBoundaries = false;
        reader.speaking = true;
      };
      // iOS Safari only speaks from within the user gesture; elsewhere let the Hi-Lo chime lead in
      const isIOS = typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent);
      if (isIOS) speechSynthesis.speak(utter);
      else
        setTimeout(() => {
          if (!finished && utter) speechSynthesis.speak(utter);
        }, 650);
    } catch {
      utter = null;
    }
  }

  const step = (dt: number) => {
    if (finished) return;
    fallbackClock += dt;
    startWait += dt;

    // Chrome desktop stops long utterances after ~15s unless nudged
    if (desktopChrome && speechStarted && usingBoundaries) {
      keepAlive += dt;
      if (keepAlive > 8) {
        keepAlive = 0;
        try {
          speechSynthesis.pause();
          speechSynthesis.resume();
        } catch {
          /* ignore */
        }
      }
    }
    // Boundary stream stalled (tab throttled / engine hiccup): continue on timed cadence
    if (usingBoundaries && fallbackClock - lastBoundaryClock > 2.4 && canSpeak && !speechSynthesis.speaking) {
      usingBoundaries = false;
      fallbackNext = fallbackClock;
    }

    // Timed cadence: used when no boundary events arrive (Safari/Firefox or speech blocked)
    const needFallback = !usingBoundaries && (fallbackClock > 1.9 || !canSpeak || !utter);
    if (needFallback) {
      if (!reader.speaking) reader.speaking = true;
      if (fallbackClock >= fallbackNext) {
        const next = reader.wordIndex + 1;
        if (next < words.length) {
          setWord(next);
          fallbackNext = fallbackClock + wordDuration(words[next].text);
        } else {
          // allow last word to breathe, then finish
          if (fallbackClock > fallbackNext + 0.5) {
            if (utter && speechStarted) {
              /* wait for onend */
            } else finish();
          }
        }
      }
    }

    // Safety: if speech never started and no fallback was engaged, finish gracefully after estimate
    const est = words.reduce((a, w) => a + wordDuration(w.text), 0) + 2;
    if (fallbackClock > est * 1.6) finish();

    // Lip-sync envelope: open on word onsets, flutter at syllable rate, close on punctuation pauses
    wordTimer += dt;
    const w = words[Math.max(0, reader.wordIndex)];
    const inWord = reader.wordIndex >= 0 && wordTimer < wordLen * 0.85;
    const syllables = w ? Math.max(1, Math.round(w.text.replace(/[^aeiouy]/gi, "").length * 0.7)) : 1;
    if (inWord && reader.speaking) {
      talkPhase += dt * (6 + syllables * 2.2);
      const flutter = 0.55 + 0.45 * Math.sin(talkPhase * Math.PI);
      const vowelish = w && /[aeiou]{2}|o|a/i.test(w.text) ? 1 : 0.75;
      mouthTarget = (0.35 + 0.65 * flutter) * vowelish;
    } else {
      mouthTarget = 0;
    }
    reader.pulse = Math.max(0, reader.pulse - dt * 3.2);
  };

  // Wall-clock ticker (independent of the render loop) keeps words locked to real speech
  timer = window.setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.25, (now - lastTick) / 1000);
    lastTick = now;
    if (paused || finished) return;
    step(dt);
    onProgress?.();
  }, 50);

  reader.update = (dt: number) => {
    const target = finished || paused ? 0 : mouthTarget;
    reader.mouth += (target - reader.mouth) * Math.min(1, dt * 18);
  };

  reader.setPaused = (p: boolean) => {
    if (paused === p) return;
    paused = p;
    lastTick = performance.now();
    try {
      if (canSpeak && speechStarted) {
        if (p) speechSynthesis.pause();
        else speechSynthesis.resume();
      }
    } catch {
      /* ignore */
    }
  };

  reader.stop = () => {
    if (finished) return;
    finished = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    reader.done = true;
    reader.speaking = false;
    try {
      if (canSpeak) speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  };

  // Warm voices list (Chrome loads asynchronously)
  if (canSpeak && speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = () => {
      if (utter && !speechStarted) {
        const v = pickVoice(female);
        if (v) utter.voice = v;
      }
    };
  }

  return reader;
}
