import React from 'react';
import { SlidersHorizontal, Activity } from 'lucide-react';
import type { MixerState, DeckState } from '../types';
import { audioEngine } from '../audio/AudioEngine';

interface MixerProps {
  mixer: MixerState;
  deckA: DeckState;
  deckB: DeckState;
}

export const Mixer: React.FC<MixerProps> = ({ mixer, deckA, deckB }) => {
  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.mixer.crossfader = val;
    audioEngine.updateAudioNodes('A');
    audioEngine.updateAudioNodes('B');
  };

  const handleEqChange = (deckId: 'A' | 'B', band: 'Low' | 'Mid' | 'High', value: number) => {
    const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
    if (band === 'Low') deck.eqLow = value;
    if (band === 'Mid') deck.eqMid = value;
    if (band === 'High') deck.eqHigh = value;
    audioEngine.updateAudioNodes(deckId);
  };

  const handleFilterSweepChange = (deckId: 'A' | 'B', value: number) => {
    const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
    deck.filterSweep = value;
    audioEngine.updateAudioNodes(deckId);
  };

  const handleVolumeChange = (deckId: 'A' | 'B', value: number) => {
    const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
    deck.volume = value;
    audioEngine.updateAudioNodes(deckId);
  };

  return (
    <div className="w-full bg-[#fdfbf7]/90 rounded-2xl p-6 border-2 border-[#e6ccb2] my-6 shadow-md">
      <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#e6ccb2]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#9c6644]" />
          <h2 className="text-base font-black text-white text-stroke-black uppercase tracking-wider m-0">
            MASTER MIXING RACK & EFFECTS
          </h2>
        </div>

        {/* Live VU Meters Simulation */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
          <Activity className="w-4 h-4 text-[#7f5539] animate-pulse" />
          <span className="text-xs font-mono font-bold text-[#4a2e1b]">VU STEREO</span>
          <div className="flex gap-1.5">
            <div
              className={`w-2.5 h-4 rounded-sm transition-all duration-75 ${
                deckA.isPlaying ? 'bg-[#d4a373] shadow-sm' : 'bg-[#e6ccb2]'
              }`}
            />
            <div
              className={`w-2.5 h-4 rounded-sm transition-all duration-75 ${
                deckB.isPlaying ? 'bg-[#b07d62] shadow-sm' : 'bg-[#e6ccb2]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout: Deck A EQs | Crossfader Center | Deck B EQs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Deck A EQ Strip */}
        <div className="md:col-span-4 bg-white/90 p-4 rounded-xl border-2 border-[#d4a373] shadow-sm">
          <h4 className="text-xs font-black text-[#a66a38] text-stroke-sm uppercase tracking-wider mb-3 text-center">
            DECK A EQ & FILTERS
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">HIGH</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqHigh}
                onChange={(e) => handleEqChange('A', 'High', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckA.eqHigh}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">MID</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqMid}
                onChange={(e) => handleEqChange('A', 'Mid', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckA.eqMid}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">LOW</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqLow}
                onChange={(e) => handleEqChange('A', 'Low', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckA.eqLow}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">FILTER</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={deckA.filterSweep}
                onChange={(e) => handleFilterSweepChange('A', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-[#a66a38] font-bold">
                {deckA.filterSweep < 0 ? 'LP' : deckA.filterSweep > 0 ? 'HP' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Central Master Crossfader */}
        <div className="md:col-span-4 flex flex-col items-center gap-3 bg-white p-4 rounded-xl border-2 border-[#e6ccb2] shadow-sm">
          <div className="flex items-center justify-between w-full text-xs font-black font-mono">
            <span className="text-[#a66a38]">DECK A</span>
            <span className="text-[#5c3d2e] text-stroke-sm text-white">CROSSFADER</span>
            <span className="text-[#8c533e]">DECK B</span>
          </div>

          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={mixer.crossfader}
            onChange={handleCrossfaderChange}
            className="w-full h-8 cursor-pointer accent-[#7f5539]"
          />

          <div className="flex items-center justify-between w-full text-[11px] text-[#4a2e1b] font-mono font-bold">
            <span>VOL A: {Math.round(deckA.volume * 100)}%</span>
            <span>BAL: {mixer.crossfader.toFixed(2)}</span>
            <span>VOL B: {Math.round(deckB.volume * 100)}%</span>
          </div>

          {/* Volume Fader Sliders */}
          <div className="grid grid-cols-2 gap-4 w-full pt-2 border-t-2 border-[#e6ccb2]">
            <div>
              <label className="text-[10px] font-mono text-[#a66a38] font-bold block mb-1 text-center">GAIN A</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckA.volume}
                onChange={(e) => handleVolumeChange('A', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#8c533e] font-bold block mb-1 text-center">GAIN B</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckB.volume}
                onChange={(e) => handleVolumeChange('B', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
            </div>
          </div>
        </div>

        {/* Deck B EQ Strip */}
        <div className="md:col-span-4 bg-white/90 p-4 rounded-xl border-2 border-[#b07d62] shadow-sm">
          <h4 className="text-xs font-black text-[#8c533e] text-stroke-sm uppercase tracking-wider mb-3 text-center">
            DECK B EQ & FILTERS
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">HIGH</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqHigh}
                onChange={(e) => handleEqChange('B', 'High', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckB.eqHigh}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">MID</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqMid}
                onChange={(e) => handleEqChange('B', 'Mid', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckB.eqMid}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">LOW</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqLow}
                onChange={(e) => handleEqChange('B', 'Low', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-[#2c1d11] font-bold">{deckB.eqLow}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#5c3d2e] font-bold block mb-1">FILTER</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={deckB.filterSweep}
                onChange={(e) => handleFilterSweepChange('B', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-[#8c533e] font-bold">
                {deckB.filterSweep < 0 ? 'LP' : deckB.filterSweep > 0 ? 'HP' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
