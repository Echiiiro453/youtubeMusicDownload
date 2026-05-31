from curl_cffi import requests
import re
import urllib.parse
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture


def clean_title(title: str) -> str:
    """
    Strips YouTube noise from a title for iTunes search and tag writing.
    Removes: (Official Video), [4K], (Explicit), (Slowed + Reverb), etc.
    """
    patterns = [
        r'\(Official\s*(Music\s*)?Video\)',
        r'\[Official\s*(Music\s*)?Video\]',
        r'\(Official\s*Audio\)',
        r'\[Official\s*Audio\]',
        r'\(Official\s*Lyric\s*Video\)',
        r'\[Official\s*Lyric\s*Video\]',
        r'\(Official\s*Lyrics?\s*Video\)',
        r'\(Official\s*Visualizer\)',
        r'\[Official\s*Visualizer\]',
        r'\(Lyrics?\)',
        r'\[Lyrics?\]',
        r'\(Letra\)',
        r'\(Audio\)',
        r'\[Audio\]',
        r'\[HD\]',
        r'\(HQ\)',
        r'\[HQ\]',
        r'\[4K.*?\]',
        r'\(4K.*?\)',
        r'\(Explicit\)',
        r'\[Explicit\]',
        r'\(Visualizer\)',
        r'\[Visualizer\]',
        r'\(Extended\s*Mix\)',
        r'\(Radio\s*Edit\)',
        r'\(Live.*?\)',
        r'\[Live.*?\]',
        r'\(Slowed.*?\)',
        r'\[Slowed.*?\]',
        r'\(Sped\s*[Uu]p.*?\)',
        r'\[Sped\s*[Uu]p.*?\]',
        r'\(NSFW\)',
        r'\[NSFW\]',
        # Generic: anything inside brackets/parens that contains these words
        r'\([^)]*(video|audio|mv|official|vevo|upgrade|remaster)[^)]*\)',
        r'\[[^\]]*(video|audio|mv|official|vevo|upgrade|remaster)[^\]]*\]',
    ]
    for p in patterns:
        title = re.sub(p, '', title, flags=re.IGNORECASE)

    # Normalize feat/ft for better iTunes search
    title = re.sub(r'(?i)\s+ft\.|\s+feat\.', ' ', title)

    # Collapse whitespace and strip
    title = re.sub(r'\s+', ' ', title)
    return title.strip(' -–—|')


def clean_title_for_tag(title: str) -> str:
    """
    Cleaner version for writing into the file tag — keeps feat. properly.
    """
    patterns = [
        r'\(Official\s*(Music\s*)?Video\)',
        r'\[Official\s*(Music\s*)?Video\]',
        r'\(Official\s*Audio\)',
        r'\[Official\s*Audio\]',
        r'\(Official\s*Lyric\s*Video\)',
        r'\[Official\s*Lyric\s*Video\]',
        r'\(Official\s*Lyrics?\s*Video\)',
        r'\(Official\s*Visualizer\)',
        r'\[Official\s*Visualizer\]',
        r'\(Lyrics?\)',
        r'\[Lyrics?\]',
        r'\(Letra\)',
        r'\(Audio\)',
        r'\[Audio\]',
        r'\[HD\]',
        r'\(HQ\)',
        r'\[HQ\]',
        r'\[4K.*?\]',
        r'\(4K.*?\)',
        r'\(Explicit\)',
        r'\[Explicit\]',
        r'\(Visualizer\)',
        r'\[Visualizer\]',
        r'\(Extended\s*Mix\)',
        r'\(Radio\s*Edit\)',
        r'\(Live.*?\)',
        r'\[Live.*?\]',
        r'\(Slowed.*?\)',
        r'\[Slowed.*?\]',
        r'\(Sped\s*[Uu]p.*?\)',
        r'\[Sped\s*[Uu]p.*?\]',
        r'\(NSFW\)',
        r'\[NSFW\]',
        r'\([^)]*(video|audio|mv|official|vevo|upgrade|remaster)[^)]*\)',
        r'\[[^\]]*(video|audio|mv|official|vevo|upgrade|remaster)[^\]]*\]',
    ]
    for p in patterns:
        title = re.sub(p, '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s+', ' ', title)
    return title.strip(' -–—|')


def apply_metadata(filepath: str, raw_title: str) -> bool:
    try:
        search_query = clean_title(raw_title)
        if not search_query: return False
        
        # Fallback clean title to use if iTunes doesn't find a match
        fallback_title = clean_title_for_tag(raw_title)
        
        # Request from iTunes API
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(search_query)}&entity=song&limit=1"
        res = requests.get(url, timeout=15, impersonate="chrome120")
        
        itunes_found = False
        track_name = fallback_title
        artist_name = ''
        album_name = ''
        cover_data = None

        if res.status_code == 200:
            data = res.json()
            if data.get('results'):
                track = data['results'][0]
                track_name = track.get('trackName', fallback_title)
                artist_name = track.get('artistName', '')
                album_name = track.get('collectionName', '')
                cover_url = track.get('artworkUrl100', '')
                itunes_found = True
                
                # Get 1000x1000 High Res cover
                if cover_url:
                    cover_url = cover_url.replace('100x100bb', '1000x1000bb')
                    cover_res = requests.get(cover_url, timeout=15, impersonate="chrome120")
                    cover_data = cover_res.content if cover_res.status_code == 200 else None

        # Always write at minimum the cleaned title (even if iTunes failed)
        if filepath.lower().endswith('.mp3'):
            audio = MP3(filepath, ID3=ID3)
            if audio.tags is None: audio.add_tags()
            audio.tags.add(TIT2(encoding=3, text=track_name))
            if artist_name:
                audio.tags.add(TPE1(encoding=3, text=artist_name))
            if album_name:
                audio.tags.add(TALB(encoding=3, text=album_name))
            if cover_data:
                audio.tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=cover_data))
            audio.save()
            
        elif filepath.lower().endswith('.m4a') or filepath.lower().endswith('.mp4'):
            audio = MP4(filepath)
            audio.tags['©nam'] = track_name
            if artist_name: audio.tags['©ART'] = artist_name
            if album_name: audio.tags['©alb'] = album_name
            if cover_data:
                audio.tags['covr'] = [MP4Cover(cover_data, imageformat=MP4Cover.FORMAT_JPEG)]
            audio.save()
            
        elif filepath.lower().endswith('.flac'):
            audio = FLAC(filepath)
            audio['title'] = track_name
            if artist_name: audio['artist'] = artist_name
            if album_name: audio['album'] = album_name
            if cover_data:
                pic = Picture()
                pic.type = 3
                pic.mime = 'image/jpeg'
                pic.desc = 'Cover'
                pic.data = cover_data
                audio.clear_pictures()
                audio.add_picture(pic)
            audio.save()
            
        if itunes_found:
            return True
        else:
            # iTunes didn't find, but we still cleaned the title tag
            print(f"      \033[90m[metadata] iTunes nao encontrou, titulo limpo aplicado: '{track_name}'\033[0m")
            return False

    except Exception as e:
        print(f"      \033[90m[metadata:warn] Falha ao aplicar metadados do iTunes: {e}\033[0m")
        return False
