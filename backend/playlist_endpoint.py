# Novo endpoint para detalhes de playlist
# Este código deve ser adicionado ao main.py após o endpoint /info (linha ~298)

@app.post("/playlist/details")
def get_playlist_details(request: InfoRequest):
    """
    Retorna lista detalhada de todos os vídeos em uma playlist
    """
    try:
        url = request.url
        
        ydl_opts = {
            'quiet': False,
            'nocheckcertilicate': True,
            'ignoreerrors': True,  # Continue mesmo se algum vídeo falhar
            'no_warnings': False,
            'js_runtimes': {'node': {}},
            'extract_flat': 'in_playlist',  # Extração rápida
            'cookiefile': os.path.join(get_base_dir(), 'cookies.txt'),
        }
        
        # Tentar diferentes clientes
        clients = ['tv', 'android', 'web']
        success = False
        playlist_info = None
        
        for client in clients:
            try:
                print(f"Fetching playlist with client: {client}")
                if client == 'web':
                    if 'extractor_args' in ydl_opts:
                        del ydl_opts['extractor_args']
                else:
                    ydl_opts['extractor_args'] = {'youtube': {'player_client': [client]}}
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    playlist_info = ydl.extract_info(url, download=False)
                
                success = True
                break
            except Exception as e:
                print(f"Failed with client '{client}': {e}")
                continue
        
        if not success or not playlist_info:
            raise HTTPException(status_code=500, detail="Falha ao carregar playlist")
        
        # Verificar se é realmente uma playlist
        if 'entries' not in playlist_info:
            raise HTTPException(status_code=400, detail="URL não é uma playlist")
        
        # Processar vídeos
        videos = []
        for idx, entry in enumerate(playlist_info['entries']):
            if entry is None:  # Vídeo privado/deletado
                continue
                
            # Formatar duração
            duration = entry.get('duration', 0)
            duration_str = entry.get('duration_string', '0:00')
            if not duration_str and duration:
                import datetime
                duration_str = str(datetime.timedelta(seconds=duration))
                if duration_str.startswith('0:'):
                    duration_str = duration_str[2:]
            
            videos.append({
                "index": idx,
                "id": entry.get('id', ''),
                "title": entry.get('title', 'Sem título'),
                "thumbnail": entry.get('thumbnail') or entry.get('thumbnails', [{}])[0].get('url'),
                "duration": duration,
                "duration_string": duration_str,
                "uploader": entry.get('uploader', entry.get('channel', 'Desconhecido')),
                "url": entry.get('url') or entry.get('webpage_url') or f"https://www.youtube.com/watch?v={entry.get('id')}"
            })
        
        return {
            "status": "success",
            "playlist_id": playlist_info.get('id', ''),
            "title": playlist_info.get('title', 'Playlist'),
            "total_videos": len(videos),
            "uploader": playlist_info.get('uploader', playlist_info.get('channel', 'Desconhecido')),
            "videos": videos
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_msg = f"ERROR in /playlist/details: {str(e)}\n\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
