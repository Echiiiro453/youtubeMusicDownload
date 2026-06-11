import yt_dlp
opts = {
    'format': 'bestaudio',
    'noplaylist': True,
    'quiet': False,
    'js_runtimes': {'node': {}}
}
with yt_dlp.YoutubeDL(opts) as ydl:
    ydl.extract_info('ytsearch1:Ariana Grande hate that i made you love me audio', download=False)
