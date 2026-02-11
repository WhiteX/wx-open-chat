# WX Open Chat

OpenClaw-first sidebar chat plugin for Obsidian.

## What it is
- Agent-focused chat UI inside Obsidian
- Built for asking questions and requesting real Markdown edits
- Optional Telegram topic linking (feature mode)
- Standalone mode by default (no channel IDs required)

## What it is not
- Not a generic multi-provider AI plugin
- Not a prompt lab / model switcher

## Install
```bash
yarn install
yarn build
./scripts/install-to-obsidian.sh
```

Then enable **WX Open Chat** in Obsidian Community Plugins.

## Bridge
```bash
cd bridge
cp .env.example .env
npm install
./scripts/bridge-service.sh start
./scripts/bridge-service.sh status
```

If Obsidian runs on Windows and bridge runs in WSL, use WSL IP in plugin Bridge URL.

## Provenance
This codebase was rebuilt as a fresh project history.

It may still include adapted logic from:
- `bramses/chatgpt-md`

Credits are kept only for code that is actually used.
