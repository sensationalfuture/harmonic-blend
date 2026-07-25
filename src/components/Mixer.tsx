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
    <div className="w-full glass-panel rounded-2xl p-6 border border-slate-800 my-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider m-0">
            MASTER MIXING RACK & EFFECTS
          </h2>
        </div>

        {/* Live VU Meters Simulation */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-400">VU STEREO</span>
          <div className="flex gap-1">
            <div
              className={`w-2 h-4 rounded-sm transition-all duration-75 ${
                deckA.isPlaying ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-800'
              }`}
            />
            <div
              className={`w-2 h-4 rounded-sm transition-all duration-75 ${
                deckB.isPlaying ? 'bg-pink-400 shadow-sm shadow-pink-400' : 'bg-slate-800'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout: Deck A EQs | Crossfader Center | Deck B EQs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Deck A EQ Strip */}
        <div className="md:col-span-4 bg-slate-900/60 p-4 rounded-xl border border-cyan-500/20">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 text-center">
            DECK A EQ & FILTERS
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">HIGH</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqHigh}
                onChange={(e) => handleEqChange('A', 'High', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckA.eqHigh}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">MID</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqMid}
                onChange={(e) => handleEqChange('A', 'Mid', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckA.eqMid}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">LOW</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckA.eqLow}
                onChange={(e) => handleEqChange('A', 'Low', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckA.eqLow}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">FILTER</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={deckA.filterSweep}
                onChange={(e) => handleFilterSweepChange('A', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-mono text-cyan-300">
                {deckA.filterSweep < 0 ? 'LP' : deckA.filterSweep > 0 ? 'HP' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Central Master Crossfader */}
        <div className="md:col-span-4 flex flex-col items-center gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between w-full text-xs font-bold font-mono">
            <span className="text-cyan-400">DECK A</span>
            <span className="text-slate-400">CROSSFADER</span>
            <span className="text-pink-400">DECK B</span>
          </div>

          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={mixer.crossfader}
            onChange={handleCrossfaderChange}
            className="w-full h-8 cursor-pointer accent-cyan-400"
          />

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-mono">
            <span>VOL A: {Math.round(deckA.volume * 100)}%</span>
            <span>BALANCE: {mixer.crossfader.toFixed(2)}</span>
            <span>VOL B: {Math.round(deckB.volume * 100)}%</span>
          </div>

          {/* Volume Fader Sliders */}
          <div className="grid grid-cols-2 gap-4 w-full pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] font-mono text-cyan-400 block mb-1 text-center">GAIN A</label>
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
              <label className="text-[10px] font-mono text-pink-400 block mb-1 text-center">GAIN B</label>
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
        <div className="md:col-span-4 bg-slate-900/60 p-4 rounded-xl border border-pink-500/20">
          <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3 text-center">
            DECK B EQ & FILTERS
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">HIGH</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqHigh}
                onChange={(e) => handleEqChange('B', 'High', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckB.eqHigh}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">MID</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqMid}
                onChange={(e) => handleEqChange('B', 'Mid', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckB.eqMid}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">LOW</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={deckB.eqLow}
                onChange={(e) => handleEqChange('B', 'Low', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-slate-300">{deckB.eqLow}dB</span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">FILTER</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={deckB.filterSweep}
                onChange={(e) => handleFilterSweepChange('B', parseFloat(e.target.value))}
                className="w-full slider-magenta"
              />
              <span className="text-[10px] font-mono text-pink-300">
                {deckB.filterSweep < 0 ? 'LP' : deckB.filterSweep > 0 ? 'HP' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
