import requests
import re
import urllib.parse
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture

def clean_title(title: str) -> str:
    # Remove tags comuns de YouTube
    title = re.sub(r'(?i)\(official.*?\)', '', title)
    title = re.sub(r'(?i)\[official.*?\]', '', title)
    title = re.sub(r'(?i)\(lyric.*?\)', '', title)
    title = re.sub(r'(?i)\[lyric.*?\]', '', title)
    title = re.sub(r'(?i)\(music video.*?\)', '', title)
    title = re.sub(r'(?i)\[music video.*?\]', '', title)
    
    # Remove itens genéricos entre parênteses ou colchetes caso contenham palavras como video, audio, mv
    title = re.sub(r'(?i)\([^)]*(video|audio|mv)[^)]*\)', '', title)
    title = re.sub(r'(?i)\[[^\]]*(video|audio|mv)[^\]]*\]', '', title)
    
    # Substituir feat/ft para que o iTunes pesquise melhor
    title = re.sub(r'(?i)\s+ft\.|\s+feat\.', ' ', title)
    
    # Remove caracteres especiais bizarros mas MANTÉM acentuação (diferente da antiga RegEx)
    # \w engloba [a-zA-Z0-9_] E caracteres acentuados em unicode.
    title = re.sub(r'[^\w\s\-&,]', '', title)
    
    # Remove espaços duplos
    title = re.sub(r'\s+', ' ', title)
    return title.strip()

def apply_metadata(filepath: str, raw_title: str) -> bool:
    try:
        search_query = clean_title(raw_title)
        if not search_query: return False
        
        # Request from iTunes API
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(search_query)}&entity=song&limit=1"
        res = requests.get(url, timeout=5)
        if res.status_code != 200: return False
        
        data = res.json()
        if not data.get('results'): return False
        
        track = data['results'][0]
        track_name = track.get('trackName', '')
        artist_name = track.get('artistName', '')
        album_name = track.get('collectionName', '')
        cover_url = track.get('artworkUrl100', '')
        
        # Get 1000x1000 High Res cover
        if cover_url:
            cover_url = cover_url.replace('100x100bb', '1000x1000bb')
            cover_res = requests.get(cover_url, timeout=5)
            cover_data = cover_res.content if cover_res.status_code == 200 else None
        else:
            cover_data = None
            
        # Apply based on extension
        if filepath.lower().endswith('.mp3'):
            audio = MP3(filepath, ID3=ID3)
            if audio.tags is None: audio.add_tags()
            audio.tags.add(TIT2(encoding=3, text=track_name))
            audio.tags.add(TPE1(encoding=3, text=artist_name))
            audio.tags.add(TALB(encoding=3, text=album_name))
            if cover_data:
                audio.tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=cover_data))
            audio.save()
            
        elif filepath.lower().endswith('.m4a') or filepath.lower().endswith('.mp4'):
            audio = MP4(filepath)
            audio.tags['\xa9nam'] = track_name
            audio.tags['\xa9ART'] = artist_name
            audio.tags['\xa9alb'] = album_name
            if cover_data:
                audio.tags['covr'] = [MP4Cover(cover_data, imageformat=MP4Cover.FORMAT_JPEG)]
            audio.save()
            
        elif filepath.lower().endswith('.flac'):
            audio = FLAC(filepath)
            audio['title'] = track_name
            audio['artist'] = artist_name
            audio['album'] = album_name
            if cover_data:
                pic = Picture()
                pic.type = 3
                pic.mime = 'image/jpeg'
                pic.desc = 'Cover'
                pic.data = cover_data
                audio.clear_pictures()
                audio.add_picture(pic)
            audio.save()
            
        return True
    except Exception as e:
        print(f"      \033[90m[metadata:warn] Falha ao aplicar metadados do iTunes: {e}\033[0m")
        return False
