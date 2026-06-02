import requests, re, json
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate="chrome120")
match = re.search(r'<script type="application/json" id="serialized-server-data">(.*?)</script>', res.text)
if match:
    data = json.loads(match.group(1))
    print(list(data[0]['data'].keys()))
    print(list(data[0]['data']['seoData']['itunes-web-amc'].keys()))
