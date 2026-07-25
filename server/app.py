import os
import json
import requests
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize YouTube Music API
try:
    ytmusic = YTMusic()
except Exception as e:
    print(f"YTMusic init info: {e}")
    ytmusic = None

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "backend": "yt-dlp & ytmusicapi active"})

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
                if item.get('resultType') == 'song' or item.get('videoId'):
                    video_id = item.get('videoId')
                    title = item.get('title', 'Unknown Title')
                    
                    artists = ", ".join([a['name'] for a in item.get('artists', []) if 'name' in a]) or "Unknown Artist"
                    duration = item.get('duration', '03:30')
                    
                    thumbnails = item.get('thumbnails', [])
                    thumb_url = thumbnails[-1]['url'] if thumbnails else 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80'

                    results.append({
                        "id": video_id,
                        "title": f"{artists} - {title}" if artists != "Unknown Artist" else title,
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

    # 2. Fallback / Augment with yt-dlp search if needed
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

@app.route('/api/audio', methods=['GET'])
def get_audio():
    video_id = request.args.get('id', '').strip()
    url = request.args.get('url', '').strip()

    if not video_id and not url:
        return jsonify({"error": "Missing video id or url"}), 400

    target_url = url if url else f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            audio_url = info.get('url')
            
            if not audio_url:
                return jsonify({"error": "Could not extract audio stream URL"}), 500

            # Stream audio bytes directly to the browser with CORS headers!
            req = requests.get(audio_url, stream=True, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            })

            response = Response(
                stream_with_context(req.iter_content(chunk_size=1024 * 64)),
                content_type=req.headers.get('Content-Type', 'audio/webm')
            )
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = '*'
            return response

    except Exception as e:
        print(f"Audio extraction error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting HarmonicBlend yt-dlp & ytmusicapi backend server on port 5000...")
    app.run(host='127.0.0.1', port=5000, debug=True)
