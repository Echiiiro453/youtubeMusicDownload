import requests
import json
print("Testing Apple Music")
res = requests.post('http://127.0.0.1:8000/info', json={"url": "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb", "quality": "best", "mode": "audio", "pitch": 0, "speed": 1})
try:
    print(len(res.json().get('playlist_videos', [])))
    print(res.json().get('playlist_videos', [])[:2])
except Exception as e:
    print("Error:", e, res.text)
    
print("\nTesting Spotify")
res = requests.post('http://127.0.0.1:8000/info', json={"url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", "quality": "best", "mode": "audio", "pitch": 0, "speed": 1})
try:
    print(len(res.json().get('playlist_videos', [])))
    print(res.json().get('playlist_videos', [])[:2])
except Exception as e:
    print("Error:", e, res.text)
