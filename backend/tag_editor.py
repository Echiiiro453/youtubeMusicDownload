"""
tag_editor.py
Leitura e escrita de metadados ID3/Vorbis em arquivos de audio via mutagen.
Suporta: MP3, FLAC, M4A/AAC
"""
import os
import base64
from utils import get_downloads_dir


def _get_full_path(filename: str) -> str:
    """Resolve o caminho completo do arquivo dentro da pasta de downloads."""
    d = get_downloads_dir()
    path = os.path.join(d, filename)
    if os.path.exists(path):
        return path
    # Tenta caminho absoluto se nao estiver na pasta de downloads
    if os.path.isabs(filename) and os.path.exists(filename):
        return filename
    return None


def read_tags(filename: str) -> dict:
    """Le os metadados do arquivo e retorna um dict com title, artist, album, year, cover_base64, lyrics."""
    path = _get_full_path(filename)
    if not path:
        return {"error": "Arquivo nao encontrado"}

    ext = os.path.splitext(path)[1].lower()
    result = {
        "title": "",
        "artist": "",
        "album": "",
        "year": "",
        "lyrics": "",
        "cover_base64": None,
        "filename": filename,
        "ext": ext,
    }

    try:
        if ext == ".mp3":
            from mutagen.mp3 import MP3
            from mutagen.id3 import ID3
            audio = MP3(path, ID3=ID3)
            tags = audio.tags or {}
            result["title"]  = str(tags.get("TIT2", ""))
            result["artist"] = str(tags.get("TPE1", ""))
            result["album"]  = str(tags.get("TALB", ""))
            result["year"]   = str(tags.get("TDRC", ""))
            uslt = tags.get("USLT::und") or tags.get("USLT::'und'")
            if uslt:
                result["lyrics"] = uslt.text
            # Capa
            for key in tags.keys():
                if key.startswith("APIC"):
                    apic = tags[key]
                    result["cover_base64"] = base64.b64encode(apic.data).decode()
                    break

        elif ext == ".flac":
            from mutagen.flac import FLAC
            audio = FLAC(path)
            result["title"]  = (audio.get("title")  or [""])[0]
            result["artist"] = (audio.get("artist") or [""])[0]
            result["album"]  = (audio.get("album")  or [""])[0]
            result["year"]   = (audio.get("date")   or [""])[0]
            result["lyrics"] = (audio.get("lyrics") or [""])[0]
            if audio.pictures:
                result["cover_base64"] = base64.b64encode(audio.pictures[0].data).decode()

        elif ext in (".m4a", ".aac"):
            from mutagen.mp4 import MP4
            audio = MP4(path)
            result["title"]  = (audio.tags.get("\xa9nam") or [""])[0]
            result["artist"] = (audio.tags.get("\xa9ART") or [""])[0]
            result["album"]  = (audio.tags.get("\xa9alb") or [""])[0]
            result["year"]   = (audio.tags.get("\xa9day") or [""])[0]
            result["lyrics"] = (audio.tags.get("\xa9lyr") or [""])[0]
            if "covr" in audio.tags:
                result["cover_base64"] = base64.b64encode(bytes(audio.tags["covr"][0])).decode()

    except Exception as e:
        result["error"] = str(e)

    return result


def write_tags(filename: str, data: dict) -> dict:
    """Grava os metadados no arquivo. data pode conter: title, artist, album, year, lyrics, cover_base64."""
    path = _get_full_path(filename)
    if not path:
        return {"success": False, "error": "Arquivo nao encontrado"}

    ext = os.path.splitext(path)[1].lower()

    try:
        if ext == ".mp3":
            from mutagen.mp3 import MP3
            from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, USLT, APIC, Encoding
            audio = MP3(path, ID3=ID3)
            if audio.tags is None:
                audio.add_tags()
            tags = audio.tags
            if "title"  in data: tags["TIT2"] = TIT2(encoding=Encoding.UTF8, text=data["title"])
            if "artist" in data: tags["TPE1"] = TPE1(encoding=Encoding.UTF8, text=data["artist"])
            if "album"  in data: tags["TALB"] = TALB(encoding=Encoding.UTF8, text=data["album"])
            if "year"   in data: tags["TDRC"] = TDRC(encoding=Encoding.UTF8, text=data["year"])
            if "lyrics" in data:
                tags.delall("USLT")
                tags.add(USLT(encoding=Encoding.UTF8, lang="und", desc="Lyrics", text=data["lyrics"]))
            if "cover_base64" in data and data["cover_base64"]:
                cover_bytes = base64.b64decode(data["cover_base64"])
                tags.delall("APIC")
                tags.add(APIC(encoding=Encoding.UTF8, mime="image/jpeg", type=3, desc="Cover", data=cover_bytes))
            audio.save()

        elif ext == ".flac":
            from mutagen.flac import FLAC, Picture
            audio = FLAC(path)
            if "title"  in data: audio["title"]  = [data["title"]]
            if "artist" in data: audio["artist"] = [data["artist"]]
            if "album"  in data: audio["album"]  = [data["album"]]
            if "year"   in data: audio["date"]   = [data["year"]]
            if "lyrics" in data: audio["lyrics"] = [data["lyrics"]]
            if "cover_base64" in data and data["cover_base64"]:
                audio.clear_pictures()
                pic = Picture()
                pic.data = base64.b64decode(data["cover_base64"])
                pic.mime = "image/jpeg"
                pic.type = 3
                audio.add_picture(pic)
            audio.save()

        elif ext in (".m4a", ".aac"):
            from mutagen.mp4 import MP4, MP4Cover
            audio = MP4(path)
            if "title"  in data: audio.tags["\xa9nam"] = [data["title"]]
            if "artist" in data: audio.tags["\xa9ART"] = [data["artist"]]
            if "album"  in data: audio.tags["\xa9alb"] = [data["album"]]
            if "year"   in data: audio.tags["\xa9day"] = [data["year"]]
            if "lyrics" in data: audio.tags["\xa9lyr"] = [data["lyrics"]]
            if "cover_base64" in data and data["cover_base64"]:
                cover_bytes = base64.b64decode(data["cover_base64"])
                audio.tags["covr"] = [MP4Cover(cover_bytes, imageformat=MP4Cover.FORMAT_JPEG)]
            audio.save()

        # Mover para pasta edited/
        downloads_dir = get_downloads_dir()
        edited_dir = os.path.join(downloads_dir, "edited")
        os.makedirs(edited_dir, exist_ok=True)
        
        filename_only = os.path.basename(path)
        new_path = os.path.join(edited_dir, filename_only)
        
        import shutil
        if os.path.abspath(path) != os.path.abspath(new_path):
            if path.startswith(downloads_dir):
                shutil.move(path, new_path)
            else:
                shutil.copy2(path, new_path)

        return {"success": True, "new_path": new_path}
    except Exception as e:
        return {"success": False, "error": str(e)}
