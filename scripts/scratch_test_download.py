import sys
sys.path.insert(0, 'backend')

import asyncio
from main import parse_magic_url

async def test_download():
    print("Parsing playlist...")
    res = parse_magic_url('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
    entries = res[1]['entries']
    first_track = entries[0]
    print("First track to download:", first_track['title'])
    print("Query:", first_track['url'])
    
    # Simulate extraction/download via yt-dlp directly instead of full queue to see the logs
    import yt_dlp
    opts = {
        'format': 'bestaudio',
        'noplaylist': True,
        'quiet': False
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        try:
            info = ydl.extract_info(first_track['url'], download=False)
            print("Successfully extracted info!")
            if 'entries' in info and len(info['entries']) > 0:
                print("Found:", info['entries'][0]['title'])
            else:
                print("Found:", info.get('title'))
        except Exception as e:
            print("Extraction failed:", e)

if __name__ == '__main__':
    asyncio.run(test_download())
