import type { TrackMetaData } from '../types';

export const PRESET_TRACKS: TrackMetaData[] = [
  {
    id: 'preset-travis-highest',
    title: 'Travis Scott - HIGHEST IN THE ROOM',
    artist: 'Travis Scott',
    duration: 176,
    bpm: 152,
    key: { keyName: 'C Minor', camelot: '5A', pitchClass: 0, isMinor: true },
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    audioUrl: 'synthetic-trap',
    stemsAvailable: true,
  },
  {
    id: 'preset-cyber-synth',
    title: 'Neon Cyberpunk Dreams (Remix)',
    artist: 'Antigravity Synthwave',
    duration: 120,
    bpm: 124,
    key: { keyName: 'A Minor', camelot: '8A', pitchClass: 9, isMinor: true },
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
    audioUrl: 'synthetic-synthwave',
    stemsAvailable: true,
  },
  {
    id: 'preset-electro-vocal',
    title: 'Harmonic Starlight (Vocal Cut)',
    artist: 'Solaris feat. Maya',
    duration: 110,
    bpm: 128,
    key: { keyName: 'C Major', camelot: '8B', pitchClass: 0, isMinor: false },
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    audioUrl: 'synthetic-vocalpop',
    stemsAvailable: true,
  },
  {
    id: 'preset-hiphop-groove',
    title: 'Midnight Scratching Groove',
    artist: 'DJ Quantum Beats',
    duration: 135,
    bpm: 95,
    key: { keyName: 'E Minor', camelot: '9A', pitchClass: 4, isMinor: true },
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    audioUrl: 'synthetic-hiphop',
    stemsAvailable: true,
  },
];

/**
 * Procedural Audio Generator for high-quality demo stems in Web Audio API.
 * Generates full mix, isolated vocal synth lead, and isolated instrumental beat.
 */
export function generateProceduralStemBuffers(
  ctx: AudioContext,
  presetId: string
): { fullBuffer: AudioBuffer; vocalBuffer: AudioBuffer; instBuffer: AudioBuffer } {
  const sampleRate = ctx.sampleRate;
  const durationSeconds = 30; // 30 second loop
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  const fullBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const vocalBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const instBuffer = ctx.createBuffer(2, totalSamples, sampleRate);

  const fullL = fullBuffer.getChannelData(0);
  const fullR = fullBuffer.getChannelData(1);
  const vocL = vocalBuffer.getChannelData(0);
  const vocR = vocalBuffer.getChannelData(1);
  const instL = instBuffer.getChannelData(0);
  const instR = instBuffer.getChannelData(1);

  const isTrap = presetId.includes('travis') || presetId.includes('highest') || presetId.includes('yt-query');
  const isSynthwave = presetId.includes('synth');
  const isHiphop = presetId.includes('hiphop');
  const bpm = isTrap ? 152 : isHiphop ? 95 : isSynthwave ? 124 : 128;
  const bps = bpm / 60;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentBeat = Math.floor((t * bps) % 16);
    const beatFraction = (t * bps) % 1;

    // --- 1. INSTRUMENTAL STEM (Trap 808 Bass, Snare, Fast Hi-Hats, Melodic Synth) ---
    let kick = 0;
    if (isTrap) {
      // 808 Trap Kick
      if (currentBeat === 0 || currentBeat === 6 || currentBeat === 10) {
        const env = Math.max(0, 1 - beatFraction * 3);
        const freq = 65 * Math.exp(-beatFraction * 12);
        kick = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
      }
    } else if (currentBeat % 4 === 0) {
      const env = Math.max(0, 1 - beatFraction * 4);
      const freq = 130 * Math.exp(-beatFraction * 20);
      kick = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
    }

    // Snare / Clap
    let snare = 0;
    if (currentBeat === 8 || currentBeat % 4 === 2) {
      const env = Math.max(0, 1 - beatFraction * 6);
      const noise = (Math.random() * 2 - 1) * env * 0.4;
      const tone = Math.sin(2 * Math.PI * 220 * t) * env * 0.3;
      snare = noise + tone;
    }

    // Hi-Hats (Fast 16th note rolls for Trap)
    let hihat = 0;
    if (isTrap) {
      const hhEnv = Math.max(0, 1 - ((t * bps * 4) % 1) * 8);
      hihat = (Math.random() * 2 - 1) * hhEnv * 0.12;
    }

    // Bassline (Sub 808)
    const bassNoteFreq = isTrap ? 65.41 : isSynthwave ? 110 : 87.31; // C2 or A2
    const bassEnv = Math.max(0, 1 - beatFraction * 1.5);
    const bass = (Math.sin(2 * Math.PI * bassNoteFreq * t) + 0.4 * Math.sin(2 * Math.PI * bassNoteFreq * 2 * t)) * bassEnv * 0.45;

    // Synth Arpeggio / Guitar Pluck
    const arpNotes = isTrap ? [261.63, 311.13, 392.0, 523.25] : [440, 554.37, 659.25, 880];
    const arpFreq = arpNotes[Math.floor((t * bps * 4) % 4)];
    const arpEnv = Math.max(0, 1 - ((t * bps * 4) % 1) * 4);
    const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.15;

    const instSignal = kick + snare + hihat + bass + arp;

    // --- 2. VOCAL STEM (Melodic Autotune Lead Vox) ---
    const voxMelody = isTrap
      ? [523.25, 466.16, 392.0, 349.23, 392.0, 523.25, 587.33, 523.25]
      : [659.25, 587.33, 523.25, 440, 523.25, 659.25, 783.99, 880];
    const voxFreq = voxMelody[Math.floor((t * bps / 2) % voxMelody.length)];
    const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5 * t);
    
    // Vocal envelope with smooth autotune glide
    const voxEnv = Math.sin(Math.PI * ((t * bps / 2) % 1));
    const voxHarmonic1 = Math.sin(2 * Math.PI * voxFreq * vibrato * t);
    const voxHarmonic2 = 0.5 * Math.sin(2 * Math.PI * voxFreq * 2 * vibrato * t);
    const voxHarmonic3 = 0.25 * Math.sin(2 * Math.PI * voxFreq * 3 * vibrato * t);
    const vocalSignal = (voxHarmonic1 + voxHarmonic2 + voxHarmonic3) * voxEnv * 0.4;

    // Assign to channels
    instL[i] = Math.max(-1, Math.min(1, instSignal));
    instR[i] = Math.max(-1, Math.min(1, instSignal));
    vocL[i] = Math.max(-1, Math.min(1, vocalSignal));
    vocR[i] = Math.max(-1, Math.min(1, vocalSignal));

    // Full mix combination
    fullL[i] = Math.max(-1, Math.min(1, instSignal + vocalSignal));
    fullR[i] = Math.max(-1, Math.min(1, instSignal + vocalSignal));
  }

  return { fullBuffer, vocalBuffer, instBuffer };
}
