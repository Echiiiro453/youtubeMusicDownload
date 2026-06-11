import re
import sys
import json
sys.path.insert(0, 'backend')
from curl_cffi import requests
from config import CHROME_IMPERSONATE

url = 'https://soundcloud.com/user-55615878/sets/lofi-hip-hop'
html = requests.get(url, impersonate=CHROME_IMPERSONATE, timeout=10).text
js_urls = re.findall(r'<script crossorigin src="([^"]+)"></script>', html)
client_id = None
for j_url in js_urls:
    js_code = requests.get(j_url, impersonate=CHROME_IMPERSONATE, timeout=10).text
    match = re.search(r'client_id:"([^"]+)"', js_code)
    if match:
        client_id = match.group(1)
        break

if client_id:
    print("Got client id")
    hydration = re.search(r'window\.__sc_hydration = (\[.*?\]);</script>', html, re.DOTALL)
    if hydration:
        print("Got hydration")
        data = json.loads(hydration.group(1))
        for item in data:
            if 'data' in item and isinstance(item['data'], dict) and 'tracks' in item['data']:
                print("Got data tracks")
                playlist = item['data']
                clean_title = playlist.get('title', 'SoundCloud Playlist')
                track_ids = [str(t['id']) for t in playlist['tracks']]
                
                api_url = f"https://api-v2.soundcloud.com/tracks?ids={','.join(track_ids)}&client_id={client_id}"
                print("API URL", api_url)
                res = requests.get(api_url, impersonate=CHROME_IMPERSONATE, timeout=10)
                print("API status", res.status_code)
                if res.status_code == 200:
                    print("SUCCESS")
