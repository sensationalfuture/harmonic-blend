import React from 'react';
import { Disc3, Search, Download, Wand2, Volume2 } from 'lucide-react';
import type { MixerState } from '../types';
import { audioEngine } from '../audio/AudioEngine';

interface HeaderProps {
  mixer: MixerState;
  onOpenSearch: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ mixer, onOpenSearch, onOpenExport }) => {
  const handleHarmonizeToggle = () => {
    audioEngine.mixer.snapToHarmonize = !mixer.snapToHarmonize;
    if (audioEngine.mixer.snapToHarmonize) {
      audioEngine.harmonizeDeckB();
    }
    audioEngine.updateAudioNodes('B');
  };

  const handleMasterVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.mixer.masterVolume = val;
    audioEngine.updateAudioNodes('A');
    audioEngine.updateAudioNodes('B');
  };

  return (
    <header className="w-full glass-panel border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 shadow-lg shadow-cyan-500/20 animate-pulse">
          <Disc3 className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white m-0 leading-none flex items-center gap-2">
            HARMONIC<span className="text-cyan-400 font-extrabold">BLEND</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-wider uppercase font-semibold m-0 mt-0.5">
            Cyber-Analog DJ & Stem Mashup Workstation
          </p>
        </div>
      </div>

      {/* Center Controls: Master Harmonize & Search */}
      <div className="flex items-center gap-3">
        {/* Master Harmonize Snap Button */}
        <button
          onClick={handleHarmonizeToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${
            mixer.snapToHarmonize
              ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30 glow-border-cyan'
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
          }`}
          title="Auto-stretch and match Key & BPM of Deck B to Deck A"
        >
          <Wand2 className={`w-4 h-4 ${mixer.snapToHarmonize ? 'animate-spin-slow text-slate-950' : 'text-cyan-400'}`} />
          <span>SNAP TO KEY & BPM</span>
          {mixer.snapToHarmonize && (
            <span className="ml-1 px-1.5 py-0.5 bg-slate-950 text-cyan-300 text-[10px] rounded uppercase font-mono">
              ACTIVE
            </span>
          )}
        </button>

        {/* YouTube / Track Search Modal Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold transition-all duration-200"
        >
          <Search className="w-4 h-4" />
          <span>YOUTUBE / TRACK SEARCH</span>
        </button>
      </div>

      {/* Right Controls: Master Volume & WAV Export */}
      <div className="flex items-center gap-4">
        {/* Master Volume */}
        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={mixer.masterVolume}
            onChange={handleMasterVolChange}
            className="w-20 slider-master"
            title="Master Output Volume"
          />
          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
            {Math.round(mixer.masterVolume * 100)}%
          </span>
        </div>

        {/* WAV Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition-all duration-200 hover:scale-105"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT REMIX (.WAV)</span>
        </button>
      </div>
    </header>
  );
};
