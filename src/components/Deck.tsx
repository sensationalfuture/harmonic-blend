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
  const accentColor = isDeckA ? '#00f2fe' : '#ff007f';
  const panelClass = isDeckA ? 'glass-panel-cyan' : 'glass-panel-magenta';
  const badgeClass = isDeckA
    ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/50'
    : 'bg-pink-500 text-slate-950 shadow-pink-500/50';

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
    <div className={`flex-1 rounded-2xl p-5 border transition-all duration-300 ${panelClass} relative overflow-hidden`}>

      {/* === LOADING OVERLAY === */}
      {deck.isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm rounded-2xl gap-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full border-4 ${isDeckA ? 'border-cyan-500/20' : 'border-pink-500/20'} border-t-transparent animate-spin`}
              style={{ borderTopColor: accentColor }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className={`w-6 h-6 ${isDeckA ? 'text-cyan-400' : 'text-pink-400'}`} />
            </div>
          </div>
          <div className="text-center">
            <p className={`text-sm font-black ${isDeckA ? 'text-cyan-300' : 'text-pink-300'}`}>
              LOADING INTO DECK {deck.id}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1 animate-pulse">
              {deck.loadingStep || 'Please wait...'}
            </p>
          </div>
          <div className={`w-48 h-1 bg-slate-800 rounded-full overflow-hidden`}>
            <div
              className={`h-full rounded-full animate-pulse ${isDeckA ? 'bg-cyan-500' : 'bg-pink-500'}`}
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      {/* === EMPTY STATE PLACEHOLDER === */}
      {isEmpty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className={`w-20 h-20 rounded-full border-2 border-dashed ${isDeckA ? 'border-cyan-800' : 'border-pink-800'} flex items-center justify-center`}>
            <Music2 className={`w-8 h-8 ${isDeckA ? 'text-cyan-800' : 'text-pink-800'}`} />
          </div>
          <div>
            <p className={`text-sm font-black ${isDeckA ? 'text-cyan-700' : 'text-pink-700'} uppercase tracking-wider`}>
              DECK {deck.id} — No Track Loaded
            </p>
            <p className="text-xs text-slate-600 mt-1">Search YouTube Music to load a song</p>
          </div>
          <button
            onClick={onOpenSearch}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDeckA
                ? 'bg-cyan-500/10 border-cyan-800 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-600'
                : 'bg-pink-500/10 border-pink-800 text-pink-400 hover:bg-pink-500/20 hover:border-pink-600'
            } flex items-center gap-1.5`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            SEARCH YOUTUBE MUSIC
          </button>
        </div>
      )}

      {/* === DECK CONTENT (shown when track loaded) === */}
      <div className={isEmpty || deck.isLoading ? 'opacity-20 pointer-events-none' : ''}>
        {/* Top Bar: Deck ID, Track Title, Key & BPM Badges */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-md ${badgeClass}`}>
              DECK {deck.id}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white m-0 tracking-tight truncate max-w-[180px]">
                {deck.track ? deck.track.title : 'No Track Loaded'}
              </h3>
              <p className="text-xs text-slate-400 font-medium m-0">
                {deck.track ? deck.track.artist : 'Use search to load audio'}
              </p>
            </div>
          </div>

          {/* BPM & Key Indicators */}
          <div className="flex items-center gap-2 font-mono">
            {deck.track && (
              <>
                <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300">
                  <span className="text-slate-400 font-normal">BPM:</span> {deck.track.bpm}
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-bold text-cyan-300">
                  <span className="text-slate-400 font-normal">KEY:</span> {deck.track.key.camelot} ({deck.track.key.keyName})
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
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  AI STEM SEPARATION
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  deck.stemSeparating
                    ? 'text-amber-400 bg-amber-950 border-amber-800 animate-pulse'
                    : deck.vocalBuffer
                    ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                    : 'text-slate-500 bg-slate-900 border-slate-800'
                }`}>
                  {deck.stemSeparating ? 'DEMUCS RUNNING...' : deck.vocalBuffer ? 'STEMS READY' : 'CLICK TO SEPARATE'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStemModeChange('full')}
                  disabled={deck.stemSeparating}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    deck.stemMode === 'full'
                      ? 'bg-slate-800 text-white border-slate-600 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Music2 className="w-3.5 h-3.5" />
                  FULL TRACK
                </button>

                <button
                  onClick={() => handleStemModeChange('vocals_only')}
                  disabled={deck.stemSeparating || !deck.audioBuffer}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    deck.stemMode === 'vocals_only'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {deck.stemSeparating && deck.stemMode === 'vocals_only'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    : <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  }
                  VOCALS
                </button>

                <button
                  onClick={() => handleStemModeChange('inst_only')}
                  disabled={deck.stemSeparating || !deck.audioBuffer}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    deck.stemMode === 'inst_only'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {deck.stemSeparating && deck.stemMode === 'inst_only'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                    : <Flame className="w-3.5 h-3.5 text-pink-400" />
                  }
                  BEAT/INST
                </button>
              </div>

              {deck.stemSeparating && (
                <p className="text-[10px] text-amber-400/70 font-mono mt-2 animate-pulse text-center">
                  🤖 Demucs ML separating stems... this may take 30–90s
                </p>
              )}
            </div>

            {/* Speed / Pitch Faders */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>TEMPO:</span>
                  <span className="text-cyan-400 font-bold">{deck.playbackRate.toFixed(2)}x</span>
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
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>PITCH:</span>
                  <span className="text-pink-400 font-bold">{deck.pitch > 0 ? `+${deck.pitch}` : deck.pitch} ST</span>
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
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
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
                  className={`p-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                    deck.isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : `bg-gradient-to-r ${
                          isDeckA
                            ? 'from-cyan-500 to-blue-600 shadow-cyan-500/20'
                            : 'from-pink-500 to-purple-600 shadow-pink-500/20'
                        } text-slate-950`
                  }`}
                >
                  {deck.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleSetCue}
                  disabled={!deck.audioBuffer}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-mono font-bold disabled:opacity-40"
                >
                  CUE SET
                </button>

                <button
                  onClick={handleJumpCue}
                  disabled={!deck.audioBuffer}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1 disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  CUE
                </button>
              </div>

              {/* Current Time Clock Display */}
              <div className="font-mono text-sm font-black text-slate-200 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
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
