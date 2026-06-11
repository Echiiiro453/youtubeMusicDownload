import sys
import base64
from curl_cffi import requests

# from spotdl
CLIENT_ID = "5f573c9620494bae87890c0f08a60293"
CLIENT_SECRET = "212476d9b0f3472eaa762d90b19b0ba8"

def get_token():
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    b64_auth_str = base64.b64encode(auth_str.encode()).decode()
    headers = {
        "Authorization": f"Basic {b64_auth_str}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    res = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data, impersonate="chrome120")
    return res.json().get("access_token")

def fetch_playlist_tracks(playlist_id):
    token = get_token()
    if not token:
        print("Failed to get token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
    
    res = requests.get(url, headers=headers, impersonate="chrome120")
    data = res.json()
    playlist_name = data.get('name', 'Spotify Playlist')
    owner = data.get('owner', {}).get('display_name', 'Spotify')
    cover_url = ''
    if data.get('images'):
        cover_url = data['images'][0]['url']
        
    entries = []
    
    tracks_url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks?limit=100"
    while tracks_url:
        res = requests.get(tracks_url, headers=headers, impersonate="chrome120")
        if res.status_code != 200:
            print("Failed to fetch tracks")
            break
        page_data = res.json()
        for item in page_data.get('items', []):
            track = item.get('track')
            if not track: continue
            
            t_name = track.get('name', '')
            t_artists = ", ".join([a.get('name', '') for a in track.get('artists', [])])
            duration_ms = track.get('duration_ms', 0)
            t_cover = ''
            if track.get('album', {}).get('images'):
                t_cover = track['album']['images'][0]['url']
                
            sq = f"{t_artists} {t_name}".strip()
            entries.append({
                'id': f"spotify_magic_{len(entries)}",
                'url': f"ytsearch1:{sq} audio",
                'title': sq,
                'duration': int(duration_ms / 1000),
                'thumbnail': t_cover or cover_url
            })
            
        tracks_url = page_data.get('next')
        
    print(f"Fetched {len(entries)} tracks for '{playlist_name}'")

if __name__ == '__main__':
    fetch_playlist_tracks("54ZA9LXFvvFujmOVWXpHga")
