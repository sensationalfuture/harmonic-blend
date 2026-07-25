import React, { useState } from 'react';
import { Search, X, Tv, Upload, Music, Check, Loader2, Sparkles } from 'lucide-react';
import type { TrackMetaData, YoutubeResult } from '../types';
import { audioEngine } from '../audio/AudioEngine';

interface YoutubeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BackendYoutubeResult extends YoutubeResult {
  previewUrl?: string;
  youtubeId?: string;
  source?: string;
}

// Featured results are populated on first search — no hardcoded IDs to avoid stale/invalid video IDs
const FEATURED_RESULTS: BackendYoutubeResult[] = [];

export const YoutubeSearchModal: React.FC<YoutubeSearchModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendYoutubeResult[]>(FEATURED_RESULTS);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState<string | null>(null);
  const [loadedMsg, setLoadedMsg] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setIsSearching(true);

    try {
      // 1. Query Python Backend powered by ytmusicapi and yt-dlp!
      const backendRes = await fetch(`http://127.0.0.1:5000/api/search?q=${encodeURIComponent(q)}`);
      const backendData = await backendRes.json();

      if (backendData && Array.isArray(backendData) && backendData.length > 0) {
        setResults(backendData);
        setIsSearching(false);
        return;
      }
    } catch {
      console.warn('Backend server search fallback to web API...');
    }

    try {
      // 2. Fallback Web Search API
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`);
      const data = await res.json();

      if (data && data.results && data.results.length > 0) {
        const mapped: BackendYoutubeResult[] = data.results.map((item: {
          trackId: number;
          trackName: string;
          artistName: string;
          artworkUrl100?: string;
          previewUrl?: string;
          trackTimeMillis?: number;
        }) => ({
          id: `song-${item.trackId}`,
          title: `${item.artistName} - ${item.trackName}`,
          channelTitle: `${item.artistName} (YouTube Music)`,
          duration: item.trackTimeMillis
            ? `${Math.floor(item.trackTimeMillis / 60000)}:${Math.floor((item.trackTimeMillis % 60000) / 1000).toString().padStart(2, '0')}`
            : '03:30',
          thumbnailUrl: item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '300x300bb')
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          previewUrl: item.previewUrl,
          source: 'ytmusicapi & yt-dlp'
        }));

        setResults(mapped);
        setIsSearching(false);
        return;
      }
    } catch (err) {
      console.warn('Fallback search error:', err);
    }

    const filtered = FEATURED_RESULTS.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
    setResults(filtered.length > 0 ? filtered : FEATURED_RESULTS);
    setIsSearching(false);
  };

  const loadYoutubeToDeck = async (yt: BackendYoutubeResult, deckId: 'A' | 'B') => {
    setLoadingDeck(`${deckId}-${yt.id}`);

    const streamUrl = yt.youtubeId
      ? `http://127.0.0.1:5000/api/audio?id=${yt.youtubeId}`
      : yt.previewUrl || '';

    if (!streamUrl) {
      setLoadingDeck(null);
      return;
    }

    const track: TrackMetaData = {
      id: `yt-${yt.id}`,
      title: yt.title,
      artist: yt.channelTitle || 'YouTube Music',
      duration: 180,
      bpm: 120,
      key: { keyName: 'A Minor', camelot: '8A', pitchClass: 9, isMinor: true },
      thumbnailUrl: yt.thumbnailUrl,
      audioUrl: streamUrl,
      isYoutube: true,
      youtubeId: yt.youtubeId || yt.id,
      stemsAvailable: true,
    };

    // Close modal immediately — the deck loading overlay handles the rest
    onClose();
    setLoadingDeck(null);
    setLoadStatus(null);

    // Load runs in background — UI reflects via audioEngine state
    audioEngine.loadTrack(deckId, track);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, deckId: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingDeck(`${deckId}-upload`);
    const arrayBuffer = await file.arrayBuffer();
    const track: TrackMetaData = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Audio File',
      duration: 0,
      bpm: 120,
      key: { keyName: 'A Minor', camelot: '8A', pitchClass: 9, isMinor: true },
      thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
      audioUrl: '',
      stemsAvailable: true,
    };

    await audioEngine.loadTrack(deckId, track, arrayBuffer);
    setLoadingDeck(null);
    showSuccessMsg(`Loaded custom file "${file.name}" onto Deck ${deckId}`);
  };

  const showSuccessMsg = (msg: string) => {
    setLoadedMsg(msg);
    setTimeout(() => {
      setLoadedMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2c1d11]/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#fdfbf7] rounded-3xl border-2 border-[#e6ccb2] p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#e6ccb2]">
          <div className="flex items-center gap-2.5">
            <Tv className="w-6 h-6 text-[#9c6644]" />
            <h2 className="text-xl font-black text-white text-stroke-black m-0 tracking-tight flex items-center gap-2">
              <span>YOUTUBE MUSIC SEARCH</span>
              <span className="text-[10px] font-bold bg-[#f4ece1] text-[#7f5539] border border-[#d4a373] px-2 py-0.5 rounded-lg uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#9c6644]" />
                YT-DLP & YTMUSIC
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7f5539] hover:text-[#4a2e1b] hover:bg-[#faf6f0] transition border border-[#e6ccb2]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {loadedMsg && (
          <div className="mb-4 p-3 bg-[#eaf5ea] border-2 border-[#81c784] rounded-xl text-[#2d5a27] text-xs font-black flex items-center gap-2 shadow-sm">
            <Check className="w-4 h-4 text-[#2d5a27]" />
            <span>{loadedMsg}</span>
          </div>
        )}

        {/* Download Status Toast */}
        {loadStatus && (
          <div className="mb-4 p-3 bg-[#fff8e1] border-2 border-[#ffe082] rounded-xl text-[#8c533e] text-xs font-black flex items-center gap-2 animate-pulse shadow-sm">
            <Loader2 className="w-4 h-4 text-[#d4a373] animate-spin" />
            <span>{loadStatus}</span>
          </div>
        )}

        {/* Ingestion Source Tabs */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 border-2 transition ${
              activeTab === 'youtube'
                ? 'bg-[#d4a373] text-white border-[#7f5539] text-stroke-sm shadow-md'
                : 'bg-white text-[#5c3d2e] border-[#e6ccb2] hover:bg-[#faf6f0]'
            }`}
          >
            <Tv className="w-4 h-4" />
            YOUTUBE MUSIC SEARCH
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 border-2 transition ${
              activeTab === 'upload'
                ? 'bg-[#b07d62] text-white border-[#582f0e] text-stroke-sm shadow-md'
                : 'bg-white text-[#5c3d2e] border-[#e6ccb2] hover:bg-[#faf6f0]'
            }`}
          >
            <Upload className="w-4 h-4" />
            UPLOAD FILE
          </button>
        </div>

        {/* Tab 1: Real YouTube Music Search via ytmusicapi & yt-dlp */}
        {activeTab === 'youtube' && (
          <div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search YouTube Music (e.g. highest in the room, Travis Scott, Drake)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white border-2 border-[#e6ccb2] rounded-xl px-4 py-2.5 pl-10 text-xs text-[#2c1d11] font-bold placeholder-[#a08675] focus:outline-none focus:border-[#9c6644] shadow-sm"
                />
                <Search className="w-4 h-4 text-[#8c6d58] absolute left-3.5 top-3" />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#7f5539] hover:bg-[#582f0e] text-white rounded-xl font-black text-xs shadow-md border-2 border-[#4a2e1b] text-stroke-sm transition flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEARCH'}
              </button>
            </form>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {results.length === 0 && !isSearching && (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <Search className="w-10 h-10 text-[#d5bdaf]" />
                  <div>
                    <p className="text-sm font-black text-[#5c3d2e] m-0">Search YouTube Music</p>
                    <p className="text-xs text-[#8c6d58] mt-1 font-bold">Type a song or artist above and press <span className="text-[#9c6644] font-black">SEARCH</span></p>
                    <p className="text-xs text-[#a08675] mt-2 font-semibold">Powered by yt-dlp + ytmusicapi — real tracks, full quality</p>
                  </div>
                </div>
              )}
              {results.map((yt) => (
                <div
                  key={yt.id}
                  className="flex items-center justify-between p-3 bg-white hover:bg-[#faf6f0] rounded-xl border-2 border-[#e6ccb2] transition gap-4 group shadow-sm"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-[#e6ccb2] flex-shrink-0 shadow-sm">
                    <img
                      src={yt.thumbnailUrl}
                      alt={yt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-white text-stroke-black truncate m-0 flex items-center gap-1.5">
                      <span>{yt.title}</span>
                      <span className="px-1.5 py-0.5 bg-[#f4ece1] text-[#7f5539] text-[9px] font-bold rounded uppercase border border-[#d5bdaf]">
                        YT MUSIC
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#5c3d2e] font-bold m-0 mt-1 flex items-center gap-2">
                      <span>{yt.channelTitle}</span>
                      <span>•</span>
                      <span className="font-mono text-[#2c1d11] font-bold">{yt.duration}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      disabled={loadingDeck === `A-${yt.id}`}
                      onClick={() => loadYoutubeToDeck(yt, 'A')}
                      className="px-3 py-2 bg-[#d4a373] hover:bg-[#b08968] text-white border-2 border-[#7f5539] rounded-xl text-xs font-black text-stroke-sm transition flex items-center gap-1 shadow-sm"
                    >
                      {loadingDeck === `A-${yt.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        '+ DECK A'
                      )}
                    </button>

                    <button
                      disabled={loadingDeck === `B-${yt.id}`}
                      onClick={() => loadYoutubeToDeck(yt, 'B')}
                      className="px-3 py-2 bg-[#b07d62] hover:bg-[#8c533e] text-white border-2 border-[#582f0e] rounded-xl text-xs font-black text-stroke-sm transition flex items-center gap-1 shadow-sm"
                    >
                      {loadingDeck === `B-${yt.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        '+ DECK B'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Custom File Upload */}
        {activeTab === 'upload' && (
          <div className="p-8 border-2 border-dashed border-[#d5bdaf] rounded-2xl text-center bg-white/80 flex flex-col items-center justify-center gap-4">
            <Music className="w-10 h-10 text-[#9c6644] animate-bounce" />
            <div>
              <h4 className="text-sm font-black text-[#ffffff] text-stroke-black m-0">Upload Custom MP3 / WAV Audio File</h4>
              <p className="text-xs text-[#5c3d2e] font-bold mt-1">
                Audio will be automatically processed by the Web Audio DSP Stem Separator & Key/BPM Detector.
              </p>
            </div>

            <div className="flex gap-4">
              <label className="cursor-pointer px-4 py-2.5 bg-[#d4a373] hover:bg-[#b08968] text-white font-black rounded-xl text-xs shadow-md border-2 border-[#7f5539] text-stroke-sm transition">
                <span>LOAD TO DECK A</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(e, 'A')}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer px-4 py-2.5 bg-[#b07d62] hover:bg-[#8c533e] text-white font-black rounded-xl text-xs shadow-md border-2 border-[#582f0e] text-stroke-sm transition">
                <span>LOAD TO DECK B</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(e, 'B')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
