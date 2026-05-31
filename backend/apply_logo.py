import os
import shutil
from PIL import Image

image_path = r"C:\Users\andrey\.gemini\antigravity\brain\bfe16787-2d33-472f-93dc-01b646118c59\appmusica_logo_2_1780188017495.png"
backend_icon_path = r"E:\youtubr\youtubeMusicDownload-main\backend\icon.ico"
frontend_favicon_path = r"E:\youtubr\youtubeMusicDownload-main\frontend\public\favicon.ico"

print(f"Opening {image_path}...")
img = Image.open(image_path)

# Convert to RGBA just in case
img = img.convert("RGBA")

# Save as ICO for backend (Windows Executable)
img.save(backend_icon_path, format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
print(f"Saved backend icon to {backend_icon_path}")

# Save as ICO for frontend (React Favicon)
img.save(frontend_favicon_path, format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
print(f"Saved frontend favicon to {frontend_favicon_path}")

