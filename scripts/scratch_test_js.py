import yt_dlp
opts = {
    'format': 'bestaudio',
    'noplaylist': True,
    'quiet': False,
    'extractor_args': {'youtube': {'player_client': ['web']}},
    'js_runtimes': {'node': {'path': r'E:\youtubr\youtubeMusicDownload-main\backend\node.exe'}},
    'remote_components': ['ejs:github']
}
with yt_dlp.YoutubeDL(opts) as ydl:
    ydl.extract_info('ytsearch1:Ariana Grande hate that i made you love me audio', download=False)
