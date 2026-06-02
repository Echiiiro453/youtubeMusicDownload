import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate="chrome120")
match = re.search(r'<script id="shoebox-media-api-cache-amp-music">(.*?)</script>', res.text)
if match:
    data = json.loads(match.group(1))
    keys = list(data.keys())
    if keys:
        first_key = keys[0]
        try:
            d = json.loads(data[first_key])
            print("Successfully loaded first key JSON")
            if isinstance(d, dict) and 'data' in d:
                d = d['data']
            if isinstance(d, list) and len(d) > 0:
                print("List found!")
                item = d[0]
                if 'relationships' in item and 'tracks' in item['relationships']:
                    tracks = item['relationships']['tracks']['data']
                    print('Found tracks:', len(tracks))
                    for t in tracks[:3]:
                        print(t['attributes']['artistName'], '-', t['attributes']['name'])
        except Exception as e:
            print("Error parsing nested:", e)
