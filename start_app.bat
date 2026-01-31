@echo off
echo Iniciando Music Downloader Premium...

:: Iniciar Backend
start "Music Backend" cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"

:: Aguardar um pouco para o backend subir
timeout /t 3

:: Iniciar Frontend
start "Music Frontend" cmd /k "cd frontend && npm run dev"

:: Abrir navegador
timeout /t 5
start http://localhost:5173

echo.
echo Tudo pronto! O app deve abrir no seu navegador.
echo Para fechar, feche as janelas do Backend e Frontend.
pause
