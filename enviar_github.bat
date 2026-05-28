@echo off
echo =======================================================
echo          Enviando Atualizacoes para o GitHub
echo =======================================================
echo.

"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Update to version 1.6.0"

echo.
echo Digite o link do seu repositorio no GitHub.
echo Exemplo: https://github.com/SeuNome/SeuProjeto.git
set /p GIT_URL="Link do GitHub: "

"C:\Program Files\Git\cmd\git.exe" remote set-url origin %GIT_URL% 2>nul || "C:\Program Files\Git\cmd\git.exe" remote add origin %GIT_URL%
"C:\Program Files\Git\cmd\git.exe" branch -M main

echo.
echo Enviando arquivos... (Uma janela do navegador pode abrir para voce fazer login no GitHub)
echo ATENCAO: Isso ira forcar a atualizacao do repositorio com os arquivos desta pasta.
pause

"C:\Program Files\Git\cmd\git.exe" push -u origin main --force

echo.
echo Concluido!
pause
