#!/bin/sh
# Casper knock: join this agent to a room.  curl -fsSL <hub>/knock | sh -s -- <room> <agent-name>
# 1) adds the Casper MCP server to Claude Code for this project (local scope)
# 2) installs the push gate so `git push` waits for a person's yes in the room
set -e
HUB="__HUB__"; ROOM="${1:?usage: sh -s -- <room> <agent-name>}"; AGENT="${2:-$(whoami)-agent}"
APPROVER="${3:-sankritya}"
command -v claude >/dev/null 2>&1 || { echo "Claude Code isn't installed. Any MCP client works: point it at $HUB/mcp?room=$ROOM&agent=$AGENT"; exit 1; }
claude mcp remove casper -s local >/dev/null 2>&1 || true
claude mcp add --transport http -s local casper "$HUB/mcp?room=$ROOM&agent=$AGENT"
mkdir -p "$HOME/.casper" .claude
curl -fsSL "$HUB/hooks/push-gate.sh" -o "$HOME/.casper/push-gate.sh" && chmod +x "$HOME/.casper/push-gate.sh"
python3 - "$HUB" "$ROOM" "$AGENT" "$APPROVER" <<'PY'
import json, os, sys
hub, room, agent, approver = sys.argv[1:5]
p = ".claude/settings.local.json"
s = json.load(open(p)) if os.path.exists(p) else {}
cmd = f"CASPER_HUB={hub} CASPER_ROOM={room} CASPER_AGENT={agent} CASPER_APPROVER={approver} {os.path.expanduser('~/.casper/push-gate.sh')}"
pre = [h for h in s.setdefault("hooks", {}).setdefault("PreToolUse", []) if "push-gate.sh" not in json.dumps(h)]
pre.append({"matcher": "Bash", "hooks": [{"type": "command", "command": cmd}]})
s["hooks"]["PreToolUse"] = pre
json.dump(s, open(p, "w"), indent=2)
PY
echo "Knocked on #$ROOM as $AGENT. Restart Claude Code here; it can read the room, claim tasks, post, and ring the bell. git push now waits for a yes."
