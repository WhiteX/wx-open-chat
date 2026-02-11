# WX Open Chat

WX Open Chat is an Obsidian sidebar plugin that connects your vault to an OpenClaw agent.

Use it to:
- ask questions about your notes
- request concrete Markdown edits
- optionally link chats to a Telegram topic

Default mode is standalone (no channel IDs required).

## Install
```bash
yarn install
./scripts/install-to-obsidian.sh
```

The install script supports:
1. CLI path argument: `./scripts/install-to-obsidian.sh /path/to/vault`
2. `OBSIDIAN_VAULT_PATH` env var
3. Auto-detection from Obsidian config
4. Interactive prompt fallback

Then enable **WX Open Chat** in Obsidian → Community Plugins.

## Bridge setup
```bash
cd bridge
cp .env.example .env
npm install
./scripts/bridge-service.sh start
./scripts/bridge-service.sh status
```

If Obsidian runs on Windows and bridge runs in WSL, use the WSL IP as Bridge URL in plugin settings.

## Code provenance
This project has a fresh repository history.

Adapted code currently used from `bramses/chatgpt-md` includes:
- Obsidian plugin scaffolding/build baseline (manifest/esbuild/ts flow)
- Parts of settings persistence patterns
- Some utility/service structure patterns that were reused and simplified

New / rewritten in WX Open Chat:
- OpenClaw-first bridge integration (agent-only workflow)
- Sidebar chat UX focused on editing notes
- Optional Telegram topic linking mode (standalone default)
- Context controls (active note + selection)
- Bridge service scripts and cross-platform install flow
