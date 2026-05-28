import requests
import random
import time

PROXY_LIST = []
LAST_FETCH = 0

def fetch_proxies():
    global PROXY_LIST, LAST_FETCH
    # Atualiza a lista se estiver vazia ou for mais velha que 1 hora (3600 seg)
    if PROXY_LIST and time.time() - LAST_FETCH < 3600:
        return
    
    try:
        url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            proxies = res.text.splitlines()
            PROXY_LIST = [f"http://{p.strip()}" for p in proxies if p.strip()]
            LAST_FETCH = time.time()
            print(f"      \033[94m[proxy] Cache atualizado com {len(PROXY_LIST)} proxies gratuitos mundiais.\033[0m")
    except Exception as e:
        print(f"      \033[90m[proxy:warn] Falha ao buscar proxies: {e}\033[0m")

def get_random_proxy() -> str:
    fetch_proxies()
    if not PROXY_LIST:
        return None
    return random.choice(PROXY_LIST)
