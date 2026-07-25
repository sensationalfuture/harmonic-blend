import os
import json
import time
import tempfile
import threading
import numpy as np
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp

# Lazy-load heavy ML deps so server starts fast
_librosa = None
_soundfile = None
_demucs_available = False

def get_librosa():
    global _librosa
    if _librosa is None:
        import librosa
        _librosa = librosa
    return _librosa

def get_soundfile():
    global _soundfile
    if _soundfile is None:
        import soundfile as sf
        _soundfile = sf
    return _soundfile

# Try importing demucs
try:
    import demucs.separate
    import demucs.api
    _demucs_available = True
    print("✅ Demucs loaded — AI stem separation ready")
except ImportError:
    _demucs_available = False
    print("⚠️  Demucs not available — will use DSP fallback for stems")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize YouTube Music API
try:
    ytmusic = YTMusic()
    print("✅ ytmusicapi ready")
except Exception as e:
    print(f"⚠️  YTMusic init: {e}")
    ytmusic = None

# --- Camelot Wheel mapping ---
CAMELOT_MAP = {
    'C major':  {'camelot': '8B',  'keyName': 'C Major',  'pitchClass': 0,  'isMinor': False},
    'C# major': {'camelot': '3B',  'keyName': 'C# Major', 'pitchClass': 1,  'isMinor': False},
    'D major':  {'camelot': '10B', 'keyName': 'D Major',  'pitchClass': 2,  'isMinor': False},
    'D# major': {'camelot': '5B',  'keyName': 'Eb Major', 'pitchClass': 3,  'isMinor': False},
    'E major':  {'camelot': '12B', 'keyName': 'E Major',  'pitchClass': 4,  'isMinor': False},
    'F major':  {'camelot': '7B',  'keyName': 'F Major',  'pitchClass': 5,  'isMinor': False},
    'F# major': {'camelot': '2B',  'keyName': 'F# Major', 'pitchClass': 6,  'isMinor': False},
    'G major':  {'camelot': '9B',  'keyName': 'G Major',  'pitchClass': 7,  'isMinor': False},
    'G# major': {'camelot': '4B',  'keyName': 'Ab Major', 'pitchClass': 8,  'isMinor': False},
    'A major':  {'camelot': '11B', 'keyName': 'A Major',  'pitchClass': 9,  'isMinor': False},
    'A# major': {'camelot': '6B',  'keyName': 'Bb Major', 'pitchClass': 10, 'isMinor': False},
    'B major':  {'camelot': '1B',  'keyName': 'B Major',  'pitchClass': 11, 'isMinor': False},
    'C minor':  {'camelot': '5A',  'keyName': 'C Minor',  'pitchClass': 0,  'isMinor': True},
    'C# minor': {'camelot': '12A', 'keyName': 'C# Minor', 'pitchClass': 1,  'isMinor': True},
    'D minor':  {'camelot': '7A',  'keyName': 'D Minor',  'pitchClass': 2,  'isMinor': True},
    'D# minor': {'camelot': '2A',  'keyName': 'D# Minor', 'pitchClass': 3,  'isMinor': True},
    'E minor':  {'camelot': '9A',  'keyName': 'E Minor',  'pitchClass': 4,  'isMinor': True},
    'F minor':  {'camelot': '4A',  'keyName': 'F Minor',  'pitchClass': 5,  'isMinor': True},
    'F# minor': {'camelot': '11A', 'keyName': 'F# Minor', 'pitchClass': 6,  'isMinor': True},
    'G minor':  {'camelot': '6A',  'keyName': 'G Minor',  'pitchClass': 7,  'isMinor': True},
    'G# minor': {'camelot': '1A',  'keyName': 'G# Minor', 'pitchClass': 8,  'isMinor': True},
    'A minor':  {'camelot': '8A',  'keyName': 'A Minor',  'pitchClass': 9,  'isMinor': True},
    'A# minor': {'camelot': '3A',  'keyName': 'Bb Minor', 'pitchClass': 10, 'isMinor': True},
    'B minor':  {'camelot': '10A', 'keyName': 'B Minor',  'pitchClass': 11, 'isMinor': True},
}

