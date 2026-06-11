import sys
sys.path.insert(0, 'backend')
from magic_parsers import parse_apple_music

url = 'https://music.apple.com/us/album/1989-taylors-version/1699202591'
res = parse_apple_music(url)
print("Result is magic?", res[1])
if res[0]:
    print("Entries count:", len(res[0].get('entries', [])))
