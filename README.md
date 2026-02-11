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
This codebase was rebuilt as a **fresh project history** (new clean repository history).

Historical diff snapshot (before the fresh reset), compared against `bramses/chatgpt-md`:
- Total tracked files: **140**
- Files changed by us: **23**
- Unchanged upstream files still present: **117**

What that meant at the time:
- We were still carrying a lot of inherited code from `chatgpt-md`
- We had already added OpenClaw bridge + sidebar UI on top

Current state:
- Fresh-start repo with only the code we kept for WX Open Chat
- Attribution retained for `bramses/chatgpt-md` where adapted logic is still used
- Credits are kept only for code that is actually used
