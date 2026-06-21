#!/usr/bin/env bash
# Build the local "bana" model for Harit Pathsala (optional but recommended).
# Requires Ollama: https://ollama.com   Runs entirely on this machine.
set -e
cd "$(dirname "$0")"
if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Get it from https://ollama.com, then re-run this."
  exit 1
fi
echo "==> Pulling base model llama3.2 (a few minutes the first time)..."
ollama pull llama3.2
echo "==> Pulling embedding model nomic-embed-text (for the Ask Bana RAG search)..."
ollama pull nomic-embed-text
echo "==> Building the 'bana' persona model..."
ollama create bana -f Modelfile
echo
echo "✅ Done. Start Ollama so the browser can reach it:"
echo "     OLLAMA_ORIGINS='*' ollama serve"
echo "   (or restrict to your dev origin: OLLAMA_ORIGINS='http://localhost:8000')"
echo "   Then run the app:  npm run dev"
