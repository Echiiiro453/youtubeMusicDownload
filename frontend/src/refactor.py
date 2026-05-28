import sys
import os

file_path = r'C:\Users\andrey\.gemini\antigravity\brain\b0507c1c-7d62-48e5-aa42-a917e30383e1\scratch\youtubeMusicDownload-main\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Cut the end of the file where components are defined
cut_idx = -1
for i, line in enumerate(lines):
    if '// ==================== SKELETON COMPONENTS ====================' in line:
        cut_idx = i
        break

if cut_idx != -1:
    lines = lines[:cut_idx]
    lines.append('\nexport default App;\n')

# 2. Replace Playlist Manager Modal
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '{/* Playlist Manager Modal */}' in line:
        start_idx = i
        break

if start_idx != -1:
    count_presence = 0
    found_presence = False
    for i in range(start_idx, len(lines)):
        if '<AnimatePresence' in lines[i]:
            count_presence += 1
            found_presence = True
        if '</AnimatePresence>' in lines[i]:
            count_presence -= 1
        
        if found_presence and count_presence == 0:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    component_call = '''      <PlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        metadata={metadata}
        playlistLimit={playlistLimit}
        setPlaylistLimit={setPlaylistLimit}
        fetchPlaylistDetails={fetchPlaylistDetails}
        selectedVideos={selectedVideos}
        setSelectedVideos={setSelectedVideos}
        playlistVideos={playlistVideos}
        deselectAllVideos={deselectAllVideos}
        downloadSelectedVideos={downloadSelectedVideos}
        toggleVideoSelection={toggleVideoSelection}
        playlistLoading={playlistLoading}
        executeRetry={executeRetry}
      />\n'''
    lines = lines[:start_idx] + [component_call] + lines[end_idx+1:]

# 3. Replace Settings Modal usage if needed
# Wait, SettingsModal is already just <SettingsModal ... /> inside App.jsx, I don't need to replace it.

# 4. Insert imports
imports = '''import { SettingsModal } from './components/SettingsModal';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistModal } from './components/PlaylistModal';
import { SkeletonCard, SkeletonPlaylistItem, QualityOption, ToastContainer } from './components/UIComponents';
'''
lines.insert(9, imports)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Successfully refactored App.jsx!')
