import re

f = 'e:/youtubr/youtubeMusicDownload-main/frontend/src/components/SettingsModal.jsx'
content = open(f, 'r', encoding='utf-8').read()

imports = r"import \{.*?\} from 'lucide-react';"
if 'Mic' not in re.search(imports, content, re.DOTALL).group(0):
    content = re.sub(imports, lambda m: m.group(0).replace('Upload,', 'Upload, Mic,'), content, flags=re.DOTALL)

voice_state = """  const [voiceStatus, setVoiceStatus] = useState('stopped');
  
  useEffect(() => {
    if (isOpen) {
      fetchVoiceStatus();
    }
  }, [isOpen]);

  const fetchVoiceStatus = async () => {
    try {
      const res = await axios.get(getApiUrl('api/voice/status'));
      setVoiceStatus(res.data.status);
    } catch (e) {
      console.error('Failed to get voice status', e);
    }
  };

  const toggleVoice = async () => {
    try {
      const res = await axios.post(getApiUrl('api/voice/toggle'));
      setVoiceStatus(res.data.status);
      if (res.data.status === 'downloading') {
          // Poll every 3 seconds while downloading
          const interval = setInterval(async () => {
              const check = await axios.get(getApiUrl('api/voice/status'));
              setVoiceStatus(check.data.status);
              if (check.data.status !== 'downloading') clearInterval(interval);
          }, 3000);
      }
    } catch (e) {
      console.error('Failed to toggle voice', e);
    }
  };
"""
content = content.replace('  const handleSetDownloadFolder', voice_state + '\n  const handleSetDownloadFolder')

voice_ui = """              {/* Voice Command Toggle */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" /> Comandos de Voz (BETA)
                </h4>
                <p className="text-xs text-warning/80 bg-warning/10 p-2 rounded-xl">
                  ⚠️ <b>Aviso:</b> Esta função está em fase de testes. Controle músicas offline dizendo "Lumina Pausar", "Lumina Próxima", etc. Ao ativar pela 1ª vez, o app baixará 40MB do motor de IA.
                </p>
                <button 
                  onClick={toggleVoice} 
                  disabled={voiceStatus === 'downloading'}
                  className={`w-full py-2 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    voiceStatus === 'running' 
                      ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' 
                      : voiceStatus === 'downloading' 
                        ? 'bg-secondary text-on-secondary animate-pulse' 
                        : 'bg-surface-container-highest text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <Mic size={16} className={voiceStatus === 'running' ? 'animate-pulse' : ''} />
                  {voiceStatus === 'running' 
                    ? 'Microfone Ligado (Escutando...)' 
                    : voiceStatus === 'downloading' 
                      ? 'Baixando Motor de Voz (40MB)...' 
                      : 'Ativar Reconhecimento de Voz'}
                </button>
              </div>

"""
content = content.replace('{/* Wallpaper Personalization */}', voice_ui + '{/* Wallpaper Personalization */}')

open(f, 'w', encoding='utf-8').write(content)
print("done")
