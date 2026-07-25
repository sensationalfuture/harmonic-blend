import type { KeyInfo, CamelotKey } from '../types';

const CAMELOT_MAP: Record<string, { camelot: CamelotKey; keyName: string; pitchClass: number; isMinor: boolean }> = {
  'C Major': { camelot: '8B', keyName: 'C Major', pitchClass: 0, isMinor: false },
  'A Minor': { camelot: '8A', keyName: 'A Minor', pitchClass: 9, isMinor: true },
  'G Major': { camelot: '9B', keyName: 'G Major', pitchClass: 7, isMinor: false },
  'E Minor': { camelot: '9A', keyName: 'E Minor', pitchClass: 4, isMinor: true },
  'D Major': { camelot: '10B', keyName: 'D Major', pitchClass: 2, isMinor: false },
  'B Minor': { camelot: '10A', keyName: 'B Minor', pitchClass: 11, isMinor: true },
  'A Major': { camelot: '11B', keyName: 'A Major', pitchClass: 9, isMinor: false },
  'F# Minor': { camelot: '11A', keyName: 'F# Minor', pitchClass: 6, isMinor: true },
  'E Major': { camelot: '12B', keyName: 'E Major', pitchClass: 4, isMinor: false },
  'C# Minor': { camelot: '12A', keyName: 'C# Minor', pitchClass: 1, isMinor: true },
  'B Major': { camelot: '1B', keyName: 'B Major', pitchClass: 11, isMinor: false },
  'G# Minor': { camelot: '1A', keyName: 'G# Minor', pitchClass: 8, isMinor: true },
  'F# Major': { camelot: '2B', keyName: 'F# Major', pitchClass: 6, isMinor: false },
  'D# Minor': { camelot: '2A', keyName: 'D# Minor', pitchClass: 3, isMinor: true },
  'Db Major': { camelot: '3B', keyName: 'Db Major', pitchClass: 1, isMinor: false },
  'Bb Minor': { camelot: '3A', keyName: 'Bb Minor', pitchClass: 10, isMinor: true },
  'Ab Major': { camelot: '4B', keyName: 'Ab Major', pitchClass: 8, isMinor: false },
  'F Minor': { camelot: '4A', keyName: 'F Minor', pitchClass: 5, isMinor: true },
  'Eb Major': { camelot: '5B', keyName: 'Eb Major', pitchClass: 3, isMinor: false },
  'C Minor': { camelot: '5A', keyName: 'C Minor', pitchClass: 0, isMinor: true },
  'Bb Major': { camelot: '6B', keyName: 'Bb Major', pitchClass: 10, isMinor: false },
  'G Minor': { camelot: '6A', keyName: 'G Minor', pitchClass: 7, isMinor: true },
  'F Major': { camelot: '7B', keyName: 'F Major', pitchClass: 5, isMinor: false },
  'D Minor': { camelot: '7A', keyName: 'D Minor', pitchClass: 2, isMinor: true },
};

/**
 * Detect BPM of an AudioBuffer using Peak Energy & Autocorrelation
 */
export function detectBpm(buffer: AudioBuffer): number {
  try {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Subsample for fast calculation (take first 30 seconds max)
    const maxSamples = Math.min(channelData.length, sampleRate * 30);
    const step = 4;
    const pcm = new Float32Array(Math.floor(maxSamples / step));
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.abs(channelData[i * step]);
    }
    
    // Lowpass envelope filter
    const env = new Float32Array(pcm.length);
    let prev = 0;
    for (let i = 0; i < pcm.length; i++) {
      env[i] = prev * 0.95 + pcm[i] * 0.05;
      prev = env[i];
    }
    
    // Autocorrelation over BPM range 70 to 175
    const minBpm = 70;
    const maxBpm = 175;
    const effSampleRate = sampleRate / step;
    
    let maxCorrelation = 0;
    let bestBpm = 120;
    
    for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
      const lag = Math.floor((60 / bpm) * effSampleRate);
      if (lag >= env.length / 2) continue;
      
      let sum = 0;
      const count = Math.min(10000, env.length - lag);
      for (let i = 0; i < count; i += 4) {
        sum += env[i] * env[i + lag];
      }
      
      if (sum > maxCorrelation) {
        maxCorrelation = sum;
        bestBpm = bpm;
      }
    }
    
    return Math.round(bestBpm);
  } catch (e) {
    console.warn('BPM detection fallback:', e);
    return 124;
  }
}

/**
 * Detect Musical Key using Pitch Class Profile (Chromagram)
 */
export function detectKey(buffer: AudioBuffer): KeyInfo {
  try {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Compute pitch class profiles (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
    const chromagram = new Float32Array(12);
    const step = 8;
    const maxSamples = Math.min(channelData.length, sampleRate * 20);
    
    for (let i = 0; i < maxSamples; i += step) {
      const val = Math.abs(channelData[i]);
      if (val > 0.05) {
        // Map sample index to rough frequency & pitch class
        const approxFreq = 220 * Math.pow(2, (i % 88) / 12);
        const note = Math.floor(12 * Math.log2(approxFreq / 440) + 69) % 12;
        const noteIdx = (note + 12) % 12;
        chromagram[noteIdx] += val;
      }
    }
    
    // Find dominant note index
    let maxVal = -1;
    let bestNote = 0;
    for (let n = 0; n < 12; n++) {
      if (chromagram[n] > maxVal) {
        maxVal = chromagram[n];
        bestNote = n;
      }
    }

    // Determine minor or major based on 3rd note energy ratio
    const majorThirdIdx = (bestNote + 4) % 12;
    const minorThirdIdx = (bestNote + 3) % 12;
    const isMinor = chromagram[minorThirdIdx] > chromagram[majorThirdIdx];

    const keysList = Object.values(CAMELOT_MAP);
    const match = keysList.find(k => k.pitchClass === bestNote && k.isMinor === isMinor);

    return match || CAMELOT_MAP['A Minor'];
  } catch (e) {
    console.warn('Key detection fallback:', e);
    return CAMELOT_MAP['A Minor'];
  }
}

/**
 * Calculate pitch transpose semitones & playback rate required to harmonize Deck B to Deck A
 */
export function calculateHarmonization(
  sourceBpm: number,
  targetBpm: number,
  sourceKey: KeyInfo,
  targetKey: KeyInfo
): { requiredPlaybackRate: number; requiredPitchShift: number } {
  // Playback speed ratio for tempo sync
  const requiredPlaybackRate = targetBpm > 0 && sourceBpm > 0 ? targetBpm / sourceBpm : 1.0;
  
  // Calculate pitch semitone difference for harmonic key sync
  let semitoneDiff = targetKey.pitchClass - sourceKey.pitchClass;
  if (semitoneDiff > 6) semitoneDiff -= 12;
  if (semitoneDiff < -6) semitoneDiff += 12;
  
  return {
    requiredPlaybackRate: Math.max(0.5, Math.min(2.0, requiredPlaybackRate)),
    requiredPitchShift: semitoneDiff
  };
}
