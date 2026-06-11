import re
from curl_cffi import requests
import json

def test():
    res = requests.get('https://open.spotify.com/embed/playlist/54ZA9LXFvvFujmOVWXpHga', impersonate='chrome120')
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', res.text)
    if not match:
        print("No NEXT_DATA")
        return
    data = json.loads(match.group(1))
    tracks = data['props']['pageProps']['state']['data']['entity']['trackList']
    print(f"Total tracks in embed: {len(tracks)}")

if __name__ == "__main__":
    test()
