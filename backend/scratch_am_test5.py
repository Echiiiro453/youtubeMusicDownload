import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate="chrome120")
match = re.search(r'<script type="application/json" id="serialized-server-data">(.*?)</script>', res.text)
if match:
    data = json.loads(match.group(1))
    
    def find_tracks(d):
        if isinstance(d, dict):
            if 'relationships' in d and 'tracks' in d['relationships']:
                return d['relationships']['tracks'].get('data', [])
            if 'items' in d and isinstance(d['items'], list) and len(d['items']) > 0 and d['items'][0].get('type') == 'songs':
                return d['items']
            for v in d.values():
                res = find_tracks(v)
                if res: return res
        elif isinstance(d, list):
            for i in d:
                res = find_tracks(i)
                if res: return res
        return []
        
    tracks = find_tracks(data)
    print("Found", len(tracks))
    for t in tracks[:3]:
        print(t.get('attributes', {}).get('artistName'), '-', t.get('attributes', {}).get('name'))
