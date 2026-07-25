import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { WaveformCanvas } from './components/WaveformCanvas';
import { YoutubeSearchModal } from './components/YoutubeSearchModal';
import { ExportModal } from './components/ExportModal';
import { audioEngine } from './audio/AudioEngine';
import { PRESET_TRACKS } from './audio/PresetTracks';
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

    // Auto-load default pro studio preset tracks into Deck A & Deck B
    const loadDefaultTracks = async () => {
      if (!audioEngine.deckA.track) {
        await audioEngine.loadTrack('A', PRESET_TRACKS[0]);
      }
      if (!audioEngine.deckB.track) {
        await audioEngine.loadTrack('B', PRESET_TRACKS[1]);
      }
    };
    loadDefaultTracks();

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 pb-12">
      {/* Top Cyber Header */}
      <Header
        mixer={mixer}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Workstation Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Split Screen Dual Decks (Deck A & Deck B) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Deck deck={deckA} />
          <Deck deck={deckB} />
        </div>

        {/* Central Master Mixing Rack */}
        <Mixer mixer={mixer} deckA={deckA} deckB={deckB} />

        {/* Master Timeline Graph & Stem Preview */}
        <div className="w-full glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-pink-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider m-0">
                MASTER TIMELINE OVERLAY & SYNC GRAPH
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <Disc className="w-3.5 h-3.5" /> DECK A (CYAN)
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-pink-400">
                <Disc className="w-3.5 h-3.5" /> DECK B (MAGENTA)
              </span>
            </div>
          </div>

          {/* Combined Master Dual Waveform Timelines */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-cyan-400 mb-1">
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
                accentColor="#00f2fe"
                height={55}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-pink-400 mb-1">
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
                accentColor="#ff007f"
                height={55}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="w-full text-center text-xs text-slate-500 py-4 border-t border-slate-900 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
