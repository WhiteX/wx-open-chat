#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/.local/bridge.pid"
LOG_FILE="$ROOT_DIR/.local/bridge.log"

mkdir -p "$ROOT_DIR/.local"

start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "bridge already running (pid $(cat "$PID_FILE"))"
    exit 0
  fi

  # Recover from stale/missing pid file by checking the port owner.
  PORT_PID="$(ss -ltnp 2>/dev/null | awk '/:8787 /{print $NF}' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -n1 || true)"
  if [ -n "$PORT_PID" ] && kill -0 "$PORT_PID" 2>/dev/null; then
    echo "bridge port already in use by pid $PORT_PID; stopping it first"
    kill "$PORT_PID" || true
    sleep 1
  fi

  cd "$ROOT_DIR"
  set -a
  source .env
  set +a

  nohup node src/server.mjs >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1

  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "bridge started (pid $(cat "$PID_FILE"))"
  else
    echo "bridge failed to start, check $LOG_FILE" >&2
    exit 1
  fi
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "bridge not running"
    exit 0
  fi

  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    sleep 1
  fi

  rm -f "$PID_FILE"
  echo "bridge stopped"
}

status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "bridge running (pid $(cat "$PID_FILE"))"
    exit 0
  fi
  echo "bridge not running"
  exit 1
}

restart() {
  stop || true
  start
}

logs() {
  tail -n 80 "$LOG_FILE" 2>/dev/null || true
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  logs) logs ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}" >&2
    exit 1
    ;;
esac
