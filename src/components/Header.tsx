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
    audioEngine.setMasterVolume(val);
  };

  return (
    <header className="w-full bg-[#fdfbf7]/90 backdrop-blur-md border-b-2 border-[#e6ccb2] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-sm">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#ddb892] to-[#b08968] shadow-md shadow-[#b08968]/20 border border-white">
          <Disc3 className="w-6 h-6 text-white stroke-[2.5] animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#ffffff] text-stroke-black m-0 leading-none flex items-center gap-1.5">
            HARMONIC<span className="text-[#e6ccb2] text-stroke-black font-black">BLEND</span>
          </h1>
          <p className="text-xs text-[#5c3d2e] tracking-wider uppercase font-bold m-0 mt-1">
            Intuitive Warm DJ & AI Stem Workstation
          </p>
        </div>
      </div>

      {/* Center Controls: Master Harmonize & Search */}
      <div className="flex items-center gap-3">
        {/* Master Harmonize Snap Button */}
        <button
          onClick={handleHarmonizeToggle}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 border-2 ${
            mixer.snapToHarmonize
              ? 'bg-gradient-to-r from-[#d4a373] to-[#b07d62] text-white border-[#582f0e] shadow-md text-stroke-sm'
              : 'bg-white/90 text-[#4a2e1b] border-[#d5bdaf] hover:border-[#b08968] hover:bg-white shadow-sm'
          }`}
          title="Auto-stretch and match Key & BPM of Deck B to Deck A"
        >
          <Wand2 className={`w-4 h-4 ${mixer.snapToHarmonize ? 'animate-spin-slow text-white' : 'text-[#9c6644]'}`} />
          <span className="text-stroke-sm text-white">SNAP TO KEY & BPM</span>
          {mixer.snapToHarmonize && (
            <span className="ml-1 px-1.5 py-0.5 bg-[#4a2e1b] text-white text-[10px] rounded uppercase font-bold">
              ACTIVE
            </span>
          )}
        </button>

        {/* YouTube / Track Search Modal Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#faf6f0] text-[#ffffff] text-stroke-black border-2 border-[#d4a373] text-xs font-black transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Search className="w-4 h-4 text-[#ffffff] stroke-[2.5]" />
          <span>YOUTUBE / TRACK SEARCH</span>
        </button>
      </div>

      {/* Right Controls: Master Volume & WAV Export */}
      <div className="flex items-center gap-4">
        {/* Master Volume */}
        <div className="flex items-center gap-2 bg-white/90 px-3.5 py-2 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
          <Volume2 className="w-4 h-4 text-[#7f5539]" />
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
          <span className="text-[11px] font-bold text-[#4a2e1b] w-8 text-right font-mono">
            {Math.round(mixer.masterVolume * 100)}%
          </span>
        </div>

        {/* WAV Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9c6644] to-[#7f5539] hover:from-[#7f5539] hover:to-[#582f0e] text-white font-black text-xs shadow-md border-2 border-[#4a2e1b] transition-all duration-200 hover:scale-105 text-stroke-sm"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT REMIX (.WAV)</span>
        </button>
      </div>
    </header>
  );
};
