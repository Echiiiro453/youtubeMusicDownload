import re
from curl_cffi import requests as cffi_requests
res = cffi_requests.get('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', impersonate='chrome120')
html = res.text

# Try to find all track titles and artists in the HTML.
# Apple music usually has `"playParams":{"id":"...","kind":"song"}` near the song data.
# Also we can just look for `"name":"([^"]+)","artistName":"([^"]+)"` 
matches = re.findall(r'"artistName":"([^"]+)".*?"name":"([^"]+)"', html)
if not matches:
    matches = re.findall(r'"name":"([^"]+)".*?"artistName":"([^"]+)"', html)
unique_m = []
seen = set()
for m in matches:
    if m not in seen:
        seen.add(m)
        unique_m.append(m)
print(len(unique_m))
for m in unique_m[:5]: print(m)
