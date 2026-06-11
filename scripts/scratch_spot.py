import re
from curl_cffi import requests

r = requests.get('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', impersonate='chrome120')
match = re.search(r'"accessToken":"([^"]+)"', r.text)
if match:
    print("Found token:", match.group(1)[:50])
else:
    print("Not found token")

