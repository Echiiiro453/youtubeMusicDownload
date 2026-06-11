import sys
import os

def build_apple_music_parser():
    return """def parse_apple_music(url: str):
    from curl_cffi import requests as cffi_requests
    import re
    from config import CHROME_IMPERSONATE
    
    res = cffi_requests.get(url, timeout=10, impersonate=CHROME_IMPERSONATE)
    html = res.text
    
    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    clean_title = ""
    if title_match:
        clean_title = re.sub(r' \| Spotify.*', '', title_match.group(1))
        clean_title = re.sub(r' on Apple Music.*', '', clean_title)
        clean_title = clean_title.replace("Song ·", "").replace("Album ·", "").strip()
    
    cover_match = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    cover_url = cover_match.group(1) if cover_match else ""
    
    token = None
    scripts = re.findall(r'<script[^>]+src="([^"]+/index[^"]+\\.js)"', html)
    if scripts:
        js_url = scripts[0]
        if js_url.startswith('/'): js_url = 'https://music.apple.com' + js_url
        try:
            js_res = cffi_requests.get(js_url, timeout=10, impersonate=CHROME_IMPERSONATE)
            for m in re.findall(r'"(eyJh[^"]+)"', js_res.text):
                if len(m) > 100:
                    token = m
                    break
        except:
            pass
    
    is_playlist_or_album = False
    entries = []
    
    url_match = re.search(r'/([a-z]{2})/(playlist|album)/[^/]+/([^/?]+)', url)
    
    if token and url_match:
        storefront = url_match.group(1)
        item_type = url_match.group(2)
        item_id = url_match.group(3)
        
        headers = {
            'authorization': f'Bearer {token}',
            'origin': 'https://music.apple.com'
        }
        
        api_url = f'https://amp-api.music.apple.com/v1/catalog/{storefront}/{item_type}s/{item_id}/tracks?limit=100'
        
        try:
            while api_url:
                api_res = cffi_requests.get(api_url, headers=headers, timeout=10, impersonate=CHROME_IMPERSONATE)
                if api_res.status_code != 200:
                    break
                    
                data = api_res.json()
                tracks_data = data.get('data', [])
                
                for idx, track in enumerate(tracks_data):
                    attrs = track.get('attributes', {})
                    t_title = attrs.get('name', '')
                    t_artist = attrs.get('artistName', '')
                    duration_ms = attrs.get('durationInMillis', 0)
                    
                    if t_title and t_artist:
                        sq = f"{t_artist} {t_title}".strip()
                        entries.append({
                            'id': f"apple_magic_{len(entries)}_{idx}",
                            'url': f"ytsearch1:{sq} audio",
                            'title': sq,
                            'duration': int(duration_ms / 1000) if duration_ms else 0,
                            'thumbnail': cover_url
                        })
                
                next_path = data.get('next')
                if next_path:
                    api_url = f'https://amp-api.music.apple.com{next_path}'
                else:
                    api_url = None
                    
            if entries:
                is_playlist_or_album = True
        except Exception as e:
            print(f"Apple Music API pagination failed: {e}")
    
    if not is_playlist_or_album:
        match = re.search(r'<script[^>]*type="application/ld\\\\+json"[^>]*>(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                import json
                data = json.loads(match.group(1))
                tracks = data.get('track', [])
                if tracks:
                    for idx, t in enumerate(tracks):
                        t_name = t.get('name', '')
                        artist_obj = t.get('byArtist', {})
                        t_artist = artist_obj.get('name', '') if isinstance(artist_obj, dict) else (artist_obj if artist_obj else '')
                        if t_name:
                            sq = f"{t_artist} {t_name}".strip()
                            entries.append({
                                'id': f"apple_magic_ld_{idx}",
                                'url': f"ytsearch1:{sq} audio",
                                'title': sq,
                                'duration': 0,
                                'thumbnail': cover_url
                            })
                    if entries:
                        is_playlist_or_album = True
            except Exception as e:
                print(f"Failed to parse Apple Music ld+json: {e}")
    
    if is_playlist_or_album:
        pseudo_playlist = {
            'title': clean_title if clean_title else "Apple Music Playlist",
            'uploader': 'Apple Music',
            'entries': entries,
            'thumbnail': cover_url
        }
        return pseudo_playlist, True, "Apple Music", cover_url, url
    elif clean_title:
        url = f"ytsearch1:{clean_title} audio"
        return None, True, "Apple Music", cover_url, url
        
    return None, False, None, None, url"""

import sys
with open('backend/magic_parsers.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'def parse_apple_music\(url: str\):.*?return None, False, None, None, url\n', build_apple_music_parser() + '\n', content, flags=re.DOTALL)

with open('backend/magic_parsers.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated magic_parsers.py")
