# wx-open-chat Bridge

Minimal HTTP bridge for the Obsidian plugin.

## Why it exists
- Plugin sends simple HTTP JSON.
- Bridge enforces auth + route safety.
- Bridge forwards to your OpenClaw-compatible backend.
- Local adapter mode avoids exposing extra network APIs.

## Run
```bash
cd bridge
cp .env.example .env
# edit .env
npm install
npm run start
```

## Keep bridge running (recommended)
```bash
cd bridge
./scripts/bridge-service.sh start
./scripts/bridge-service.sh status
./scripts/bridge-service.sh logs
```

## Modes
1. **Echo mode** (`ECHO_MODE=true`)
   - Good for plugin smoke tests
2. **Local adapter mode** (`LOCAL_ADAPTER_MODE=true`)
   - Calls local `openclaw` CLI with route->session mapping
3. **Upstream forward mode**
   - Set `UPSTREAM_URL` (+ optional token) and keep both flags false

## Local adapter route mapping
Prefer private mapping file (`OPENCLAW_ROUTE_MAP_JSON=.local/route-map.json`):

```json
{
  "main": "session_main_abc",
  "group:-100123456": "session_group_xyz",
  "topic:-1003818622136:16": "session_topic_work"
}
```

This file is gitignored.

## Security defaults
- No DB, no chat persistence by default.
- Bearer token support.
- Optional strict route pinning (`ALLOWED_*`).
- ID redaction in logs by default.

## API
### `POST /v1/chat`
Request:
```json
{
  "message": "hello",
  "messages": [{"role":"user","content":"hello"}],
  "route": {"type":"topic","groupId":"-100...","topicId":"16"},
  "context": {"vaultName":"Business"}
}
```

Response:
```json
{"reply":"..."}
```

### `GET /healthz`
Returns bridge status.
