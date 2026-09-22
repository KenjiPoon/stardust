#!/bin/bash
cd "$(dirname "$0")" || exit 1
STARDUST_NODE="$(command -v node 2>/dev/null)"
if [ -z "$STARDUST_NODE" ]; then
  shopt -s nullglob
  for candidate in /usr/local/bin/node /opt/homebrew/bin/node "$HOME"/.nvm/versions/node/*/bin/node; do
    if [ -x "$candidate" ]; then STARDUST_NODE="$candidate"; fi
  done
fi
if [ -z "$STARDUST_NODE" ]; then echo "找不到 Node.js。請在啟動視窗按 Control+C 停止。"; exit 1; fi
exec "$STARDUST_NODE" server.mjs --stop
