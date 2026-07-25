import type { DeckState, MixerState, TrackMetaData } from '../types';
import { generateProceduralStemBuffers } from './PresetTracks';
import { processAudioBufferStems } from './StemProcessor';
import { detectBpm, detectKey } from './BpmKeyAnalyzer';

type AudioListener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private listeners: Set<AudioListener> = new Set();

  // Deck Audio Node Chains
  private sourceA: AudioBufferSourceNode | null = null;
  private sourceB: AudioBufferSourceNode | null = null;

  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;

  // EQ Nodes Deck A
  private eqLowA: BiquadFilterNode | null = null;
  private eqMidA: BiquadFilterNode | null = null;
  private eqHighA: BiquadFilterNode | null = null;
  private filterA: BiquadFilterNode | null = null;

  // EQ Nodes Deck B
  private eqLowB: BiquadFilterNode | null = null;
  private eqMidB: BiquadFilterNode | null = null;
  private eqHighB: BiquadFilterNode | null = null;
  private filterB: BiquadFilterNode | null = null;

  // FX Nodes
  private masterGainNode: GainNode | null = null;
  private delayNode: DelayNode | null = null;

  // Playback Timing state
  private startTimeA: number = 0;
  private startOffsetA: number = 0;
  private startTimeB: number = 0;
  private startOffsetB: number = 0;

  // Initial State
  public deckA: DeckState = {
    id: 'A',
    track: null,
    audioBuffer: null,
    vocalBuffer: null,
    instBuffer: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    pitch: 0,
    playbackRate: 1.0,
    cuePoint: 0,
    isLooping: false,
    loopLength: 4,
    stemMode: 'full',
    vocalVolume: 1.0,
    instVolume: 1.0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterSweep: 0,
    isScratching: false,
    scratchVelocity: 0,
  };

  public deckB: DeckState = {
    id: 'B',
    track: null,
    audioBuffer: null,
    vocalBuffer: null,
    instBuffer: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    pitch: 0,
    playbackRate: 1.0,
    cuePoint: 0,
    isLooping: false,
    loopLength: 4,
    stemMode: 'full',
    vocalVolume: 1.0,
    instVolume: 1.0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterSweep: 0,
    isScratching: false,
    scratchVelocity: 0,
  };

  public mixer: MixerState = {
    crossfader: 0,
    crossfaderCurve: 'smooth',
    masterVolume: 0.9,
    reverbSend: 0.1,
    delaySend: 0,
    snapToHarmonize: false,
    masterTargetBpm: 124,
    masterTargetKey: null,
  };

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Create Master Gain & FX
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = this.mixer.masterVolume;
      this.masterGainNode.connect(this.ctx.destination);

      // Delay Node
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.35;

      this.startClock();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private startClock = () => {
    const updateTime = () => {
      if (this.ctx) {
        if (this.deckA.isPlaying && this.deckA.audioBuffer) {
          const elapsed = (this.ctx.currentTime - this.startTimeA) * (this.deckA.playbackRate * Math.pow(2, this.deckA.pitch / 12));
          this.deckA.currentTime = (this.startOffsetA + elapsed) % this.deckA.duration;
        }
        if (this.deckB.isPlaying && this.deckB.audioBuffer) {
          const elapsed = (this.ctx.currentTime - this.startTimeB) * (this.deckB.playbackRate * Math.pow(2, this.deckB.pitch / 12));
          this.deckB.currentTime = (this.startOffsetB + elapsed) % this.deckB.duration;
        }
        this.notify();
      }
      requestAnimationFrame(updateTime);
    };
    updateTime();
  };

  /**
   * Fetch real audio stream from an HTTP/HTTPS URL and decode to AudioBuffer
   */
  public async fetchAudioBufferFromUrl(url: string): Promise<AudioBuffer> {
    this.initContext();
    if (!this.ctx) throw new Error('AudioContext not initialized');

    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch {
      // Fallback via CORS proxy if direct fetch failed
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      const arrayBuffer = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    }
  }

  /**
   * Load Track into Deck A or Deck B (Supports custom ArrayBuffer, audioUrl HTTP stream, or procedural fallback)
   */
  public async loadTrack(deckId: 'A' | 'B', track: TrackMetaData, customArrayBuffer?: ArrayBuffer) {
    this.initContext();
    if (!this.ctx) return;

    const deck = deckId === 'A' ? this.deckA : this.deckB;
    this.stopDeck(deckId);

    deck.track = track;
    deck.currentTime = 0;

    let fullBuf: AudioBuffer;
    let vocBuf: AudioBuffer;
    let instBuf: AudioBuffer;

    if (customArrayBuffer) {
      // Direct local file upload
      fullBuf = await this.ctx.decodeAudioData(customArrayBuffer);
      const stems = processAudioBufferStems(this.ctx, fullBuf);
      vocBuf = stems.vocalBuffer;
      instBuf = stems.instBuffer;

      deck.track.bpm = detectBpm(fullBuf);
      deck.track.key = detectKey(fullBuf);
    } else if (track.audioUrl && track.audioUrl.startsWith('http')) {
      // Real Audio Stream URL from Music Search / Spotify / iTunes / HTTP API!
      try {
        fullBuf = await this.fetchAudioBufferFromUrl(track.audioUrl);
        const stems = processAudioBufferStems(this.ctx, fullBuf);
        vocBuf = stems.vocalBuffer;
        instBuf = stems.instBuffer;

        // Auto-detect real BPM and Key from the actual audio recording!
        deck.track.bpm = detectBpm(fullBuf);
        deck.track.key = detectKey(fullBuf);
      } catch (e) {
        console.warn('Failed fetching HTTP audio URL, falling back to procedural buffer:', e);
        const stems = generateProceduralStemBuffers(this.ctx, track.id);
        fullBuf = stems.fullBuffer;
        vocBuf = stems.vocalBuffer;
        instBuf = stems.instBuffer;
      }
    } else {
      // Procedural fallback
      const stems = generateProceduralStemBuffers(this.ctx, track.id);
      fullBuf = stems.fullBuffer;
      vocBuf = stems.vocalBuffer;
      instBuf = stems.instBuffer;
    }

    deck.audioBuffer = fullBuf;
    deck.vocalBuffer = vocBuf;
    deck.instBuffer = instBuf;
    deck.duration = fullBuf.duration;

    // Set Master Target if first deck
    if (!this.mixer.masterTargetKey) {
      this.mixer.masterTargetBpm = track.bpm;
      this.mixer.masterTargetKey = track.key;
    }

    this.updateAudioNodes(deckId);
    this.notify();
  }

  /**
   * Play / Pause Deck
   */
  public togglePlay(deckId: 'A' | 'B') {
    this.initContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;

    if (!deck.audioBuffer) return;

    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    } else {
      this.playDeck(deckId);
    }
  }

  private playDeck(deckId: 'A' | 'B') {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.audioBuffer) return;

    this.stopSource(deckId);

    // Pick active stem buffer
    let bufferToPlay = deck.audioBuffer;
    if (deck.stemMode === 'vocals_only' && deck.vocalBuffer) {
      bufferToPlay = deck.vocalBuffer;
    } else if (deck.stemMode === 'inst_only' && deck.instBuffer) {
      bufferToPlay = deck.instBuffer;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = bufferToPlay;
    source.loop = deck.isLooping;

    // Pitch & Speed calculation
    const speedRatio = deck.playbackRate * Math.pow(2, deck.pitch / 12);
    source.playbackRate.value = speedRatio;

    // Connect node chain
    const chain = this.buildDeckNodeChain(deckId);
    source.connect(chain);

    this.startOffsetA = deckId === 'A' ? deck.currentTime : this.startOffsetA;
    this.startOffsetB = deckId === 'B' ? deck.currentTime : this.startOffsetB;

    if (deckId === 'A') {
      this.startTimeA = this.ctx.currentTime;
      this.sourceA = source;
    } else {
      this.startTimeB = this.ctx.currentTime;
      this.sourceB = source;
    }

    source.start(0, deck.currentTime);
    deck.isPlaying = true;
    this.notify();
  }

  private pauseDeck(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    this.stopSource(deckId);
    deck.isPlaying = false;
    this.notify();
  }

  private stopDeck(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    this.stopSource(deckId);
    deck.isPlaying = false;
    deck.currentTime = 0;
    this.notify();
  }

  private stopSource(deckId: 'A' | 'B') {
    if (deckId === 'A' && this.sourceA) {
      try {
        this.sourceA.stop();
        this.sourceA.disconnect();
      } catch {
        // Safe catch if already stopped
      }
      this.sourceA = null;
    } else if (deckId === 'B' && this.sourceB) {
      try {
        this.sourceB.stop();
        this.sourceB.disconnect();
      } catch {
        // Safe catch if already stopped
      }
      this.sourceB = null;
    }
  }

  private buildDeckNodeChain(deckId: 'A' | 'B'): AudioNode {
    if (!this.ctx || !this.masterGainNode) throw new Error('AudioContext not ready');

    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const isA = deckId === 'A';

    // Deck Gain
    const gainNode = this.ctx.createGain();
    if (isA) this.gainA = gainNode;
    else this.gainB = gainNode;

    // Crossfader Volume
    const x = this.mixer.crossfader;
    let crossfaderGain = 1.0;
    if (isA) {
      crossfaderGain = Math.cos(((x + 1) * Math.PI) / 4);
    } else {
      crossfaderGain = Math.sin(((x + 1) * Math.PI) / 4);
    }
    gainNode.gain.value = deck.volume * crossfaderGain;

    // EQs
    const lowEq = this.ctx.createBiquadFilter();
    lowEq.type = 'lowshelf';
    lowEq.frequency.value = 320;
    lowEq.gain.value = deck.eqLow;

    const midEq = this.ctx.createBiquadFilter();
    midEq.type = 'peaking';
    midEq.frequency.value = 1000;
    midEq.gain.value = deck.eqMid;

    const highEq = this.ctx.createBiquadFilter();
    highEq.type = 'highshelf';
    highEq.frequency.value = 3200;
    highEq.gain.value = deck.eqHigh;

    // Filter Sweep
    const filter = this.ctx.createBiquadFilter();
    if (deck.filterSweep < 0) {
      filter.type = 'lowpass';
      filter.frequency.value = 200 + (1 + deck.filterSweep) * 18000;
    } else if (deck.filterSweep > 0) {
      filter.type = 'highpass';
      filter.frequency.value = deck.filterSweep * 8000;
    } else {
      filter.type = 'allpass';
    }

    if (isA) {
      this.eqLowA = lowEq;
      this.eqMidA = midEq;
      this.eqHighA = highEq;
      this.filterA = filter;
    } else {
      this.eqLowB = lowEq;
      this.eqMidB = midEq;
      this.eqHighB = highEq;
      this.filterB = filter;
    }

    // Connect node chain: Low -> Mid -> High -> Filter -> Gain -> Master
    lowEq.connect(midEq);
    midEq.connect(highEq);
    highEq.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    return lowEq;
  }

  public updateAudioNodes(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const isA = deckId === 'A';

    const gainNode = isA ? this.gainA : this.gainB;
    const lowEq = isA ? this.eqLowA : this.eqLowB;
    const midEq = isA ? this.eqMidA : this.eqMidB;
    const highEq = isA ? this.eqHighA : this.eqHighB;
    const filter = isA ? this.filterA : this.filterB;

    if (gainNode) {
      const x = this.mixer.crossfader;
      const crossfaderGain = isA ? Math.cos(((x + 1) * Math.PI) / 4) : Math.sin(((x + 1) * Math.PI) / 4);
      gainNode.gain.value = deck.volume * crossfaderGain;
    }

    if (lowEq) lowEq.gain.value = deck.eqLow;
    if (midEq) midEq.gain.value = deck.eqMid;
    if (highEq) highEq.gain.value = deck.eqHigh;

    if (filter) {
      if (deck.filterSweep < 0) {
        filter.type = 'lowpass';
        filter.frequency.value = 200 + (1 + deck.filterSweep) * 18000;
      } else if (deck.filterSweep > 0) {
        filter.type = 'highpass';
        filter.frequency.value = deck.filterSweep * 8000;
      } else {
        filter.type = 'allpass';
      }
    }

    // Update playback rate if active
    const source = isA ? this.sourceA : this.sourceB;
    if (source) {
      const speedRatio = deck.playbackRate * Math.pow(2, deck.pitch / 12);
      source.playbackRate.setValueAtTime(speedRatio, this.ctx?.currentTime || 0);
    }

    this.notify();
  }

  /**
   * Scratch / Scrub timeline physics
   */
  public scrubTime(deckId: 'A' | 'B', targetTime: number) {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.audioBuffer) return;

    deck.currentTime = Math.max(0, Math.min(deck.duration, targetTime));
    if (deck.isPlaying) {
      this.playDeck(deckId);
    }
    this.notify();
  }

  /**
   * Set Cue Point
   */
  public setCue(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.cuePoint = deck.currentTime;
    this.notify();
  }

  /**
   * Jump to Cue Point
   */
  public jumpCue(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    this.scrubTime(deckId, deck.cuePoint);
  }

  /**
   * Harmonize Deck B to Deck A automatically
   */
  public harmonizeDeckB() {
    if (!this.deckA.track || !this.deckB.track) return;

    const rateA = this.deckA.playbackRate;
    const targetBpm = this.deckA.track.bpm * rateA;

    // Calculate tempo stretch
    const reqRate = targetBpm / this.deckB.track.bpm;
    this.deckB.playbackRate = Math.max(0.5, Math.min(2.0, reqRate));

    // Calculate key shift semitones
    let semitoneDiff = this.deckA.track.key.pitchClass - this.deckB.track.key.pitchClass;
    if (semitoneDiff > 6) semitoneDiff -= 12;
    if (semitoneDiff < -6) semitoneDiff += 12;

    this.deckB.pitch = semitoneDiff;
    this.updateAudioNodes('B');
    this.notify();
  }
}

export const audioEngine = new AudioEngine();
