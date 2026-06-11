import sys
sys.path.insert(0, 'backend')
from magic_parsers import extract_magic_url

def test_url(name, url):
    print(f"\n--- Testing {name} ---")
    try:
        res = extract_magic_url(url)
        if res and res[1]:
            print(f"SUCCESS! is_magic={res[1]}, source={res[3]}")
            if res[0]:
                title = res[0].get('title', '').encode('ascii', 'ignore').decode()
                print(f"Returned Playlist Name: {title}")
                print(f"Total entries: {len(res[0].get('entries', []))}")
            else:
                print(f"Returned Single Track URL: {res[4]}")
        else:
            print("FAILED! Not recognized as magic or parsing failed.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    test_url("SoundCloud", "https://soundcloud.com/monstercat/sets/monstercat-uncaged-vol-1")
    test_url("Deezer Large", "https://www.deezer.com/br/playlist/908622995")
    test_url("Apple Music Large", "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb")
    test_url("Spotify Large", "https://open.spotify.com/playlist/54ZA9LXFvvFujmOVWXpHga")
