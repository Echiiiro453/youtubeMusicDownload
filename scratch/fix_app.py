import sys
content = open('e:/youtubr/youtubeMusicDownload-main/frontend/src/App.jsx', encoding='utf-8').read()

block_to_move = """
                          {mode === 'video' && metadata.subtitles && metadata.subtitles.length > 0 && (
                            <div className="mt-4 p-4 bg-surface-container border border-outline-variant/30 rounded-2xl">
                              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
                                Legendas
                              </label>
                              <select
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                className="w-full bg-surface-container-highest border-none rounded-xl px-3 py-3 text-on-surface text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                              >
                                <option value="none">Sem legenda</option>
                                <option value="all">Todas as legendas</option>
                                {metadata.subtitles.map(sub => (
                                  <option key={sub.code} value={sub.code}>{sub.name}</option>
                                ))}
                              </select>
                            </div>
                          )}"""

target_spot = """                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
                      Qualidade ({mode === 'audio' ? 'Áudio' : 'Vídeo'})"""

# Remove from original
content = content.replace(block_to_move, '')

# Prepare new block for top
new_block = """                  {mode === 'video' && metadata.subtitles && metadata.subtitles.length > 0 && (
                    <div className="mb-4 p-4 bg-surface-container border border-outline-variant/30 rounded-2xl">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
                        Legendas
                      </label>
                      <select
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full bg-surface-container-highest border-none rounded-xl px-3 py-3 text-on-surface text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="none">Sem legenda</option>
                        <option value="all">Todas as legendas</option>
                        {metadata.subtitles.map(sub => (
                          <option key={sub.code} value={sub.code}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

"""

# Insert at top
content = content.replace(target_spot, new_block + target_spot)

open('e:/youtubr/youtubeMusicDownload-main/frontend/src/App.jsx', 'w', encoding='utf-8').write(content)
