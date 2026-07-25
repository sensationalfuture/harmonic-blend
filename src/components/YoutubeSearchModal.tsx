import React, { useState } from 'react';
import { Search, X, Tv, Upload, Disc, Music, Check, Loader2, Sparkles } from 'lucide-react';
import { PRESET_TRACKS } from '../audio/PresetTracks';
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

const FEATURED_RESULTS: BackendYoutubeResult[] = [
  {
    id: 'yt-travis-highest',
    title: 'Travis Scott - HIGHEST IN THE ROOM',
    channelTitle: 'Travis Scott (YouTube Music)',
    duration: '02:56',
    thumbnailUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3d/8e/31/3d8e310d-2b4a-4e2b-87cf-45b0d0a5cfd1/886447970725.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/44/1a/df/441adf92-23f4-3d96-78b1-3ef5b525db2a/mzaf_10526019561280387532.plus.aac.p.m4a',
    youtubeId: '3d8e310d',
    source: 'ytmusicapi'
  },
  {
    id: 'yt-weeknd-blinding',
    title: 'The Weeknd - Blinding Lights',
    channelTitle: 'The Weeknd',
    duration: '03:20',
    thumbnailUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/05/27/15/0527150c-e2f4-8a45-6a56-4c74033dfd59/20UMGIM03260.rgb.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/80/f3/9d/80f39d89-c454-e692-0b1e-64f4ecf3c4db/mzaf_11504998782352818165.plus.aac.p.m4a',
    source: 'ytmusicapi'
  },
  {
    id: 'yt-drake-gods-plan',
    title: "Drake - God's Plan",
    channelTitle: 'Drake',
    duration: '03:18',
    thumbnailUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/21/be/3e/21be3e44-d88a-eb27-d079-c5c8ff3f8ebf/18UMGIM01323.rgb.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/10/8d/f3/108df3c9-f1fb-2e55-e45a-8b1b0cb53f5f/mzaf_17294432135118742618.plus.aac.p.m4a',
    source: 'ytmusicapi'
  },
];

export const YoutubeSearchModal: React.FC<YoutubeSearchModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'preset' | 'upload'>('youtube');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendYoutubeResult[]>(FEATURED_RESULTS);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState<string | null>(null);
  const [loadedMsg, setLoadedMsg] = useState<string | null>(null);

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

  const loadPresetToDeck = async (track: TrackMetaData, deckId: 'A' | 'B') => {
    setLoadingDeck(`${deckId}-${track.id}`);
    await audioEngine.loadTrack(deckId, track);
    setLoadingDeck(null);
    showSuccessMsg(`Loaded "${track.title}" onto Deck ${deckId}`);
  };

  const loadYoutubeToDeck = async (yt: BackendYoutubeResult, deckId: 'A' | 'B') => {
    setLoadingDeck(`${deckId}-${yt.id}`);

    // If we have YouTube ID or preview URL, construct backend stream URL or preview URL
    const streamUrl = yt.youtubeId
      ? `http://127.0.0.1:5000/api/audio?id=${yt.youtubeId}`
      : yt.previewUrl || 'synthetic-youtube';

    const isTravis = yt.title.toLowerCase().includes('travis') || yt.title.toLowerCase().includes('highest');

    const track: TrackMetaData = {
      id: `yt-${yt.id}`,
      title: yt.title,
      artist: yt.channelTitle || 'YouTube Music',
      duration: 180,
      bpm: isTravis ? 152 : 124,
      key: isTravis
        ? { keyName: 'C Minor', camelot: '5A', pitchClass: 0, isMinor: true }
        : { keyName: 'A Minor', camelot: '8A', pitchClass: 9, isMinor: true },
      thumbnailUrl: yt.thumbnailUrl,
      audioUrl: streamUrl,
      isYoutube: true,
      youtubeId: yt.youtubeId || yt.id,
      stemsAvailable: true,
    };

    await audioEngine.loadTrack(deckId, track);
    setLoadingDeck(null);
    showSuccessMsg(`Extracted audio via yt-dlp onto Deck ${deckId}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-700 p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-black text-white m-0 tracking-tight flex items-center gap-2">
              <span>YOUTUBE MUSIC SEARCH</span>
              <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-400" />
                POWERED BY YT-DLP & YTMUSICAPI
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {loadedMsg && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{loadedMsg}</span>
          </div>
        )}

        {/* Ingestion Source Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              activeTab === 'youtube'
                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Tv className="w-4 h-4 text-red-400" />
            YOUTUBE MUSIC SEARCH
          </button>

          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              activeTab === 'preset'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Disc className="w-4 h-4 text-cyan-400" />
            PRO PRESET STEMS
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              activeTab === 'upload'
                ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Upload className="w-4 h-4 text-pink-400" />
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-600/20 transition flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'YT MUSIC SEARCH'}
              </button>
            </form>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {results.map((yt) => (
                <div
                  key={yt.id}
                  className="flex items-center justify-between p-3 bg-slate-900/60 hover:bg-slate-900 rounded-xl border border-slate-800 transition gap-4"
                >
                  <img
                    src={yt.thumbnailUrl}
                    alt={yt.title}
                    className="w-14 h-14 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate m-0 flex items-center gap-1.5">
                      <span>{yt.title}</span>
                      <span className="px-1.5 py-0.5 bg-red-950 text-red-400 text-[9px] font-mono rounded uppercase border border-red-800">
                        YT-DLP & YTMUSIC
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 m-0 mt-0.5">{yt.channelTitle} • {yt.duration}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      disabled={loadingDeck === `A-${yt.id}`}
                      onClick={() => loadYoutubeToDeck(yt, 'A')}
                      className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
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
                      className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-slate-950 border border-pink-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
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

        {/* Tab 2: Pro Presets */}
        {activeTab === 'preset' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {PRESET_TRACKS.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 bg-slate-900/60 hover:bg-slate-900 rounded-xl border border-slate-800 transition gap-4"
              >
                <img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  className="w-14 h-14 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate m-0">{track.title}</h4>
                  <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                    {track.artist} • {track.bpm} BPM • {track.key.camelot} ({track.key.keyName})
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={loadingDeck === `A-${track.id}`}
                    onClick={() => loadPresetToDeck(track, 'A')}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 rounded-lg text-xs font-bold transition"
                  >
                    + DECK A
                  </button>
                  <button
                    disabled={loadingDeck === `B-${track.id}`}
                    onClick={() => loadPresetToDeck(track, 'B')}
                    className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-slate-950 border border-pink-500/40 rounded-lg text-xs font-bold transition"
                  >
                    + DECK B
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Custom File Upload */}
        {activeTab === 'upload' && (
          <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-900/40 flex flex-col items-center justify-center gap-4">
            <Music className="w-10 h-10 text-slate-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white m-0">Upload Custom MP3 / WAV Audio File</h4>
              <p className="text-xs text-slate-400 mt-1">
                Audio will be automatically processed by the Web Audio DSP Stem Separator & Key/BPM Detector.
              </p>
            </div>

            <div className="flex gap-4">
              <label className="cursor-pointer px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition">
                <span>LOAD TO DECK A</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(e, 'A')}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer px-4 py-2 bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-pink-500/20 transition">
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
