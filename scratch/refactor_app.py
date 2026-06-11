import re

with open('e:/youtubr/youtubeMusicDownload-main/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports at the top
imports_to_add = """import BackgroundMedia from './components/BackgroundMedia';
import TopAppBar from './components/TopAppBar';
import QueueDrawer from './components/QueueDrawer';
import SpotifyModal from './components/SpotifyModal';
"""

if 'import BackgroundMedia' not in content:
    content = content.replace("import React, { useState, useEffect, useRef } from 'react';", 
                              "import React, { useState, useEffect, useRef } from 'react';\n" + imports_to_add)

# 2. Replace BackgroundMedia
bg_media_regex = r"\{\/\* Background Wallpaper \*\/\}[\s\S]*?\{\/\* Dark Overlay with Blur to ensure text readability \*\/\}[\s\S]*?<\/div>[\s\S]*?<\/div>\n\s*\)\}"

bg_media_replacement = """<BackgroundMedia 
        wallpaper={wallpaper} 
        resolvedWallpaper={resolvedWallpaper} 
        blurLevel={blurLevel} 
      />"""

content = re.sub(bg_media_regex, bg_media_replacement, content)

# 3. Replace TopAppBar
top_app_bar_regex = r"\{\/\* MD3 Floating App Bar \(Pill Shape\) \*\/\}[\s\S]*?<WindowControls \/>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>"

top_app_bar_replacement = """<TopAppBar
        setShowConverter={setShowConverter}
        setShowStudioModal={setShowStudioModal}
        setShowShazamModal={setShowShazamModal}
        setShowLibrary={setShowLibrary}
        setShowHistory={setShowHistory}
        checkForUpdates={checkForUpdates}
        isCheckingUpdate={isCheckingUpdate}
        setShowMobileSync={setShowMobileSync}
        setShowSubscriptionsModal={setShowSubscriptionsModal}
        setShowDonate={setShowDonate}
        setShowSettings={setShowSettings}
        isAuthenticated={isAuthenticated}
      />"""

content = re.sub(top_app_bar_regex, top_app_bar_replacement, content)

# 4. Replace QueueDrawer
queue_drawer_regex = r"\{showQueue && \([\s\S]*?id=\"start-downloads-btn\"[\s\S]*?<\/RippleButton>[\s\S]*?<\/div>[\s\S]*?<\/motion\.div>[\s\S]*?<\/>[\s\S]*?\)\}"

queue_drawer_replacement = """<QueueDrawer
        showQueue={showQueue}
        setShowQueue={setShowQueue}
        queue={queue}
        setQueue={setQueue}
        isProcessingQueue={isProcessingQueue}
        processQueue={processQueue}
        removeFromQueue={removeFromQueue}
        setCurrentSong={setCurrentSong}
        updateQueueItem={updateQueueItem}
        globalJobs={globalJobs}
        getApiUrl={getApiUrl}
      />"""

content = re.sub(queue_drawer_regex, queue_drawer_replacement, content)

# 5. Replace SpotifyModal
spotify_modal_regex = r"\{\/\* Custom Spotify\/Apple\/SoundCloud Modal \*\/\}[\s\S]*?<AnimatePresence>[\s\S]*?\{showSpotifyModal && \([\s\S]*?Cole o link da sua música[\s\S]*?<\/motion\.div>[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/AnimatePresence>"

spotify_modal_replacement = """<SpotifyModal
        showSpotifyModal={showSpotifyModal}
        setShowSpotifyModal={setShowSpotifyModal}
        spotifyInputUrl={spotifyInputUrl}
        setSpotifyInputUrl={setSpotifyInputUrl}
        setUrl={setUrl}
        loadVideoDetails={loadVideoDetails}
      />"""

content = re.sub(spotify_modal_regex, spotify_modal_replacement, content)

with open('e:/youtubr/youtubeMusicDownload-main/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring done.")
