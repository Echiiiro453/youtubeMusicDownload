# PowerShell script para inserir endpoint no main.py
$mainFile = "main.py"
$endpointFile = "playlist_endpoint.py"

# Ler arquivos
$mainContent = Get-Content $mainFile -Encoding UTF8
$endpointContent = Get-Content $endpointFile -Encoding UTF8

# Encontrar linha para inserir (logo após @app.get("/progress"))
$insertLineNumber = -1
for ($i = 0; $i -lt $mainContent.Count; $i++) {
    if ($mainContent[$i] -match '@app\.get\("/progress"\)') {
        $insertLineNumber = $i
        break
    }
}

if ($insertLineNumber -eq -1) {
    Write-Host "Erro: Não encontrou @app.get('/progress')"
    exit 1
}

# Inserir o novo código ANTES do @app.get("/progress")
$newContent = @()
$newContent += $mainContent[0..($insertLineNumber-1)]
$newContent += ""
$newContent += $endpointContent
$newContent += ""
$newContent += $mainContent[$insertLineNumber..($mainContent.Count-1)]

# Salvar
$newContent | Set-Content $mainFile -Encoding UTF8

Write-Host "Endpoint adicionado com sucesso na linha $insertLineNumber"
