"""
lyrics_fetcher.py
Busca e injeta letras de músicas nos arquivos de áudio após o download.
Suporta: MP3, FLAC, M4A/AAC
Providers: Musixmatch, Lrclib (via syncedlyrics)
"""
import os
import re


def _clean_title(title: str) -> str:
    """Remove suffixes like (Official Audio), (Lyrics), [HD], etc."""
    noise = [
        r'\(Official\s*(Music\s*)?Video\)',
        r'\(Official\s*Audio\)',
        r'\(Official\s*Lyric\s*Video\)',
        r'\(Official\s*Lyrics?\s*Video\)',
        r'\(Lyrics?\)',
        r'\(Letra\)',
        r'\(Audio\)',
        r'\[Official\s*(Music\s*)?Video\]',
        r'\[Official\s*Audio\]',
        r'\[Official\s*Lyric\s*Video\]',
        r'\[Official\s*Visualizer\]',
        r'\(Official\s*Visualizer\)',
        r'\[Visualizer\]',
        r'\(Visualizer\)',
        r'\[Lyrics?\]',
        r'\[HD\]',
        r'\[4K.*?\]',
        r'\(4K.*?\)',
        r'\(HQ\)',
        r'\[HQ\]',
        r'\(Explicit\)',
        r'\[Explicit\]',
        r'\(Extended\s*Mix\)',
        r'\(Radio\s*Edit\)',
        r'\(Live\)',
        r'\[Live\]',
        r'\(Slowed.*?\)',
        r'\[Slowed.*?\]',
        r'\(Sped\s*[Uu]p.*?\)',
        r'\[Sped\s*[Uu]p.*?\]',
    ]
    for pattern in noise:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)
    return title.strip(' -–—|')



def _build_search_query(title: str, artist: str) -> str:
    """
    Build a clean search query, avoiding duplicate artist names.
    If the artist name is already present in the title, use title only.
    """
    clean = _clean_title(title)
    
    if artist:
        # Normalize both for comparison
        title_lower = clean.lower()
        artist_lower = artist.lower().strip()
        
        # Check if artist name is already somewhere in the title
        if artist_lower and artist_lower in title_lower:
            return clean
        else:
            return f"{artist} {clean}".strip()
    
    return clean


def fetch_and_embed_lyrics(file_path: str, title: str, artist: str = '') -> bool:
    """
    Busca a letra da música e embute no arquivo de áudio.
    Retorna True se conseguiu injetar a letra, False caso contrário.
    """
    if not file_path or not os.path.exists(file_path):
        return False

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ('.mp3', '.flac', '.m4a', '.aac', '.ogg'):
        return False

    try:
        import syncedlyrics
    except ImportError:
        print("  [lyrics] syncedlyrics nao instalado, pulando.")
        return False

    search_query = _build_search_query(title, artist)
    print(f"  [lyrics] Buscando letra: '{search_query}'")

    # Lrclib only: open-source, no auth, no rate-limit, thread-safe.
    # Musixmatch removed: causes 401 spam after ~10 requests, not thread-safe.
    providers = ["Lrclib"]

    lyrics_text = None

    try:
        lyrics_text = syncedlyrics.search(search_query, providers=providers)
        if lyrics_text:
            print(f"  [lyrics] Letra sincronizada encontrada!")
    except Exception:
        pass

    if not lyrics_text:
        try:
            lyrics_text = syncedlyrics.search(search_query, providers=providers, plain_only=True)
            if lyrics_text:
                print(f"  [lyrics] Letra simples encontrada no LRCLIB.")
        except Exception:
            pass

    # FALLBACK: Se o LRCLIB falhar, nós usamos nosso raspador "hacker" do Genius!
    if not lyrics_text:
        print(f"  [lyrics] LRCLIB falhou. Acionando o raspador do Genius para: '{search_query}'")
        try:
            from curl_cffi import requests as curl_req
            from bs4 import BeautifulSoup
            
            # 1. Pesquisa na API invisível do Genius
            search_api = f"https://genius.com/api/search/multi?per_page=1&q={search_query}"
            res = curl_req.get(search_api, impersonate="chrome120", timeout=10)
            data = res.json()
            
            # Encontra a URL da letra
            hits = data.get("response", {}).get("sections", [])[0].get("hits", [])
            if hits:
                song_url = hits[0].get("result", {}).get("url")
                if song_url:
                    # 2. Raspa o HTML real para contornar a segurança deles
                    page_res = curl_req.get(song_url, impersonate="chrome120", timeout=10)
                    soup = BeautifulSoup(page_res.text, "html.parser")
                    lyrics_divs = soup.find_all("div", {"data-lyrics-container": "true"})
                    
                    if lyrics_divs:
                        extracted_text = []
                        for div in lyrics_divs:
                            # Adiciona quebras de linha limpas
                            extracted_text.append(div.get_text(separator="\n"))
                        
                        lyrics_text = "\n".join(extracted_text)
                        print(f"  [lyrics] Sucesso! Letra extraída à força do Genius!")
        except Exception as e:
            print(f"  [lyrics] Genius raspador falhou: {e}")

    if not lyrics_text:
        print(f"  [lyrics] Letra nao encontrada em nenhum lugar para: '{search_query}'")
        return False

    return _embed_lyrics(file_path, ext, lyrics_text)



def _embed_lyrics(file_path: str, ext: str, lyrics_text: str) -> bool:
    """Embeds lyrics into the audio file using mutagen."""
    try:
        if ext == '.mp3':
            from mutagen.mp3 import MP3
            from mutagen.id3 import ID3, USLT, Encoding
            audio = MP3(file_path, ID3=ID3)
            if audio.tags is None:
                audio.add_tags()
            audio.tags.delall('USLT')
            audio.tags.add(USLT(
                encoding=Encoding.UTF8,
                lang='und',
                desc='Lyrics',
                text=lyrics_text
            ))
            audio.save()
            print(f"  [lyrics] OK Letra injetada no MP3")
            return True

        elif ext == '.flac':
            from mutagen.flac import FLAC
            audio = FLAC(file_path)
            audio['LYRICS'] = lyrics_text
            audio.save()
            print(f"  [lyrics] OK Letra injetada no FLAC")
            return True

        elif ext in ('.m4a', '.aac'):
            from mutagen.mp4 import MP4
            audio = MP4(file_path)
            audio['\xa9lyr'] = [lyrics_text]
            audio.save()
            print(f"  [lyrics] OK Letra injetada no M4A")
            return True

    except Exception as e:
        print(f"  [lyrics] Erro ao injetar letra: {e}")

    return False


def _strip_lrc_timestamps(lrc_text: str) -> str:
    """Removes LRC timestamp tags, leaving only plain lyric lines."""
    lines = lrc_text.splitlines()
    plain_lines = []
    for line in lines:
        clean = re.sub(r'^\[\d{2}:\d{2}[.:]\d{2,3}\]\s*', '', line)
        # Skip metadata tags like [ar:Artist], [ti:Title]
        if re.match(r'^\[.*:.*\]$', clean.strip()):
            continue
        plain_lines.append(clean)
    return '\n'.join(plain_lines).strip()
