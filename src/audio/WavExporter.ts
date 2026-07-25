import type { DeckState, MixerState } from '../types';

/**
 * Render Master Mix offline and return WAV Download Blob
 */
export async function exportMixToWav(
  deckA: DeckState,
  deckB: DeckState,
  mixer: MixerState,
  durationSeconds: number = 30
): Promise<Blob> {
  const sampleRate = 44100;
  const length = Math.floor(sampleRate * durationSeconds);
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  // Setup Master Output Gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = mixer.masterVolume;
  masterGain.connect(offlineCtx.destination);

  // Setup Decks
  const setupDeckOffline = (deck: DeckState, isDeckA: boolean) => {
    if (!deck.audioBuffer) return;

    // Pick stem buffer based on stem mode
    let bufferToPlay = deck.audioBuffer;
    if (deck.stemMode === 'vocals_only' && deck.vocalBuffer) {
      bufferToPlay = deck.vocalBuffer;
    } else if (deck.stemMode === 'inst_only' && deck.instBuffer) {
      bufferToPlay = deck.instBuffer;
    }

    const source = offlineCtx.createBufferSource();
    source.buffer = bufferToPlay;
    source.playbackRate.value = deck.playbackRate * Math.pow(2, deck.pitch / 12);

    // Deck Gain & Crossfader Calculation
    const deckGainNode = offlineCtx.createGain();
    const x = mixer.crossfader; // -1 to 1
    let crossfaderGain = 1.0;

    if (isDeckA) {
      crossfaderGain = Math.cos(((x + 1) * Math.PI) / 4);
    } else {
      crossfaderGain = Math.sin(((x + 1) * Math.PI) / 4);
    }

    deckGainNode.gain.value = deck.volume * crossfaderGain;

    // 3-Band EQ Nodes
    const lowEq = offlineCtx.createBiquadFilter();
    lowEq.type = 'lowshelf';
    lowEq.frequency.value = 320;
    lowEq.gain.value = deck.eqLow;

    const midEq = offlineCtx.createBiquadFilter();
    midEq.type = 'peaking';
    midEq.frequency.value = 1000;
    midEq.Q.value = 0.8;
    midEq.gain.value = deck.eqMid;

    const highEq = offlineCtx.createBiquadFilter();
    highEq.type = 'highshelf';
    highEq.frequency.value = 3200;
    highEq.gain.value = deck.eqHigh;

    // Connect node chain
    source.connect(lowEq);
    lowEq.connect(midEq);
    midEq.connect(highEq);
    highEq.connect(deckGainNode);
    deckGainNode.connect(masterGain);

    source.start(0, deck.currentTime % deck.audioBuffer.duration);
  };

  setupDeckOffline(deckA, true);
  setupDeckOffline(deckB, false);

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWav(renderedBuffer);
}

/**
 * Encode AudioBuffer into 16-bit WAV file format Blob
 */
function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length;

  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write PCM audio data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      // Convert float sample to 16-bit signed int
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
