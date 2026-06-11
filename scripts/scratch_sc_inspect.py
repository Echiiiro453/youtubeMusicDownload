import re
import json
from curl_cffi import requests

url = 'https://soundcloud.com/user-55615878/sets/lofi-hip-hop'
res = requests.get(url, impersonate='chrome120', timeout=10)
html = res.text

with open('sc_debug.html', 'w', encoding='utf-8') as f:
    f.write(html)

hydration = re.search(r'window\.__sc_hydration = (\[.*?\]);</script>', html, re.DOTALL)
if hydration:
    data = json.loads(hydration.group(1))
    with open('sc_hydration.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Saved sc_hydration.json")
else:
    print("No hydration found")
