import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate="chrome120")
match = re.search(r'<script type="application/json" id="serialized-server-data">(.*?)</script>', res.text)
if match:
    data = json.loads(match.group(1))
    print(type(data))
    if isinstance(data, list):
        print(len(data))
        for item in data:
            if 'data' in item and 'sections' in item['data']:
                for sec in item['data']['sections']:
                    if sec.get('itemKind') == 'track':
                        print("Found tracks section")
                        for t in sec['items'][:3]:
                            print(t['title'], t['artistName'])
