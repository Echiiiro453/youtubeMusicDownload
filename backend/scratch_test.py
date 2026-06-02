import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M', impersonate="chrome120")
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', res.text)
if match:
    data = json.loads(match.group(1))
    entity = data['props']['pageProps']['state']['data']['entity']
    print('Type:', entity['type'])
    track_list = entity.get('trackList', [])
    print('Found', len(track_list), 'tracks')
    for t in track_list[:3]:
        print(t['title'], '-', t['subtitle'])
