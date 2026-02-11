#!/usr/bin/env bash
set -euo pipefail

PLUGIN_ID='wx-open-chat'

# Resolution order:
# 1) first CLI arg
# 2) OBSIDIAN_VAULT_PATH env var
# 3) auto-detect from Obsidian config
# 4) interactive prompt
INPUT_PATH="${1:-}"
ENV_PATH="${OBSIDIAN_VAULT_PATH:-}"

resolve_from_obsidian_config() {
  python3 - <<'PY'
import json,glob,os

candidates=[]
# Linux/macOS
candidates.append(os.path.expanduser('~/.config/obsidian/obsidian.json'))
candidates.append(os.path.expanduser('~/Library/Application Support/obsidian/obsidian.json'))
# Windows via WSL
candidates.extend(glob.glob('/mnt/c/Users/*/AppData/Roaming/obsidian/obsidian.json'))

for cfg in candidates:
    if not os.path.exists(cfg):
        continue
    try:
        data=json.load(open(cfg,'r',encoding='utf-8'))
    except Exception:
        continue

    vaults=data.get('vaults') or {}
    if isinstance(vaults, dict):
        # prefer currently open vault
        open_first=[]
        rest=[]
        for v in vaults.values():
            path=v.get('path') if isinstance(v,dict) else None
            if not path:
                continue
            (open_first if v.get('open') else rest).append(path)
        ordered=open_first+rest
        if ordered:
            print(ordered[0])
            raise SystemExit(0)

print('')
PY
}

choose_vault_path() {
  local path=''

  if [ -n "$INPUT_PATH" ]; then
    path="$INPUT_PATH"
  elif [ -n "$ENV_PATH" ]; then
    path="$ENV_PATH"
  else
    path="$(resolve_from_obsidian_config)"
  fi

  if [ -z "$path" ]; then
    echo '[wx-open-chat] Could not auto-detect vault path.'
    read -r -p 'Enter full Obsidian vault path: ' path
  fi

  echo "$path"
}

normalize_path_for_shell() {
  local p="$1"
  # Convert Windows path (e.g. D:\\Vault) to WSL path (/mnt/d/Vault) when running under WSL
  if [[ "$p" =~ ^([A-Za-z]):\\ ]]; then
    local drive
    drive="${BASH_REMATCH[1],,}"
    p="${p//\\//}"
    p="/mnt/$drive/${p:3}"
  fi
  echo "$p"
}

VAULT_PATH="$(normalize_path_for_shell "$(choose_vault_path)")"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT_PATH" ]; then
  echo "[wx-open-chat] Vault path not found: $VAULT_PATH" >&2
  exit 1
fi

if [ ! -f 'manifest.json' ]; then
  echo '[wx-open-chat] Run this script from repo root (manifest.json missing)' >&2
  exit 1
fi

echo '[wx-open-chat] Building plugin...'
yarn build >/dev/null

if [ ! -f 'main.js' ]; then
  echo '[wx-open-chat] Build failed: main.js not found' >&2
  exit 1
fi

echo "[wx-open-chat] Installing to: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp main.js "$PLUGIN_DIR/main.js"
cp styles.css "$PLUGIN_DIR/styles.css"

echo '[wx-open-chat] Installed successfully.'
echo '[wx-open-chat] Enable it in Obsidian -> Community plugins -> WX Open Chat'
