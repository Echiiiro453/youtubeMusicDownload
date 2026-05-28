import sys
import re

file_path = r'e:\youtubr\youtubeMusicDownload-main\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace globalJobs polling
old_global = '''  // GLOBAL DOWNLOADS STATE (Polling Strategy)
  const [globalJobs, setGlobalJobs] = useState({});

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(getApiUrl('/download/jobs'));
        setGlobalJobs(res.data);
      } catch (e) {
        // Silent error to avoid spam
      }
    }, 2000); // 2s polling to prevent freeze
    return () => clearInterval(interval);
  }, []);'''

new_global = '''  // GLOBAL DOWNLOADS STATE (WebSocket Strategy)
  const [globalJobs, setGlobalJobs] = useState({});
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connectWs = () => {
      ws = new WebSocket(getApiUrl('/ws').replace('http', 'ws'));
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setGlobalJobs(data);
        } catch (e) {}
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };
    };
    connectWs();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Sync single download with globalJobs
  useEffect(() => {
    if (step === 'downloading' && currentJobId) {
      const job = globalJobs[currentJobId];
      if (job) {
        if (job.progress) {
          setProgress({ percent: job.progress, status: job.status });
        }
        if (job.status === 'done') {
          setDownloadInfo({
            status: 'success',
            title: job.title || job.filename,
            quality: quality,
            file: job.filename
          });
          addToast('Download concluído!', 'success', { label: 'Abrir Pasta', onClick: openDownloadsFolder });
          setStep('result');
          setCurrentJobId(null);
        } else if (job.status === 'error' || job.status === 'timeout') {
          addToast('Falha no download.', 'error');
          setMessage(job.error || 'Erro desconhecido');
          setStatus('error');
          setStep('confirm');
          setCurrentJobId(null);
        }
      }
    }
  }, [globalJobs, step, currentJobId]);'''

if old_global in content:
    content = content.replace(old_global, new_global)
else:
    print("Could not find globalJobs polling block")

# Replace handleDownload polling
old_handle_polling = r'''      // 2\. Poll Status \(Manual Polling para UI Principal\).*?setStep\('confirm'\);\s*\}\s*\}\s*\}, 1000\);'''
new_handle = '''      setCurrentJobId(job_id);'''
content = re.sub(old_handle_polling, new_handle, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully injected WebSockets!')
