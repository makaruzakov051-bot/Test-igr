// Simple procedural audio system using Web Audio API
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }
  
  private ensureContext() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
  
  playGunshot(caliber: string) {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    // Different sounds per caliber
    const configs: Record<string, { freq: number; duration: number; noise: number }> = {
      '9x19': { freq: 180, duration: 0.08, noise: 0.4 },
      '7.62x25': { freq: 200, duration: 0.07, noise: 0.35 },
      '.45 ACP': { freq: 120, duration: 0.12, noise: 0.5 },
      '.50 AE': { freq: 80, duration: 0.15, noise: 0.7 },
      '5.45x39': { freq: 250, duration: 0.06, noise: 0.5 },
      '7.62x39': { freq: 180, duration: 0.1, noise: 0.6 },
      '5.56x45': { freq: 280, duration: 0.05, noise: 0.5 },
      '12ga': { freq: 60, duration: 0.2, noise: 0.9 },
      '7.62x54R': { freq: 150, duration: 0.15, noise: 0.7 },
      '.338 Lapua': { freq: 100, duration: 0.2, noise: 0.8 },
      '.50 BMG': { freq: 50, duration: 0.3, noise: 1.0 },
    };
    
    const config = configs[caliber] || configs['9x19'];
    
    // Noise burst (the "crack")
    const bufferSize = this.ctx.sampleRate * config.duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(config.noise, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 3000;
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + config.duration);
    
    // Low thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(config.freq, now);
    osc.frequency.exponentialRampToValueAtTime(config.freq * 0.3, now + config.duration);
    
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration * 0.8);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + config.duration);
  }
  
  playHit() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    // Meaty thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }
  
  playHeadshot() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    // Sharp crack
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }
  
  playReload() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    // Metallic click
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }
  
  playFootstep() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3)) * 0.3;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.05);
  }
  
  playAmbient() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    // Low drone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 40;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0.02;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    
    return { osc, gain };
  }
  
  playEnemyDeath() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const now = this.ctx.currentTime;
    
    // Gurgling sound
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const audioSystem = new AudioSystem();
