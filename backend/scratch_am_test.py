import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate="chrome120")
match = re.search(r'<script type="application/json" id="serialized-server-data">(.*?)</script>', res.text)
if not match:
    match = re.search(r'<script id="shoebox-media-api-cache-amp-music">(.*?)</script>', res.text)
    
if match:
    print('Found JSON data')
    try:
        data = json.loads(match.group(1))
        print('Parsed JSON keys:', data.keys())
    except Exception as e:
        print('Error parsing JSON:', e)
else:
    print('No JSON found. HTML snippet:')
    print(res.text[:1000])
