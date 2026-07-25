import type { DeckState, MixerState, TrackMetaData } from '../types';
import { processAudioBufferStems } from './StemProcessor';
import { detectBpm, detectKey } from './BpmKeyAnalyzer';

type AudioListener = () => void;

const BACKEND = 'http://127.0.0.1:5000';

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

  // Stem cache: videoId -> { vocals: AudioBuffer, inst: AudioBuffer }
  private stemCache: Map<string, { vocals: AudioBuffer; inst: AudioBuffer }> = new Map();

  // Initial State — both decks start EMPTY
  public deckA: DeckState = {
    id: 'A',
    track: null,
    audioBuffer: null,
    vocalBuffer: null,
    instBuffer: null,
    isPlaying: false,
    isLoading: false,
    loadingStep: '',
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    pitch: 0,
    playbackRate: 1.0,
    cuePoint: 0,
    isLooping: false,
    loopLength: 4,
    stemMode: 'full',
    stemSeparating: false,
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
    isLoading: false,
    loadingStep: '',
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    pitch: 0,
    playbackRate: 1.0,
    cuePoint: 0,
    isLooping: false,
    loopLength: 4,
    stemMode: 'full',
    stemSeparating: false,
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
          const rate = this.deckA.playbackRate * Math.pow(2, this.deckA.pitch / 12);
          const elapsed = (this.ctx.currentTime - this.startTimeA) * rate;
          this.deckA.currentTime = Math.min((this.startOffsetA + elapsed), this.deckA.duration);
        }
        if (this.deckB.isPlaying && this.deckB.audioBuffer) {
          const rate = this.deckB.playbackRate * Math.pow(2, this.deckB.pitch / 12);
          const elapsed = (this.ctx.currentTime - this.startTimeB) * rate;
          this.deckB.currentTime = Math.min((this.startOffsetB + elapsed), this.deckB.duration);
        }
        this.notify();
      }
      requestAnimationFrame(updateTime);
    };
    updateTime();
  };

  /**
   * Fetch real audio stream from backend (fully downloads before decoding)
   */
  public async fetchAudioBufferFromUrl(url: string): Promise<AudioBuffer> {
    this.initContext();
    if (!this.ctx) throw new Error('AudioContext not initialized');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('Empty audio response from server');
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  /**
   * Fetch real BPM and Key from backend librosa analysis
   */
  private async fetchAnalysis(videoId: string): Promise<{ bpm: number; keyName: string; camelot: string; pitchClass: number; isMinor: boolean } | null> {
    try {
      const res = await fetch(`${BACKEND}/api/analyze?id=${encodeURIComponent(videoId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Load Track into Deck A or Deck B — stops old playback immediately, shows loading state
   */
  public async loadTrack(deckId: 'A' | 'B', track: TrackMetaData, customArrayBuffer?: ArrayBuffer) {
    this.initContext();
    if (!this.ctx) return;

    const deck = deckId === 'A' ? this.deckA : this.deckB;

    // Stop old playback immediately so stale audio never plays
    this.stopDeck(deckId);

    // Clear old buffers immediately — deck shows loading state, not old audio
    deck.track = null;
    deck.audioBuffer = null;
    deck.vocalBuffer = null;
    deck.instBuffer = null;
    deck.duration = 0;
    deck.currentTime = 0;
    deck.isLoading = true;
    deck.loadingStep = '⏬ Downloading audio...';
    this.notify();

    try {
      let fullBuf: AudioBuffer;

      if (customArrayBuffer) {
        // Direct local file upload
        deck.loadingStep = '🎵 Decoding audio file...';
        this.notify();
        fullBuf = await this.ctx.decodeAudioData(customArrayBuffer);
        deck.loadingStep = '🔍 Analyzing BPM & Key...';
        this.notify();
        const stems = processAudioBufferStems(this.ctx, fullBuf);
        track.bpm = detectBpm(fullBuf);
        track.key = detectKey(fullBuf);

        // Commit everything at once
        deck.track = track;
        deck.audioBuffer = fullBuf;
        deck.vocalBuffer = stems.vocalBuffer;
        deck.instBuffer = stems.instBuffer;
        deck.duration = fullBuf.duration;

      } else if (track.audioUrl && track.audioUrl.startsWith('http')) {
        // Real Audio Stream URL from YouTube via backend
        deck.loadingStep = '⏬ Downloading from YouTube...';
        this.notify();

        fullBuf = await this.fetchAudioBufferFromUrl(track.audioUrl);

        deck.loadingStep = '🔍 Analyzing BPM & Key...';
        this.notify();

        // Try backend librosa analysis first (accurate), fall back to client-side
        if (track.youtubeId) {
          const analysis = await this.fetchAnalysis(track.youtubeId);
          if (analysis) {
            track.bpm = Math.round(analysis.bpm);
            track.key = {
              keyName: analysis.keyName,
              camelot: analysis.camelot as import('../types').CamelotKey,
              pitchClass: analysis.pitchClass,
              isMinor: analysis.isMinor,
            };
          } else {
            // Client-side fallback
            track.bpm = detectBpm(fullBuf);
            track.key = detectKey(fullBuf);
          }
        } else {
          track.bpm = detectBpm(fullBuf);
          track.key = detectKey(fullBuf);
        }

        deck.loadingStep = '✅ Ready to play!';
        this.notify();

        // Commit all at once — no partial state
        deck.track = track;
        deck.audioBuffer = fullBuf;
        deck.vocalBuffer = null; // Will be loaded on demand via backend Demucs
        deck.instBuffer = null;
        deck.duration = fullBuf.duration;

      } else {
        throw new Error('No valid audio source provided');
      }

      // Set Master Target if this is the first deck loaded
      if (!this.mixer.masterTargetKey) {
        this.mixer.masterTargetBpm = track.bpm;
        this.mixer.masterTargetKey = track.key;
      }

    } catch (e) {
      console.error('Track load failed:', e);
      deck.track = null;
      deck.audioBuffer = null;
      deck.loadingStep = `❌ Load failed: ${(e as Error).message}`;
      this.notify();
      await new Promise(r => setTimeout(r, 2500));
    } finally {
      deck.isLoading = false;
      deck.loadingStep = '';
      this.notify();
    }

    this.updateAudioNodes(deckId);
    this.notify();
  }

  /**
   * Request AI stem separation from Demucs backend
   * Returns true on success
   */
  public async separateStems(deckId: 'A' | 'B'): Promise<boolean> {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.track || !deck.track.youtubeId || !this.ctx) return false;

    const cacheKey = deck.track.youtubeId;
    if (this.stemCache.has(cacheKey)) {
      const cached = this.stemCache.get(cacheKey)!;
      deck.vocalBuffer = cached.vocals;
      deck.instBuffer = cached.inst;
      this.notify();
      return true;
    }

    deck.stemSeparating = true;
    this.notify();

    try {
      const [vocRes, instRes] = await Promise.all([
        fetch(`${BACKEND}/api/stem?id=${encodeURIComponent(cacheKey)}&stem=vocals`),
        fetch(`${BACKEND}/api/stem?id=${encodeURIComponent(cacheKey)}&stem=instrumental`),
      ]);

      if (!vocRes.ok || !instRes.ok) throw new Error('Stem separation failed on server');

      const [vocBuf, instBuf] = await Promise.all([
        this.ctx.decodeAudioData(await vocRes.arrayBuffer()),
        this.ctx.decodeAudioData(await instRes.arrayBuffer()),
      ]);

      this.stemCache.set(cacheKey, { vocals: vocBuf, inst: instBuf });
      deck.vocalBuffer = vocBuf;
      deck.instBuffer = instBuf;
      deck.stemSeparating = false;
      this.notify();
      return true;
    } catch (e) {
      console.error('Stem separation error:', e);
      // Fall back to client-side DSP stem separation
      if (deck.audioBuffer) {
        const stems = processAudioBufferStems(this.ctx, deck.audioBuffer);
        deck.vocalBuffer = stems.vocalBuffer;
        deck.instBuffer = stems.instBuffer;
      }
      deck.stemSeparating = false;
      this.notify();
      return false;
    }
  }

  /**
   * Play / Pause Deck
   */
  public togglePlay(deckId: 'A' | 'B') {
    this.initContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;

    if (!deck.audioBuffer || deck.isLoading) return;

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

    // Pitch & Speed — combined into playbackRate
    const speedRatio = deck.playbackRate * Math.pow(2, deck.pitch / 12);
    source.playbackRate.value = speedRatio;

    // Connect node chain
    const chain = this.buildDeckNodeChain(deckId);
    source.connect(chain);

    if (deckId === 'A') {
      this.startOffsetA = deck.currentTime;
      this.startTimeA = this.ctx.currentTime;
      this.sourceA = source;
    } else {
      this.startOffsetB = deck.currentTime;
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
      try { this.sourceA.stop(); this.sourceA.disconnect(); } catch { /* already stopped */ }
      this.sourceA = null;
    } else if (deckId === 'B' && this.sourceB) {
      try { this.sourceB.stop(); this.sourceB.disconnect(); } catch { /* already stopped */ }
      this.sourceB = null;
    }
  }

  private buildDeckNodeChain(deckId: 'A' | 'B'): AudioNode {
    if (!this.ctx || !this.masterGainNode) throw new Error('AudioContext not ready');

    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const isA = deckId === 'A';

    // Deck Gain with crossfader
    const gainNode = this.ctx.createGain();
    if (isA) this.gainA = gainNode;
    else this.gainB = gainNode;

    const x = this.mixer.crossfader;
    const crossfaderGain = isA
      ? Math.cos(((x + 1) * Math.PI) / 4)
      : Math.sin(((x + 1) * Math.PI) / 4);
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
      this.eqLowA = lowEq; this.eqMidA = midEq; this.eqHighA = highEq; this.filterA = filter;
    } else {
      this.eqLowB = lowEq; this.eqMidB = midEq; this.eqHighB = highEq; this.filterB = filter;
    }

    // Chain: Low → Mid → High → Filter → Gain → Master
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

    // Update playback rate on active source in real-time
    const source = isA ? this.sourceA : this.sourceB;
    if (source && this.ctx) {
      const speedRatio = deck.playbackRate * Math.pow(2, deck.pitch / 12);
      source.playbackRate.setValueAtTime(speedRatio, this.ctx.currentTime);
    }

    this.notify();
  }

  /**
   * Set Tempo (playback speed) without restarting
   */
  public setTempo(deckId: 'A' | 'B', rate: number) {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    this.updateAudioNodes(deckId);
  }

  /**
   * Set Pitch shift in semitones without restarting
   */
  public setPitch(deckId: 'A' | 'B', semitones: number) {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.pitch = Math.max(-12, Math.min(12, semitones));
    this.updateAudioNodes(deckId);
  }

  /**
   * Set Stem Mode and trigger backend separation if needed
   */
  public async setStemMode(deckId: 'A' | 'B', mode: 'full' | 'vocals_only' | 'inst_only') {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.audioBuffer) return;

    // If requesting a stem and we don't have it yet, run separation
    if (mode !== 'full' && (!deck.vocalBuffer || !deck.instBuffer)) {
      deck.stemMode = mode; // Set mode first so UI reflects intent
      this.notify();
      await this.separateStems(deckId);
    }

    deck.stemMode = mode;

    // Restart playback with new stem buffer
    if (deck.isPlaying) {
      this.stopSource(deckId);
      this.playDeck(deckId);
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
   * Harmonize Deck B BPM and Key to match Deck A
   */
  public harmonizeDeckB() {
    if (!this.deckA.track || !this.deckB.track) return;

    const rateA = this.deckA.playbackRate;
    const targetBpm = this.deckA.track.bpm * rateA;

    const reqRate = targetBpm / this.deckB.track.bpm;
    this.deckB.playbackRate = Math.max(0.5, Math.min(2.0, reqRate));

    let semitoneDiff = this.deckA.track.key.pitchClass - this.deckB.track.key.pitchClass;
    if (semitoneDiff > 6) semitoneDiff -= 12;
    if (semitoneDiff < -6) semitoneDiff += 12;

    this.deckB.pitch = semitoneDiff;
    this.updateAudioNodes('B');
    this.notify();
  }
}

export const audioEngine = new AudioEngine();
