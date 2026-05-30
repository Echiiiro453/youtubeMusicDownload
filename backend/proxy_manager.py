from curl_cffi import requests
import random
import time

PROXY_LIST = []
LAST_FETCH = 0

def fetch_proxies():
    global PROXY_LIST, LAST_FETCH
    # Atualiza a lista se estiver vazia ou for mais velha que 1 hora (3600 seg)
    if PROXY_LIST and time.time() - LAST_FETCH < 3600:
        return
    
    endpoints = [
        ("http", "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"),
        ("socks4", "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=5000&country=all"),
        ("socks5", "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=5000&country=all")
    ]
    
    new_proxies = []
    
    for proto, url in endpoints:
        try:
            res = requests.get(url, timeout=10, impersonate="chrome120")
            if res.status_code == 200:
                lines = res.text.splitlines()
                for p in lines:
                    if p.strip():
                        new_proxies.append(f"{proto}://{p.strip()}")
        except Exception as e:
            print(f"      \033[90m[proxy:warn] Falha ao buscar proxies {proto.upper()}: {e}\033[0m")
            
    if new_proxies:
        PROXY_LIST = new_proxies
        LAST_FETCH = time.time()
        print(f"      \033[94m[proxy] Cache atualizado com {len(PROXY_LIST)} proxies gratuitos mundiais (HTTP/SOCKS4/SOCKS5).\033[0m")
    elif not PROXY_LIST:
        print("      \033[31m[proxy:err] Falha geral ao carregar proxies. O fallback de sobrevivência não terá proxies disponíveis.\033[0m")

def get_random_proxy() -> str:
    fetch_proxies()
    if not PROXY_LIST:
        return None
    return random.choice(PROXY_LIST)
