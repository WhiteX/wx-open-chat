# Windows + WSL: Stable localhost bridge

Overview
- OpenClaw bridge runs in WSL; Obsidian on Windows can talk to it via localhost using 127.0.0.1:8787.
- This setup keeps the bridge accessible from Windows without needing WSL IP changes.

Prereqs
- Windows 10/11 with WSL2 (Ubuntu)
- Bridge installed in WSL as described in bridge/README.md
- A BRIDGE_TOKEN defined in bridge/.env
- Node bridge UI listening on 0.0.0.0:8787 (bridge-service) and healthz endpoint working

Step 1: Start the bridge (WSL)
- On Windows, open a WSL terminal (Ubuntu)
- Navigate to bridge directory:
  cd /home/whitex/dev/github/wx-open-chat/bridge
- Start the bridge service (if not already running):
  ./scripts/bridge-service.sh start
- Quick health check from Windows via WSL bridge exposure:
  curl -s http://127.0.0.1:8787/healthz

Expected output (example):
{"ok":true,"echoMode":false,"localAdapterMode":true,"upstreamConfigured":false}

Step 2: Configure the Obsidian plugin (Windows)
- Bridge URL: http://127.0.0.1:8787/v1/chat
- Bridge Token: value from bridge/.env (BRIDGE_TOKEN)

Step 3: Ensure connectivity (optional)
- Test a chat ping from Windows side using the Obsidian plugin; if needed, hit the healthz endpoint directly:
  Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8787/healthz

Step 4: Auto-start on Windows login (optional)
- This can be achieved with a Windows Task Scheduler entry that launches WSL and starts the bridge on login.
- Example command (run as Administrator):
  schtasks /Create /F /SC ONLOGON /TN WXOpenChatBridge /TR "wsl.exe -d Ubuntu --cd /home/whitex/dev/github/wx-open-chat/bridge ./scripts/bridge-service.sh start"  
- If you need to run under a specific user, use /RU <username>.

Step 5: Health checks from Windows (quick)
- In PowerShell (as user):
  (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8787/healthz").Content
- Expect: {"ok":true,...}

Troubleshooting
- 401 Unauthorized: Check BRIDGE_TOKEN in bridge/.env and ensure Obsidian plugin uses the same token.
- 405 Method Not Allowed: Ensure the plugin calls POST on /v1/chat with JSON body; do not include extra path segments.
- ERR_CONNECTION_REFUSED: Bridge may not be running; ensure WSL bridge service is started and listening on 8787; verify port is not blocked by Windows firewall.
- If the Windows host cannot reach 127.0.0.1:8787, confirm WSL networking and that the bridge is bound to 0.0.0.0 (bridge listens on 0.0.0.0:8787 as per logs).

Security notes
- Keep BRIDGE_TOKEN secret; do not commit to repos.
- Optionally enable ALLOWED_TARGET_TYPE/Group/Topic to pin routes.

References
- See bridge/README.md for baseline bridge setup and port mappings.
