import re
from curl_cffi import requests
html = requests.get('https://soundcloud.com/user-55615878/sets/lofi-hip-hop', impersonate='chrome120', timeout=10).text
print('js_urls', len(re.findall(r'<script crossorigin src="([^"]+)"></script>', html)))
print('hydration', bool(re.search(r'window\.__sc_hydration = (\[.*?\]);</script>', html, re.DOTALL)))
