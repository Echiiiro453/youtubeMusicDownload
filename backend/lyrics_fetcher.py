"""
lyrics_fetcher.py
Busca e injeta letras de músicas nos arquivos de áudio após o download.
Suporta: MP3, FLAC, M4A/AAC
Providers: Musixmatch, Genius, AZLyrics (via syncedlyrics)
"""
import os

def fetch_and_embed_lyrics(file_path: str, title: str, artist: str = '') -> bool:
    """
    Busca a letra da música e embute no arquivo de áudio.
    Retorna True se conseguiu injetar a letra, False caso contrário.
    """
    if not file_path or not os.path.exists(file_path):
        return False

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ('.mp3', '.flac', '.m4a', '.aac', '.ogg'):
        print(f"  [lyrics] Formato {ext} nao suportado para letras.")
        return False

    try:
        import syncedlyrics
    except ImportError:
        print("  [lyrics] syncedlyrics nao instalado, pulando.")
        return False

    search_query = f"{artist} {title}".strip() if artist else title
    print(f"  [lyrics] Buscando letra: {search_query}")

    # Try synced lyrics first (with timestamps), fall back to plain
    lyrics_text = None
    is_synced = False

    try:
        lyrics_text = syncedlyrics.search(search_query)
        if lyrics_text:
            is_synced = True
            print(f"  [lyrics] Letra SINCRONIZADA encontrada!")
    except Exception as e:
        print(f"  [lyrics] Erro ao buscar letra sincronizada: {e}")

    if not lyrics_text:
        try:
            lyrics_text = syncedlyrics.search(search_query, plain_only=True)
            if lyrics_text:
                print(f"  [lyrics] Letra SIMPLES encontrada.")
        except Exception as e:
            print(f"  [lyrics] Erro ao buscar letra simples: {e}")

    if not lyrics_text:
        print(f"  [lyrics] Letra nao encontrada para: {search_query}")
        return False

    return _embed_lyrics(file_path, ext, lyrics_text, is_synced)


def _embed_lyrics(file_path: str, ext: str, lyrics_text: str, is_synced: bool) -> bool:
    """Embeds lyrics into the audio file using mutagen."""
    try:
        from mutagen.id3 import ID3, USLT, SYLT, Encoding
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.mp4 import MP4
    except ImportError:
        print("  [lyrics] mutagen nao instalado.")
        return False

    try:
        if ext == '.mp3':
            audio = MP3(file_path, ID3=ID3)
            if audio.tags is None:
                audio.add_tags()

            # Remove old lyrics tags if exist
            audio.tags.delall('USLT')
            audio.tags.delall('SYLT')

            # Embed as plain/unsynced (USLT) - most player compatible
            # Strip LRC timestamps for USLT if needed
            plain_lyrics = _strip_lrc_timestamps(lyrics_text)
            audio.tags.add(USLT(
                encoding=Encoding.UTF8,
                lang='por',
                desc='Lyrics',
                text=plain_lyrics
            ))
            audio.save()
            print(f"  [lyrics] OK Letra injetada no MP3 (USLT tag)")
            return True

        elif ext == '.flac':
            audio = FLAC(file_path)
            plain_lyrics = _strip_lrc_timestamps(lyrics_text)
            audio['LYRICS'] = plain_lyrics
            audio.save()
            print(f"  [lyrics] OK Letra injetada no FLAC")
            return True

        elif ext in ('.m4a', '.aac'):
            audio = MP4(file_path)
            plain_lyrics = _strip_lrc_timestamps(lyrics_text)
            audio['\xa9lyr'] = [plain_lyrics]
            audio.save()
            print(f"  [lyrics] OK Letra injetada no M4A")
            return True

    except Exception as e:
        print(f"  [lyrics] Erro ao injetar letra: {e}")
        return False

    return False


def _strip_lrc_timestamps(lrc_text: str) -> str:
    """
    Removes LRC timestamp tags like [00:25.50] from lyrics text,
    leaving only the plain lyric lines.
    """
    import re
    lines = lrc_text.splitlines()
    plain_lines = []
    for line in lines:
        # Remove timestamp like [mm:ss.xx] or [mm:ss:xx]
        clean = re.sub(r'^\[\d{2}:\d{2}[.:]\d{2,3}\]\s*', '', line)
        # Also skip metadata tags like [ar:Artist], [ti:Title]
        if re.match(r'^\[.*:.*\]$', clean.strip()):
            continue
        plain_lines.append(clean)
    return '\n'.join(plain_lines).strip()
