@echo off
REM Build the local "bana" model for Harit Pathsala (optional but recommended).
REM Requires Ollama: https://ollama.com
cd /d "%~dp0"
where ollama >nul 2>nul
if not %errorlevel%==0 (
  echo Ollama is not installed. Get it from https://ollama.com then re-run this.
  pause
  exit /b 1
)
echo ==^> Pulling base model llama3.2 ...
ollama pull llama3.2
echo ==^> Pulling embedding model nomic-embed-text (for the Ask Bana RAG search)...
ollama pull nomic-embed-text
echo ==^> Building the 'bana' persona model...
ollama create bana -f Modelfile
echo.
echo Done. Start Ollama so the browser can reach it (new window):
echo      set OLLAMA_ORIGINS=* ^&^& ollama serve
echo Then run the app:  npm run dev
pause
