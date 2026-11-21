/**
 * Web Audio API を用いた軽量なボードゲーム効果音マネージャ
 */
export class SoundManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  _ensureContext() {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(type = 'place') {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    switch (type) {
      case 'stone':
      case 'place':
        this._click(ctx, now, 320, 0.06, 0.14);
        break;
      case 'shogi':
        this._click(ctx, now, 480, 0.055, 0.18);
        break;
      case 'tile':
        this._click(ctx, now, 880, 0.045, 0.12);
        break;
      case 'capture':
        this._click(ctx, now, 220, 0.08, 0.18);
        this._click(ctx, now + 0.03, 520, 0.05, 0.10);
        break;
      case 'call':
      case 'riichi':
        this._tone(ctx, now, 587.33, 0.12, 0.12, 'triangle');
        this._tone(ctx, now + 0.08, 880, 0.18, 0.14, 'triangle');
        break;
      case 'win':
        this._tone(ctx, now, 523.25, 0.14, 0.12, 'triangle');
        this._tone(ctx, now + 0.11, 659.25, 0.14, 0.12, 'triangle');
        this._tone(ctx, now + 0.22, 783.99, 0.28, 0.14, 'triangle');
        break;
      case 'lose':
        this._tone(ctx, now, 392, 0.16, 0.11, 'sine');
        this._tone(ctx, now + 0.14, 329.63, 0.26, 0.11, 'sine');
        break;
      default:
        this._click(ctx, now, 360, 0.05, 0.1);
    }
  }

  _click(ctx, time, freq, dur, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.35), time + dur);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
  }

  _tone(ctx, time, freq, dur, volume, type = 'sine') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
  }
}
