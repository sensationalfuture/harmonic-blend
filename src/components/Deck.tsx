import React from 'react';
import { Play, Pause, RotateCcw, Flame, Mic, Music2, Layers, Loader2, Music, Sparkles } from 'lucide-react';
import type { DeckState } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { VinylTurntable } from './VinylTurntable';
import { WaveformCanvas } from './WaveformCanvas';

interface DeckProps {
  deck: DeckState;
  onOpenSearch: () => void;
}

export const Deck: React.FC<DeckProps> = ({ deck, onOpenSearch }) => {
  const isDeckA = deck.id === 'A';
  const accentColor = isDeckA ? '#d4a373' : '#b07d62';
  const panelClass = isDeckA ? 'glass-panel-cyan' : 'glass-panel-magenta';
  const badgeClass = isDeckA
    ? 'bg-[#d4a373] text-white border border-[#7f5539] text-stroke-sm shadow-md'
    : 'bg-[#b07d62] text-white border border-[#582f0e] text-stroke-sm shadow-md';

  const handleTogglePlay = () => {
    audioEngine.togglePlay(deck.id);
  };

  const handleSetCue = () => {
    audioEngine.setCue(deck.id);
  };

  const handleJumpCue = () => {
    audioEngine.jumpCue(deck.id);
  };

  const handleStemModeChange = async (mode: 'full' | 'vocals_only' | 'inst_only') => {
    await audioEngine.setStemMode(deck.id, mode);
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    audioEngine.setTempo(deck.id, parseFloat(e.target.value));
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    audioEngine.setPitch(deck.id, parseInt(e.target.value));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isEmpty = !deck.track && !deck.isLoading;

  return (
    <div className={`flex-1 rounded-2xl p-5 border-2 transition-all duration-300 ${panelClass} relative overflow-hidden shadow-md`}>

      {/* === LOADING OVERLAY === */}
      {deck.isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#fdfbf7]/95 backdrop-blur-md rounded-2xl gap-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full border-4 ${isDeckA ? 'border-[#d4a373]/30' : 'border-[#b07d62]/30'} border-t-transparent animate-spin`}
              style={{ borderTopColor: accentColor }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className={`w-6 h-6 ${isDeckA ? 'text-[#a66a38]' : 'text-[#8c533e]'}`} />
            </div>
          </div>
          <div className="text-center">
            <p className={`text-base font-black text-stroke-sm text-white`}>
              LOADING INTO DECK {deck.id}
            </p>
            <p className="text-xs text-[#5c3d2e] font-bold mt-1 animate-pulse">
              {deck.loadingStep || 'Please wait...'}
            </p>
          </div>
          <div className={`w-48 h-2 bg-[#e6ccb2] rounded-full overflow-hidden border border-[#d5bdaf]`}>
            <div
              className={`h-full rounded-full animate-pulse ${isDeckA ? 'bg-[#d4a373]' : 'bg-[#b07d62]'}`}
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      {/* === EMPTY STATE PLACEHOLDER === */}
      {isEmpty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center px-6 bg-[#fdfbf7]/90 rounded-2xl">
          <div className={`w-20 h-20 rounded-full border-2 border-dashed ${isDeckA ? 'border-[#d4a373]' : 'border-[#b07d62]'} flex items-center justify-center bg-[#faf6f0]`}>
            <Music2 className={`w-8 h-8 ${isDeckA ? 'text-[#a66a38]' : 'text-[#8c533e]'}`} />
          </div>
          <div>
            <p className={`text-base font-black ${isDeckA ? 'text-[#a66a38]' : 'text-[#8c533e]'} text-stroke-sm uppercase tracking-wider`}>
              DECK {deck.id} — No Track Loaded
            </p>
            <p className="text-xs text-[#6b4d3e] font-bold mt-1">Search YouTube Music to load a song</p>
          </div>
          <button
            onClick={onOpenSearch}
            className={`px-5 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
              isDeckA
                ? 'bg-[#d4a373] text-white border-[#7f5539] hover:bg-[#b08968] text-stroke-sm shadow-md'
                : 'bg-[#b07d62] text-white border-[#582f0e] hover:bg-[#8c533e] text-stroke-sm shadow-md'
            } flex items-center gap-2`}
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>SEARCH YOUTUBE MUSIC</span>
          </button>
        </div>
      )}

      {/* === DECK CONTENT (shown when track loaded) === */}
      <div className={isEmpty || deck.isLoading ? 'opacity-20 pointer-events-none' : ''}>
        {/* Top Bar: Deck ID, Track Title, Key & BPM Badges */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#e6ccb2]">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase ${badgeClass}`}>
              DECK {deck.id}
            </span>
            <div>
              <h3 className="text-base font-black text-stroke-sm text-white m-0 tracking-tight truncate max-w-[200px]">
                {deck.track ? deck.track.title : 'No Track Loaded'}
              </h3>
              <p className="text-xs text-[#5c3d2e] font-bold m-0">
                {deck.track ? deck.track.artist : 'Use search to load audio'}
              </p>
            </div>
          </div>

          {/* BPM & Key Indicators */}
          <div className="flex items-center gap-2 font-mono">
            {deck.track && (
              <>
                <div className="px-3 py-1 rounded-xl bg-white border-2 border-[#e6ccb2] text-xs font-bold text-[#4a2e1b] shadow-sm">
                  <span className="text-[#8c6d58] font-semibold">BPM:</span> {deck.track.bpm}
                </div>
                <div className="px-3 py-1 rounded-xl bg-white border-2 border-[#e6ccb2] text-xs font-bold text-[#7f5539] shadow-sm">
                  <span className="text-[#8c6d58] font-semibold">KEY:</span> {deck.track.key.camelot} ({deck.track.key.keyName})
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Deck Layout: Turntable + Controls + Stem Isolator */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Column: Vinyl Turntable Canvas */}
          <div className="md:col-span-5 flex justify-center">
            <VinylTurntable
              deckId={deck.id}
              isPlaying={deck.isPlaying}
              accentColor={accentColor}
              title={deck.track?.title}
              artist={deck.track?.artist}
            />
          </div>

          {/* Right Column: AI Stem Separation Matrix & Controls */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* AI Stem Isolation Matrix */}
            <div className="bg-white/90 p-3.5 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#ffffff] text-stroke-sm flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-[#7f5539]" />
                  AI STEM SEPARATION
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  deck.stemSeparating
                    ? 'text-[#8c533e] bg-[#fdf2e9] border-[#d4a373] animate-pulse'
                    : deck.vocalBuffer
                    ? 'text-[#2d5a27] bg-[#eaf5ea] border-[#81c784]'
                    : 'text-[#6b4d3e] bg-[#f4ece1] border-[#d5bdaf]'
                }`}>
                  {deck.stemSeparating ? 'DEMUCS RUNNING...' : deck.vocalBuffer ? 'STEMS READY' : 'CLICK TO SEPARATE'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStemModeChange('full')}
                  disabled={deck.stemSeparating}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border-2 ${
                    deck.stemMode === 'full'
                      ? 'bg-[#7f5539] text-white border-[#4a2e1b] text-stroke-sm shadow'
                      : 'bg-white text-[#4a2e1b] border-[#e6ccb2] hover:bg-[#faf6f0]'
                  }`}
                >
                  <Music2 className="w-3.5 h-3.5" />
                  FULL TRACK
                </button>

                <button
                  onClick={() => handleStemModeChange('vocals_only')}
                  disabled={deck.stemSeparating || !deck.audioBuffer}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border-2 ${
                    deck.stemMode === 'vocals_only'
                      ? 'bg-[#d4a373] text-white border-[#7f5539] text-stroke-sm shadow'
                      : 'bg-white text-[#4a2e1b] border-[#e6ccb2] hover:bg-[#faf6f0]'
                  }`}
                >
                  {deck.stemSeparating && deck.stemMode === 'vocals_only'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    : <Mic className="w-3.5 h-3.5 text-[#9c6644]" />
                  }
                  VOCALS
                </button>

                <button
                  onClick={() => handleStemModeChange('inst_only')}
                  disabled={deck.stemSeparating || !deck.audioBuffer}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border-2 ${
                    deck.stemMode === 'inst_only'
                      ? 'bg-[#b07d62] text-white border-[#582f0e] text-stroke-sm shadow'
                      : 'bg-white text-[#4a2e1b] border-[#e6ccb2] hover:bg-[#faf6f0]'
                  }`}
                >
                  {deck.stemSeparating && deck.stemMode === 'inst_only'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    : <Flame className="w-3.5 h-3.5 text-[#b07d62]" />
                  }
                  BEAT/INST
                </button>
              </div>

              {deck.stemSeparating && (
                <p className="text-[11px] text-[#8c533e] font-bold mt-2 animate-pulse text-center">
                  🤖 Demucs ML separating stems... this may take 30–90s
                </p>
              )}
            </div>

            {/* Speed / Pitch Faders */}
            <div className="grid grid-cols-2 gap-3 bg-white/90 p-3.5 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
              <div>
                <div className="flex justify-between text-xs text-[#5c3d2e] font-bold mb-1">
                  <span>TEMPO:</span>
                  <span className="text-[#a66a38] font-mono font-bold">{deck.playbackRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.01"
                  value={deck.playbackRate}
                  onChange={handlePlaybackRateChange}
                  className={`w-full ${!isDeckA ? 'slider-magenta' : ''}`}
                />
                <div className="flex justify-between text-[10px] text-[#8c6d58] font-mono mt-0.5 font-bold">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#5c3d2e] font-bold mb-1">
                  <span>PITCH:</span>
                  <span className="text-[#8c533e] font-mono font-bold">{deck.pitch > 0 ? `+${deck.pitch}` : deck.pitch} ST</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={deck.pitch}
                  onChange={handlePitchChange}
                  className={`w-full ${!isDeckA ? 'slider-magenta' : ''}`}
                />
                <div className="flex justify-between text-[10px] text-[#8c6d58] font-mono mt-0.5 font-bold">
                  <span>-12</span>
                  <span>0</span>
                  <span>+12</span>
                </div>
              </div>
            </div>

            {/* Play / Cue / Time display controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  disabled={!deck.audioBuffer || deck.isLoading}
                  className={`p-3 rounded-xl font-black transition-all shadow-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed border-2 ${
                    deck.isPlaying
                      ? 'bg-[#d4a373] hover:bg-[#b08968] text-white border-[#7f5539] text-stroke-sm'
                      : `bg-gradient-to-r ${
                          isDeckA
                            ? 'from-[#d4a373] to-[#b08968] border-[#7f5539]'
                            : 'from-[#b07d62] to-[#8c533e] border-[#582f0e]'
                        } text-white text-stroke-sm`
                  }`}
                >
                  {deck.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleSetCue}
                  disabled={!deck.audioBuffer}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#faf6f0] text-[#7f5539] border-2 border-[#e6ccb2] text-xs font-mono font-bold disabled:opacity-40 shadow-sm"
                >
                  CUE SET
                </button>

                <button
                  onClick={handleJumpCue}
                  disabled={!deck.audioBuffer}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#faf6f0] text-[#4a2e1b] border-2 border-[#e6ccb2] text-xs font-mono font-bold flex items-center gap-1 disabled:opacity-40 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  CUE
                </button>
              </div>

              {/* Current Time Clock Display */}
              <div className="font-mono text-sm font-bold text-[#ffffff] text-stroke-black bg-white px-3.5 py-2 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
                {formatTime(deck.currentTime)} / {formatTime(deck.duration)}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Waveform Canvas Scrubbing */}
        <div className="mt-4">
          <WaveformCanvas
            deckId={deck.id}
            audioBuffer={deck.audioBuffer}
            currentTime={deck.currentTime}
            duration={deck.duration}
            cuePoint={deck.cuePoint}
            isPlaying={deck.isPlaying}
            accentColor={accentColor}
            height={65}
          />
        </div>
      </div>
    </div>
  );
};
