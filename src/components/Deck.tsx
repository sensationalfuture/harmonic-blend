import React from 'react';
import { Play, Pause, RotateCcw, Flame, Mic, Music2, Layers } from 'lucide-react';
import type { DeckState } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { VinylTurntable } from './VinylTurntable';
import { WaveformCanvas } from './WaveformCanvas';

interface DeckProps {
  deck: DeckState;
}

export const Deck: React.FC<DeckProps> = ({ deck }) => {
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

  const handleStemModeChange = (mode: 'full' | 'vocals_only' | 'inst_only') => {
    deck.stemMode = mode;
    audioEngine.updateAudioNodes(deck.id);
    if (deck.isPlaying) {
      audioEngine.togglePlay(deck.id);
      audioEngine.togglePlay(deck.id);
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    deck.playbackRate = parseFloat(e.target.value);
    audioEngine.updateAudioNodes(deck.id);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    deck.pitch = parseInt(e.target.value);
    audioEngine.updateAudioNodes(deck.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex-1 rounded-2xl p-5 border transition-all duration-300 ${panelClass}`}>
      {/* Top Bar: Deck ID, Track Title, Key & BPM Badges */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-md ${badgeClass}`}>
            DECK {deck.id}
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-white m-0 tracking-tight">
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
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                ISOLATION READY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStemModeChange('full')}
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
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  deck.stemMode === 'vocals_only'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                VOCALS ONLY
              </button>

              <button
                onClick={() => handleStemModeChange('inst_only')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  deck.stemMode === 'inst_only'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-pink-400" />
                BEAT / INST
              </button>
            </div>
          </div>

          {/* Speed / Pitch Fader */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                <span>TEMPO SPEED:</span>
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
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                <span>PITCH SHIFT:</span>
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
            </div>
          </div>

          {/* Play / Cue / Time display controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className={`p-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center ${
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
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-mono font-bold"
              >
                CUE SET
              </button>

              <button
                onClick={handleJumpCue}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1"
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
  );
};
