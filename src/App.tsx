import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { WaveformCanvas } from './components/WaveformCanvas';
import { YoutubeSearchModal } from './components/YoutubeSearchModal';
import { ExportModal } from './components/ExportModal';
import { audioEngine } from './audio/AudioEngine';
import { Activity, Disc, Sparkles } from 'lucide-react';

export function App() {
  const [deckA, setDeckA] = useState(audioEngine.deckA);
  const [deckB, setDeckB] = useState(audioEngine.deckB);
  const [mixer, setMixer] = useState(audioEngine.mixer);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    // Subscribe to Audio Engine state updates
    const unsubscribe = audioEngine.subscribe(() => {
      setDeckA({ ...audioEngine.deckA });
      setDeckB({ ...audioEngine.deckB });
      setMixer({ ...audioEngine.mixer });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4ece1] text-[#2c1d11] flex flex-col font-sans selection:bg-[#d4a373] selection:text-white pb-12">
      {/* Top Header */}
      <Header
        mixer={mixer}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Workstation Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Split Screen Dual Decks (Deck A & Deck B) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Deck deck={deckA} onOpenSearch={() => setIsSearchOpen(true)} />
          <Deck deck={deckB} onOpenSearch={() => setIsSearchOpen(true)} />
        </div>

        {/* Central Master Mixing Rack */}
        <Mixer mixer={mixer} deckA={deckA} deckB={deckB} />

        {/* Master Timeline Graph & Stem Preview */}
        <div className="w-full bg-[#fdfbf7]/90 rounded-2xl p-5 border-2 border-[#e6ccb2] shadow-md">
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#e6ccb2]">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#9c6644]" />
              <h3 className="text-sm font-black text-white text-stroke-black uppercase tracking-wider m-0">
                MASTER TIMELINE OVERLAY & SYNC GRAPH
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="flex items-center gap-1 text-[#a66a38]">
                <Disc className="w-3.5 h-3.5" /> DECK A (CARAMEL)
              </span>
              <span className="text-[#d5bdaf]">|</span>
              <span className="flex items-center gap-1 text-[#8c533e]">
                <Disc className="w-3.5 h-3.5" /> DECK B (TERRACOTTA)
              </span>
            </div>
          </div>

          {/* Combined Master Dual Waveform Timelines */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-mono font-bold text-[#a66a38] mb-1">
                <span>DECK A: {deckA.track ? deckA.track.title : 'No Track'}</span>
                <span>{deckA.track ? `${deckA.track.bpm} BPM | ${deckA.track.key.camelot}` : ''}</span>
              </div>
              <WaveformCanvas
                deckId="A"
                audioBuffer={deckA.audioBuffer}
                currentTime={deckA.currentTime}
                duration={deckA.duration}
                cuePoint={deckA.cuePoint}
                isPlaying={deckA.isPlaying}
                accentColor="#d4a373"
                height={55}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono font-bold text-[#8c533e] mb-1">
                <span>DECK B: {deckB.track ? deckB.track.title : 'No Track'}</span>
                <span>{deckB.track ? `${deckB.track.bpm} BPM | ${deckB.track.key.camelot}` : ''}</span>
              </div>
              <WaveformCanvas
                deckId="B"
                audioBuffer={deckB.audioBuffer}
                currentTime={deckB.currentTime}
                duration={deckB.duration}
                cuePoint={deckB.cuePoint}
                isPlaying={deckB.isPlaying}
                accentColor="#b07d62"
                height={55}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="w-full text-center text-xs font-bold text-[#7f5539] py-4 border-t-2 border-[#e6ccb2] flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#d4a373]" />
        <span>HARMONICBLEND DJ WORKSTATION • POWERED BY WEB AUDIO API & AI STEM ISOLATION</span>
      </footer>

      {/* YouTube & Track Ingestion Search Modal */}
      <YoutubeSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Master WAV Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        deckA={deckA}
        deckB={deckB}
        mixer={mixer}
      />
    </div>
  );
}

export default App;
