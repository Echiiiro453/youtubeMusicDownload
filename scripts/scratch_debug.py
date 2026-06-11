import re
import sys
sys.path.insert(0, 'backend')
from curl_cffi import requests
from config import CHROME_IMPERSONATE

def debug_sc():
    url = 'https://soundcloud.com/user-55615878/sets/lofi-hip-hop'
    html = requests.get(url, impersonate=CHROME_IMPERSONATE, timeout=10).text
    js_urls = re.findall(r'<script crossorigin src="([^"]+)"></script>', html)
    client_id = None
    for j_url in js_urls:
        js_code = requests.get(j_url, impersonate=CHROME_IMPERSONATE, timeout=10).text
        match = re.search(r'client_id:"([^"]+)"', js_code)
        if match:
            client_id = match.group(1)
            print("Found SC client_id:", client_id)
            break
    if not client_id:
        print("SC client_id not found")

def debug_apple():
    url = "https://music.apple.com/us/album/1989-taylors-version/1699202591"
    res = requests.get(url, timeout=10, impersonate=CHROME_IMPERSONATE)
    html = res.text
    token = None
    scripts = re.findall(r'<script[^>]+src="([^"]+/index[^"]+\.js)"', html)
    print("Apple scripts found:", len(scripts))
    if scripts:
        js_url = scripts[0]
        if js_url.startswith('/'): js_url = 'https://music.apple.com' + js_url
        js_res = requests.get(js_url, timeout=10, impersonate=CHROME_IMPERSONATE)
        for m in re.findall(r'"(eyJh[^"]+)"', js_res.text):
            if len(m) > 100:
                token = m
                print("Found Apple Token:", token[:20] + "...")
                break
    if not token:
        print("Apple Token not found")

if __name__ == '__main__':
    debug_sc()
    debug_apple()
