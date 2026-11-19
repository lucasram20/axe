/**
 * Procedural Web Audio API sound effects manager (retro pixel UI & lab hooks).
 * Zero external or copyrighted audio files. Safe in headless / muted environments.
 */

export type SoundEffect =
  | 'click'
  | 'place'
  | 'invalid'
  | 'sell'
  | 'hire'
  | 'train_start'
  | 'train_complete'
  | 'research'
  | 'cash'
  | 'alert';

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.ctx = new Ctx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.05,
    delay = 0,
    slideTo?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public play(sfx: SoundEffect): void {
    if (this.muted) return;
    switch (sfx) {
      case 'click':
        this.tone(620, 0.045, 'square', 0.03, 0, 740);
        break;
      case 'place':
        this.tone(180, 0.07, 'triangle', 0.08, 0, 110);
        this.tone(420, 0.06, 'square', 0.035, 0.03, 520);
        break;
      case 'invalid':
        this.tone(150, 0.12, 'sawtooth', 0.045, 0, 110);
        break;
      case 'sell':
        this.tone(520, 0.06, 'square', 0.04, 0);
        this.tone(780, 0.09, 'square', 0.04, 0.055);
        break;
      case 'hire':
        this.tone(440, 0.07, 'square', 0.035, 0);
        this.tone(554, 0.07, 'square', 0.035, 0.06);
        this.tone(659, 0.11, 'square', 0.04, 0.12);
        break;
      case 'train_start':
        this.tone(320, 0.08, 'triangle', 0.05, 0, 480);
        this.tone(480, 0.1, 'square', 0.035, 0.07, 640);
        break;
      case 'train_complete':
        this.tone(523, 0.09, 'square', 0.04, 0);
        this.tone(659, 0.09, 'square', 0.04, 0.08);
        this.tone(784, 0.09, 'square', 0.04, 0.16);
        this.tone(1046, 0.22, 'square', 0.045, 0.24);
        break;
      case 'research':
        this.tone(392, 0.08, 'triangle', 0.05, 0);
        this.tone(587, 0.12, 'square', 0.04, 0.07);
        break;
      case 'cash':
        this.tone(880, 0.06, 'square', 0.035, 0);
        this.tone(1174, 0.14, 'square', 0.04, 0.06);
        break;
      case 'alert':
        this.tone(480, 0.09, 'sawtooth', 0.04, 0);
        this.tone(380, 0.12, 'sawtooth', 0.04, 0.1);
        break;
    }
  }
}

export const audioManager = new AudioManager();
