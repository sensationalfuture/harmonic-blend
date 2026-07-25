import React, { useState } from 'react';
import { Download, X, Check, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DeckState, MixerState } from '../types';
import { exportMixToWav } from '../audio/WavExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckA: DeckState;
  deckB: DeckState;
  mixer: MixerState;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, deckA, deckB, mixer }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportMixToWav(deckA, deckB, mixer, 30);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsExporting(false);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#ff007f', '#38bdf8', '#c084fc'],
      });
    } catch (e) {
      console.error('WAV export error:', e);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-700 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h3 className="text-base font-black text-white m-0 uppercase tracking-tight">
              EXPORT MASTER REMIX (.WAV)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>DECK A:</span>
              <span className="text-cyan-400">{deckA.track ? deckA.track.title : 'Empty'}</span>
            </div>
            <div className="flex justify-between text-slate-300 font-bold">
              <span>DECK B:</span>
              <span className="text-pink-400">{deckB.track ? deckB.track.title : 'Empty'}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-mono text-[11px] pt-2 border-t border-slate-800">
              <span>FORMAT: WAV (16-bit 44.1kHz)</span>
              <span>CROSSFADER: {mixer.crossfader.toFixed(2)}</span>
            </div>
          </div>

          {!downloadUrl ? (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-pink-500/20 transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>RENDERING MASTER AUDIO...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>RENDER & DOWNLOAD (.WAV)</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3 text-center">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>MASTER REMIX RENDER COMPLETE!</span>
              </div>

              <a
                href={downloadUrl}
                download={`HarmonicBlend_Remix_${Date.now()}.wav`}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 uppercase tracking-wider inline-block text-center"
              >
                <Download className="w-4 h-4 inline" />
                <span>SAVE WAV FILE TO DISK</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
