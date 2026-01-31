@echo off
echo Iniciando AppMusica Executavel...
cd backend\dist
start AppMusica.exe
echo AppMusica iniciado!
echo Verifique se uma janela preta (Console) abriu e se o navegador abriu em http://localhost:8000
timeout /t 5
:: start http://localhost:8000
pause
