#!/usr/bin/env bash
set -euo pipefail

VAULT_PATH="${1:-/mnt/d/OneDrive/Documents/Obsidian/WhiteX}"
PLUGIN_ID="wx-open-chat"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT_PATH" ]; then
  echo "Vault path not found: $VAULT_PATH" >&2
  exit 1
fi

if [ ! -f "manifest.json" ]; then
  echo "Run from repo root (manifest.json missing)" >&2
  exit 1
fi

echo "[wx-open-chat] Building plugin..."
yarn build >/dev/null

if [ ! -f "main.js" ]; then
  echo "Build failed: main.js not found" >&2
  exit 1
fi

echo "[wx-open-chat] Installing to: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp main.js "$PLUGIN_DIR/main.js"
cp styles.css "$PLUGIN_DIR/styles.css"

echo "[wx-open-chat] Installed successfully."
echo "Now enable it in Obsidian -> Community plugins -> WX Open Chat"
