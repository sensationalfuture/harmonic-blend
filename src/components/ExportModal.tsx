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
        colors: ['#d4a373', '#b07d62', '#7f5539', '#e6ccb2'],
      });
    } catch (e) {
      console.error('WAV export error:', e);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2c1d11]/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#fdfbf7] rounded-3xl border-2 border-[#e6ccb2] p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#e6ccb2]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9c6644]" />
            <h3 className="text-base font-black text-white text-stroke-black m-0 uppercase tracking-tight">
              EXPORT MASTER REMIX (.WAV)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7f5539] hover:text-[#4a2e1b] hover:bg-[#faf6f0] transition border border-[#e6ccb2]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white p-4 rounded-xl border-2 border-[#e6ccb2] space-y-2 text-xs shadow-sm">
            <div className="flex justify-between text-[#4a2e1b] font-bold">
              <span>DECK A:</span>
              <span className="text-[#a66a38] font-black">{deckA.track ? deckA.track.title : 'Empty'}</span>
            </div>
            <div className="flex justify-between text-[#4a2e1b] font-bold">
              <span>DECK B:</span>
              <span className="text-[#8c533e] font-black">{deckB.track ? deckB.track.title : 'Empty'}</span>
            </div>
            <div className="flex justify-between text-[#7f5539] font-mono text-[11px] font-bold pt-2 border-t-2 border-[#e6ccb2]">
              <span>FORMAT: WAV (16-bit 44.1kHz)</span>
              <span>BAL: {mixer.crossfader.toFixed(2)}</span>
            </div>
          </div>

          {!downloadUrl ? (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3.5 bg-gradient-to-r from-[#d4a373] via-[#b07d62] to-[#7f5539] hover:from-[#b08968] hover:to-[#582f0e] text-white font-black text-xs rounded-xl shadow-md border-2 border-[#4a2e1b] text-stroke-sm transition flex items-center justify-center gap-2 uppercase tracking-wider"
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
              <div className="p-3 bg-[#eaf5ea] border-2 border-[#81c784] rounded-xl text-[#2d5a27] text-xs font-black flex items-center justify-center gap-2 shadow-sm">
                <Check className="w-4 h-4 text-[#2d5a27]" />
                <span>MASTER REMIX RENDER COMPLETE!</span>
              </div>

              <a
                href={downloadUrl}
                download={`HarmonicBlend_Remix_${Date.now()}.wav`}
                className="w-full py-3.5 bg-[#2d5a27] hover:bg-[#1b3d17] text-white font-black text-xs rounded-xl shadow-md border-2 border-[#1b3d17] text-stroke-sm transition flex items-center justify-center gap-2 uppercase tracking-wider block text-center"
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
