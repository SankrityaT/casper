#!/bin/bash
#created by kinjal
# One command for the live demo (Kinjal's side). Reads the root .env.
#   ./demo.sh preflight   check hub, Relay, boat VMs, tunnel, keys, running services
#   ./demo.sh up          start mirror, bridge, computer server (boat) and the :8791 tunnel if they're not running
#   ./demo.sh extend      push both boat VMs' auto-stop 4h out
#   ./demo.sh reset       stop agents, clear local claims so a fresh run starts clean
#   ./demo.sh go          the beats: agents claim + negotiate -> Kinjal steers jack -> wick drafts + rings the bell
#   ./demo.sh batty "<task>"  real Claude Code on batty's VM desktop gets a task (push rings Kinjal's bell)
#   ./demo.sh status      what's running
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd); R=$ROOT/hub/relay; C=$ROOT/hub/computer; LOGS=/tmp/casper-demo
mkdir -p $LOGS
env_get(){ grep "^$1=" "$ROOT/.env" | head -1 | cut -d= -f2-; }
HUB=$(env_get HUB_URL); ROOM=$(env_get CASPER_DM_ROOM); ROOM=${ROOM:-autopay}; BOAT=$(env_get BOAT_API_KEY)
ok(){ printf "  \033[32m✓\033[0m %s\n" "$*"; }; bad(){ printf "  \033[31m✗\033[0m %s\n" "$*"; FAIL=1; }
running(){ pgrep -f "$1" >/dev/null; }

preflight(){
  FAIL=0; echo "preflight"
  for k in RELAY_WORKSPACE_KEY HUB_URL BOAT_API_KEY ANTHROPIC_API_KEYS OPENAI_API_KEY COMPUTER_PUBLIC_URL; do
    [ -n "$(env_get $k)" ] && ok "$k set" || bad "$k missing in .env"; done
  curl -sf -m 10 "$HUB/room/$ROOM/summary" >/dev/null && ok "hub $HUB answers" || bad "hub not reachable: $HUB"
  T=$(jq -r .token $R/.state/observer.json 2>/dev/null)
  curl -sf -m 15 -H "Authorization: Bearer $T" "https://cast.agentrelay.com/v1/workspace/events?since=0&limit=1" >/dev/null && ok "Relay event log reachable" || bad "Relay event log failing"
  for f in $C/.state/boat.json $C/.state/boat-batty.json; do
    [ -f $f ] || { bad "no $(basename $f)"; continue; }
    ID=$(jq -r .id $f); S=$(curl -s -m 15 "https://boat.dev/api/v1/sandboxes/$ID" -H "Authorization: Bearer $BOAT" | jq -r '.sandbox.state')
    case $S in ready|idle|running) ok "boat VM $ID ($(basename $f .json)) $S";; *) bad "boat VM $ID is '$S' (resume it: boat resume $ID)";; esac
  done
  PUB=$(env_get COMPUTER_PUBLIC_URL)
  curl -sf -m 10 "$PUB/computer/wick/state" >/dev/null && ok "computer tunnel $PUB" || bad "computer tunnel down ($PUB): run ./demo.sh up"
  for p in mirror.ts bridge.ts "run server.ts"; do running "$p" && ok "$p running" || bad "$p not running: ./demo.sh up"; done
  [ ${FAIL} = 0 ] && echo "ready" || { echo "NOT ready"; return 1; }
}

up(){
  running mirror.ts || { (cd $R && nohup ./run-mirror.sh > $LOGS/mirror.log 2>&1 &); echo "started mirror"; }
  running bridge.ts || { (cd $R && nohup bun run bridge > $LOGS/bridge.log 2>&1 &); echo "started bridge"; }
  PUB=$(env_get COMPUTER_PUBLIC_URL)
  if ! curl -sf -m 8 "$PUB/computer/wick/state" >/dev/null || ! running "cloudflared.*8791"; then
    pkill -f "cloudflared.*8791"; : > /tmp/empty.yml
    (nohup cloudflared --config /tmp/empty.yml tunnel --url http://127.0.0.1:8791 > $LOGS/cf.log 2>&1 &)
    for i in $(seq 1 40); do U=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" $LOGS/cf.log | head -1); [ -n "$U" ] && break; sleep 1; done
    if [ -n "$U" ]; then sed -i '' "s#^COMPUTER_PUBLIC_URL=.*#COMPUTER_PUBLIC_URL=$U#" "$ROOT/.env"; echo "new tunnel $U"; pkill -f "run server.ts"; sleep 1; fi
  fi
  running "run server.ts" || { (cd $C && nohup bun run start:boat > $LOGS/computer.log 2>&1 &); sleep 3; echo "started computer server"; }
  sleep 2; curl -s -X POST localhost:8791/computer/batty/announce -H 'content-type: application/json' -d '{"text":"batty is on its own computer: Claude Code in a boat VM"}' >/dev/null && echo "announced batty's computer"
}

extend(){
  for f in $C/.state/boat.json $C/.state/boat-batty.json; do ID=$(jq -r .id $f)
    curl -s -m 20 -X PATCH "https://boat.dev/api/v1/sandboxes/$ID" -H "Authorization: Bearer $BOAT" -H "Content-Type: application/json" -d '{"ttlSeconds":14400}' | jq -r '"\(.sandbox.id // "?") ttl \(.sandbox.ttlSeconds // .error.message)"'
  done
}

reset(){ pkill -f agents.ts; rm -f $R/.state/claims.json; echo "agents stopped, local claims cleared (hub claims are the hub's)"; }

go(){
  waitfor(){ local i=0; until grep -qE "$2" "$1" 2>/dev/null; do sleep 2; i=$((i+2)); [ $i -ge $3 ] && { echo "timeout: $2"; return 1; }; done; }
  reset; (cd $R && nohup bun run agents > $LOGS/agents.log 2>&1 &); echo "beat 1: agents claim + negotiate"
  waitfor $LOGS/agents.log '1/3\]' 300 && sleep 3
  curl -s -X POST "$HUB/room/$ROOM/post" -H 'content-type: application/json' \
    -d '{"from":"kinjal","text":"@jack keep autopay off by default, and make sure the 404 test covers an unknown bill","kind":"msg","meta":{"to":"jack","mode":"steer"}}' >/dev/null
  echo "beat 2: Kinjal steered jack"; waitfor $LOGS/agents.log 'STEER' 180
  waitfor $LOGS/agents.log 'all cards shipped' 420; pkill -f agents.ts
  (cd $C && nohup bun run wick > $LOGS/wick.log 2>&1 &); echo "beat 3: wick drafting on its VM"
  waitfor $LOGS/wick.log 'waiting for approval' 300 && echo "beat 4: the bell is ringing for Kinjal. Approve it in the room."
}

status(){ for p in mirror.ts bridge.ts "run server.ts" agents.ts "run wick.ts" cloudflared; do running "$p" && echo "  up    $p" || echo "  down  $p"; done; }

batty(){ (cd $C && bun run desk-run batty "${1:?task}"); }

case ${1:-preflight} in preflight|up|extend|reset|go|status) "$1";; batty) shift; batty "$@";; *) sed -n 3,10p "$0";; esac