# Krumhansl-Schmuckler key profiles (major and minor)
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

def analyze_audio(audio_path: str) -> dict:
    """Run librosa analysis for BPM and key on a local audio file."""
    librosa = get_librosa()
    
    # Load audio (mono, max 90s for performance)
    y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=90)
    
    # --- BPM Detection ---
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(np.round(tempo[0] if hasattr(tempo, '__len__') else tempo, 1))
    # Clamp to reasonable DJ range
    while bpm < 60:  bpm *= 2
    while bpm > 200: bpm /= 2

    # --- Key Detection via Chromagram + Krumhansl-Schmuckler ---
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)  # shape (12,)
    
    best_score = -np.inf
    best_key_str = 'A minor'
    
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    for i, note in enumerate(note_names):
        # Rotate chroma to match key root
        rotated = np.roll(chroma_mean, -i)
        
        # Normalize
        rotated = rotated / (np.linalg.norm(rotated) + 1e-8)
        major_n = MAJOR_PROFILE / (np.linalg.norm(MAJOR_PROFILE) + 1e-8)
        minor_n = MINOR_PROFILE / (np.linalg.norm(MINOR_PROFILE) + 1e-8)
        
        major_score = np.dot(rotated, major_n)
        minor_score = np.dot(rotated, minor_n)
        
        if major_score > best_score:
            best_score = major_score
            best_key_str = f'{note} major'
        if minor_score > best_score:
            best_score = minor_score
            best_key_str = f'{note} minor'
    
    key_info = CAMELOT_MAP.get(best_key_str, CAMELOT_MAP['A minor'])
    return {
        'bpm': bpm,
        'keyName': key_info['keyName'],
        'camelot': key_info['camelot'],
        'pitchClass': key_info['pitchClass'],
        'isMinor': key_info['isMinor'],
    }


def download_audio(video_id: str, output_path: str, fmt: str = 'bestaudio[ext=m4a]/bestaudio/best') -> str:
    """Download audio via yt-dlp to output_path. Returns actual output file path."""
    ydl_opts = {
        'format': fmt,
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'postprocessors': [],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
    
    # yt-dlp may add extension; find actual output file
    for ext in ['.m4a', '.mp4', '.webm', '.opus', '.ogg', '.mp3']:
        candidate = output_path + ext if not output_path.endswith(ext) else output_path
        if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
            return candidate
        # Also try without the base extension
        base = os.path.splitext(output_path)[0]
        candidate2 = base + ext
        if os.path.exists(candidate2) and os.path.getsize(candidate2) > 0:
            return candidate2
    
    # Fallback: return original if exists
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        return output_path
    raise FileNotFoundError(f"Could not find downloaded audio for {video_id}")


# --- ROUTES ---

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "backend": "yt-dlp & ytmusicapi active",
        "librosa": True,
        "demucs": _demucs_available,
    })


@app.route('/api/search', methods=['GET'])
def search_music():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    results = []

    # 1. Try YouTube Music Search via ytmusicapi
    if ytmusic:
        try:
            ytm_results = ytmusic.search(query, filter="songs", limit=10)
            for item in ytm_results:
                if item.get('videoId'):
                    video_id = item.get('videoId')
                    title = item.get('title', 'Unknown Title')
                    artists = ", ".join([a['name'] for a in item.get('artists', []) if 'name' in a]) or "Unknown Artist"
                    duration = item.get('duration', '03:30')
                    thumbnails = item.get('thumbnails', [])
                    thumb_url = thumbnails[-1]['url'] if thumbnails else f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'

                    results.append({
                        "id": video_id,
                        "title": f"{artists} - {title}",
                        "songName": title,
                        "artistName": artists,
                        "channelTitle": artists,
                        "duration": duration,
                        "thumbnailUrl": thumb_url,
                        "youtubeId": video_id,
                        "source": "ytmusicapi"
                    })
        except Exception as e:
            print(f"ytmusicapi search error: {e}")

    # 2. Fallback with yt-dlp search
    if len(results) == 0:
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'default_search': 'ytsearch5',
                'extract_flat': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch5:{query}", download=False)
                if info and 'entries' in info:
                    for entry in info['entries']:
                        if entry:
                            v_id = entry.get('id')
                            v_title = entry.get('title', query)
                            v_uploader = entry.get('uploader', 'YouTube Channel')
                            v_duration = entry.get('duration')
                            dur_str = f"{int(v_duration // 60)}:{int(v_duration % 60):02d}" if v_duration else "03:30"
                            results.append({
                                "id": v_id,
                                "title": v_title,
                                "songName": v_title,
                                "artistName": v_uploader,
                                "channelTitle": v_uploader,
                                "duration": dur_str,
                                "thumbnailUrl": f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
                                "youtubeId": v_id,
                                "source": "yt-dlp"
                            })
        except Exception as e:
            print(f"yt-dlp search error: {e}")

    return jsonify(results)


