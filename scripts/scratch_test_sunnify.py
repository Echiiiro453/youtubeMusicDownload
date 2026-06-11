import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sunnify_api import PlaylistClient, detect_spotify_url_type

url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
client = PlaylistClient()
url_type, item_id = detect_spotify_url_type(url)
print(url_type, item_id)

if url_type in ["playlist", "album"]:
    metadata = client.get_playlist_metadata(item_id, content_type=url_type)
    print("Metadata:", metadata.name, metadata.track_count)
    tracks = list(client.iter_playlist_tracks(item_id, content_type=url_type))
    print(f"Found {len(tracks)} tracks")
