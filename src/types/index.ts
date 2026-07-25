export type CamelotKey = 
  | '1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4A' | '4B'
  | '5A' | '5B' | '6A' | '6B' | '7A' | '7B' | '8A' | '8B'
  | '9A' | '9B' | '10A' | '10B' | '11A' | '11B' | '12A' | '12B';

export interface KeyInfo {
  keyName: string; // e.g. "A minor"
  camelot: CamelotKey; // e.g. "8A"
  pitchClass: number; // 0-11
  isMinor: boolean;
}

export interface TrackMetaData {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  bpm: number;
  key: KeyInfo;
  thumbnailUrl: string;
  audioUrl: string;
  isYoutube?: boolean;
  youtubeId?: string;
  stemsAvailable?: boolean;
}

export type StemType = 'full' | 'vocals' | 'instrumental' | 'drums' | 'bass';

export interface DeckState {
  id: 'A' | 'B';
  track: TrackMetaData | null;
  audioBuffer: AudioBuffer | null;
  vocalBuffer: AudioBuffer | null;
  instBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  pitch: number; // pitch shift semitones (-12 to +12)
  playbackRate: number; // speed multiplier (0.5 to 2.0)
  cuePoint: number;
  isLooping: boolean;
  loopLength: number; // in beats or seconds
  
  // Stem Isolator Toggles
  stemMode: 'full' | 'vocals_only' | 'inst_only' | 'custom_mix';
  vocalVolume: number;
  instVolume: number;
  
  // 3-Band EQ (-12dB to +12dB)
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  
  // Filter sweep (-1.0 to 1.0) where <0 is Lowpass, >0 is Highpass
  filterSweep: number;
  
  // Scratching / Touch physics state
  isScratching: boolean;
  scratchVelocity: number;
}

export interface MixerState {
  crossfader: number; // -1 (Deck A) to 1 (Deck B)
  crossfaderCurve: 'linear' | 'smooth' | 'scratch';
  masterVolume: number; // 0 to 1
  
  // FX Sends
  reverbSend: number; // 0 to 1
  delaySend: number;  // 0 to 1
  
  // Master Harmonizer Toggle
  snapToHarmonize: boolean;
  masterTargetBpm: number;
  masterTargetKey: KeyInfo | null;
}

export interface YoutubeResult {
  id: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnailUrl: string;
}
