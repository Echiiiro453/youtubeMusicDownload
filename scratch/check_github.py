import urllib.request, json
res = urllib.request.urlopen('https://api.github.com/repos/spotbye/SpotiFLAC/issues?state=open')
data = json.loads(res.read().decode('utf-8'))
for i in data[:10]:
    print(f"[{i['number']}] {i['title']}")
