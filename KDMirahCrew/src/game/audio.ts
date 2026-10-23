/* AeroTune — procedural WebAudio soundtrack + SFX for AeroCrew Cabin Duty */

class AeroTune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private step = 0; // 8th-note steps, 8 per bar
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;
  musicPlaying = false;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.55;
        this.sfxGain.connect(this.master);
        // noise buffer
        const len = this.ctx.sampleRate * 1.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.stopMusic();
      if (this.ctx) this.ctx.suspend();
    } else if (this.ctx) {
      this.ctx.resume();
    }
  }

  /* ------------------------- music ------------------------- */

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.step = 0;
    const lookahead = () => {
      if (!this.musicPlaying || !this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
        this.scheduleStep(this.step, this.nextNoteTime);
        const spb = 60 / 96; // 96 bpm
        this.nextNoteTime += spb / 2; // 8th notes
        this.step = (this.step + 1) % 64; // 8-bar loop
      }
      this.schedulerId = window.setTimeout(lookahead, 90);
    };
    lookahead();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.schedulerId !== null) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private m2f(m: number) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  private scheduleStep(step: number, t: number) {
    const bar = Math.floor(step / 8) % 4;
    const sub = step % 8;
    // Chords: Am7 FMaj7 CMaj7 G — mellow lounge
    const chords = [
      [57, 60, 64, 67],
      [53, 57, 60, 65],
      [48, 52, 55, 59],
      [55, 59, 62, 66],
    ];
    const chord = chords[bar];
    // Bass on beats 1 and 3 (+pickup)
    if (sub === 0 || sub === 4) {
      this.tone(this.m2f(chord[0] - 24), t, 0.55, "sine", 0.4, this.musicGain!);
    }
    if (sub === 7) this.tone(this.m2f(chord[0] - 12), t, 0.2, "sine", 0.16, this.musicGain!);
    // Pad at bar start
    if (sub === 0) {
      for (const n of chord) this.tone(this.m2f(n), t, 2.3, "triangle", 0.055, this.musicGain!, 0.5);
    }
    // Plucked arpeggio
    const arpPattern = [0, 2, 1, 3, 2, 1, 3, 2];
    if (step % 2 === 0 || Math.floor(step / 16) % 2 === 1) {
      const n = chord[arpPattern[sub]] + 12;
      this.tone(this.m2f(n), t, 0.22, "square", 0.045, this.musicGain!, 0.01, 1800);
    }
    // Hat
    this.noise(t, 0.035, sub % 4 === 2 ? 0.08 : 0.04, 7000, this.musicGain!);
  }

  /* ------------------------- helpers ------------------------- */

  private tone(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    dest: AudioNode,
    attack = 0.015,
    lpf = 0
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lpf > 0) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lpf;
      o.connect(f);
      f.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(t: number, dur: number, vol: number, hpf: number, dest: AudioNode, lpf = 0) {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = s;
    if (hpf > 0) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hpf;
      node.connect(f);
      node = f;
    }
    if (lpf > 0) {
      const f2 = ctx.createBiquadFilter();
      f2.type = "lowpass";
      f2.frequency.value = lpf;
      node.connect(f2);
      node = f2;
    }
    node.connect(g);
    g.connect(dest);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  /* ------------------------- sfx ------------------------- */

  click() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(660, ctx.currentTime, 0.08, "square", 0.12, this.sfxGain!, 0.005, 2200);
  }

  perfect() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(1318.5, t, 0.16, "sine", 0.3, this.sfxGain!);
    this.tone(1760, t + 0.07, 0.22, "sine", 0.28, this.sfxGain!);
    this.tone(2637, t + 0.14, 0.3, "sine", 0.18, this.sfxGain!);
    this.noise(t + 0.02, 0.12, 0.1, 6000, this.sfxGain!);
  }

  good() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(1046.5, t, 0.14, "sine", 0.26, this.sfxGain!);
    this.tone(1568, t + 0.06, 0.16, "sine", 0.16, this.sfxGain!);
  }

  spill() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noise(t, 0.35, 0.35, 300, this.sfxGain!, 2400);
    this.tone(160, t, 0.25, "sawtooth", 0.18, this.sfxGain!, 0.005, 500);
    this.tone(110, t + 0.08, 0.3, "triangle", 0.2, this.sfxGain!);
  }

  warn() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(880, t, 0.14, "square", 0.1, this.sfxGain!, 0.01, 1800);
    this.tone(880, t + 0.22, 0.14, "square", 0.1, this.sfxGain!, 0.01, 1800);
  }

  rumble(dur = 2.5) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noise(t, dur, 0.3, 0, this.sfxGain!, 220);
    this.tone(48, t, dur, "sine", 0.22, this.sfxGain!, 0.3);
  }

  fanfare() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 784, 1046.5];
    notes.forEach((f, i) => {
      this.tone(f, t + i * 0.13, 0.4, "triangle", 0.26, this.sfxGain!);
      this.tone(f * 2, t + i * 0.13, 0.3, "sine", 0.1, this.sfxGain!);
    });
    this.noise(t + 0.5, 0.5, 0.12, 5000, this.sfxGain!);
  }

  lose() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((f, i) => this.tone(f, t + i * 0.18, 0.4, "triangle", 0.22, this.sfxGain!));
  }

  chime() {
    // cabin "bing-bong"
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(987.77, t, 0.5, "sine", 0.22, this.sfxGain!);
    this.tone(783.99, t + 0.3, 0.7, "sine", 0.2, this.sfxGain!);
  }

  load() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(523.25, t, 0.08, "square", 0.14, this.sfxGain!, 0.004, 2600);
    this.tone(784, t + 0.045, 0.1, "square", 0.12, this.sfxGain!, 0.004, 2600);
  }

  denied() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(160, t, 0.12, "square", 0.14, this.sfxGain!, 0.004, 900);
    this.tone(120, t + 0.08, 0.14, "square", 0.12, this.sfxGain!, 0.004, 900);
  }

  tip() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(700, t, 0.1, "square", 0.14, this.sfxGain!, 0.002, 2000);
    this.tone(700, t + 0.13, 0.1, "square", 0.14, this.sfxGain!, 0.002, 2000);
    this.tone(700, t + 0.26, 0.12, "square", 0.14, this.sfxGain!, 0.002, 2000);
  }

  steal() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(700, t, 0.12, "sawtooth", 0.16, this.sfxGain!, 0.004, 1600);
    this.tone(500, t + 0.08, 0.12, "sawtooth", 0.14, this.sfxGain!, 0.004, 1400);
    this.tone(330, t + 0.16, 0.18, "sawtooth", 0.14, this.sfxGain!, 0.004, 1000);
  }

  tick() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(1800, ctx.currentTime, 0.03, "square", 0.05, this.sfxGain!, 0.001, 4000);
  }

  footstep() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.noise(ctx.currentTime, 0.04, 0.04, 600, this.sfxGain!, 1600);
  }

  salam() {
    // Warm pentatonic gamelan chime
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, i) => {
      this.tone(f, t + i * 0.06, 0.55, "sine", 0.16, this.sfxGain!, 0.01);
      this.tone(f * 2, t + i * 0.06, 0.3, "triangle", 0.05, this.sfxGain!, 0.01);
    });
  }

  levelUp() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
      this.tone(f, t + i * 0.08, 0.45, "sine", 0.22, this.sfxGain!, 0.008);
    });
  }

  /** Authentic dual-tone PA "Hi-Lo" cabin chime (high ding, low dong with soft bell overtones) */
  hiLo() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const bell = (f: number, at: number, vol: number) => {
      this.tone(f, at, 1.35, "sine", vol, this.sfxGain!, 0.006);
      this.tone(f * 2.0, at, 0.7, "sine", vol * 0.28, this.sfxGain!, 0.004);
      this.tone(f * 2.76, at, 0.42, "sine", vol * 0.12, this.sfxGain!, 0.003);
    };
    bell(1046.5, t, 0.3); // Hi  (C6)
    bell(783.99, t + 0.42, 0.3); // Lo  (G5)
  }

  /** Single soft tone marking the end of a PA announcement */
  paEnd() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(783.99, t, 1.1, "sine", 0.24, this.sfxGain!, 0.006);
    this.tone(1567.98, t, 0.5, "sine", 0.06, this.sfxGain!, 0.004);
  }

  /** Handset lift / cradle click */
  handset() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noise(t, 0.04, 0.12, 1800, this.sfxGain!, 6000);
    this.tone(320, t, 0.05, "square", 0.05, this.sfxGain!, 0.002, 1200);
  }
}

export const audio = new AeroTune();