@app.route('/api/audio', methods=['GET', 'OPTIONS'])
def get_audio():
    if request.method == 'OPTIONS':
        resp = Response('', status=204)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    video_id = request.args.get('id', '').strip()
    if not video_id or len(video_id) < 5:
        return jsonify({"error": f"Invalid video ID: '{video_id}'"}), 400

    tmp = tempfile.NamedTemporaryFile(suffix='.m4a', delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        actual_path = download_audio(video_id, tmp_path)

        ext = os.path.splitext(actual_path)[1].lower()
        mime_map = {'.m4a': 'audio/mp4', '.mp4': 'audio/mp4', '.webm': 'audio/webm',
                    '.opus': 'audio/ogg; codecs=opus', '.ogg': 'audio/ogg',
                    '.mp3': 'audio/mpeg', '.aac': 'audio/aac'}
        mime_type = mime_map.get(ext, 'audio/mp4')
        file_size = os.path.getsize(actual_path)

        def generate_and_cleanup():
            try:
                with open(actual_path, 'rb') as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        yield chunk
            finally:
                try:
                    os.unlink(actual_path)
                    if actual_path != tmp_path and os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                except Exception:
                    pass

        response = Response(stream_with_context(generate_and_cleanup()), status=200, mimetype=mime_type)
        response.headers['Content-Length'] = str(file_size)
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Cache-Control'] = 'no-store'
        return response

    except Exception as e:
        print(f"Audio extraction error for {video_id}: {e}")
        for f in [tmp_path]:
            try:
                if os.path.exists(f): os.unlink(f)
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyze', methods=['GET'])
def analyze_track():
    """
    Returns real BPM and Key for a YouTube video using librosa.
    Downloads audio, analyzes, returns JSON, cleans up.
    """
    video_id = request.args.get('id', '').strip()
    if not video_id or len(video_id) < 5:
        return jsonify({"error": "Invalid video ID"}), 400

    tmp = tempfile.NamedTemporaryFile(suffix='.m4a', delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        actual_path = download_audio(video_id, tmp_path)
        analysis = analyze_audio(actual_path)
        print(f"✅ Analyzed {video_id}: {analysis['bpm']} BPM, {analysis['keyName']} ({analysis['camelot']})")
        return jsonify(analysis)

    except Exception as e:
        print(f"Analysis error for {video_id}: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        for f in [tmp_path]:
            try:
                if os.path.exists(f): os.unlink(f)
            except Exception:
                pass


@app.route('/api/stem', methods=['GET', 'OPTIONS'])
def get_stem():
    """
    AI Stem Separation using Facebook Demucs htdemucs model.
    Returns WAV audio for the requested stem: 'vocals' or 'instrumental'
    Falls back to DSP mid-side separation if Demucs not available.
    """
    if request.method == 'OPTIONS':
        resp = Response('', status=204)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    video_id = request.args.get('id', '').strip()
    stem_type = request.args.get('stem', 'vocals').strip().lower()  # 'vocals' or 'instrumental'

    if not video_id or len(video_id) < 5:
        return jsonify({"error": "Invalid video ID"}), 400
    if stem_type not in ('vocals', 'instrumental'):
        return jsonify({"error": "stem must be 'vocals' or 'instrumental'"}), 400

    # Download audio to temp file
    tmp = tempfile.NamedTemporaryFile(suffix='.m4a', delete=False)
    tmp_path = tmp.name
    tmp.close()

    tmp_dir = tempfile.mkdtemp()

    try:
        print(f"⏬ Downloading {video_id} for stem separation...")
        actual_path = download_audio(video_id, tmp_path)
        print(f"✅ Downloaded: {actual_path}")

        if _demucs_available:
            # --- DEMUCS ML Stem Separation ---
            print(f"🤖 Running Demucs htdemucs on {video_id}...")

            # Convert to WAV first so Demucs can read it
            librosa = get_librosa()
            sf = get_soundfile()
            y, sr = librosa.load(actual_path, sr=44100, mono=False)
            if y.ndim == 1:
                y = np.stack([y, y])  # mono -> stereo

            wav_input = os.path.join(tmp_dir, 'input.wav')
            sf.write(wav_input, y.T, sr, format='WAV')

            # Run Demucs separation
            import torch
            from demucs.pretrained import get_model
            from demucs.apply import apply_model
            import torchaudio

            model = get_model('htdemucs')
            model.eval()

            wav_tensor, file_sr = torchaudio.load(wav_input)
            if file_sr != model.samplerate:
                wav_tensor = torchaudio.functional.resample(wav_tensor, file_sr, model.samplerate)

            # Add batch dimension
            wav_tensor = wav_tensor.unsqueeze(0)

            with torch.no_grad():
                sources = apply_model(model, wav_tensor, overlap=0.25)

            # sources shape: (batch, stems, channels, time)
            # htdemucs stems order: drums, bass, other, vocals
            source_names = model.sources  # ['drums', 'bass', 'other', 'vocals']
            sources = sources[0]  # remove batch dim

            out_path = os.path.join(tmp_dir, f'{stem_type}.wav')

            if stem_type == 'vocals':
                vocals_idx = source_names.index('vocals')
                stem_audio = sources[vocals_idx].numpy()
            else:  # instrumental = drums + bass + other
                inst_stems = [i for i, n in enumerate(source_names) if n != 'vocals']
                stem_audio = sum(sources[i].numpy() for i in inst_stems)

            sf.write(out_path, stem_audio.T, model.samplerate, format='WAV')
            print(f"✅ Demucs {stem_type} stem ready: {out_path}")

        else:
            # --- DSP Fallback: Mid-Side separation ---
            print(f"⚙️  DSP mid-side separation for {video_id} ({stem_type})...")
            librosa = get_librosa()
            sf = get_soundfile()
            y, sr = librosa.load(actual_path, sr=44100, mono=False)

            if y.ndim == 1:
                y = np.stack([y, y])

            L, R = y[0], y[1]
            mid = (L + R) * 0.5
            side = (L - R) * 0.5

            if stem_type == 'vocals':
                out_audio = np.stack([mid, mid]) * 1.3
            else:
                out_audio = np.stack([L - mid * 0.7, R - mid * 0.7]) * 1.2

            out_path = os.path.join(tmp_dir, f'{stem_type}.wav')
            sf.write(out_path, out_audio.T, sr, format='WAV')

        # Stream WAV file to browser
        file_size = os.path.getsize(out_path)

        def stream_and_cleanup():
            try:
                with open(out_path, 'rb') as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        yield chunk
            finally:
                try:
                    import shutil
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    if os.path.exists(tmp_path): os.unlink(tmp_path)
                    if os.path.exists(actual_path) and actual_path != tmp_path:
                        os.unlink(actual_path)
                except Exception:
                    pass

        response = Response(stream_with_context(stream_and_cleanup()), status=200, mimetype='audio/wav')
        response.headers['Content-Length'] = str(file_size)
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Cache-Control'] = 'no-store'
        return response

    except Exception as e:
        print(f"Stem separation error for {video_id}: {e}")
        import shutil, traceback
        traceback.print_exc()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        for f in [tmp_path]:
            try:
                if os.path.exists(f): os.unlink(f)
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("Starting HarmonicBlend backend — yt-dlp + ytmusicapi + librosa + Demucs")
    print(f"  librosa: ✅  |  Demucs: {'✅' if _demucs_available else '⚠️  (DSP fallback)'}")
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)
