#!/bin/bash
# Claude Code PreToolUse hook: no `git push` until a person approves it in the Casper room.
# Install (in the agent's project .claude/settings.json):
#   {"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"CASPER_HUB=<hub> CASPER_ROOM=<room> CASPER_AGENT=<name> /path/to/push-gate.sh"}]}]}}
# First push attempt rings the bell (with the commits and files) and blocks; once approved, the same push goes through.
# Fails closed: if the hub can't be reached, the push is blocked.
set -u
INPUT=$(cat)
CMD=$(printf %s "$INPUT" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("tool_input") or {}).get("command",""))' 2>/dev/null)
case "$CMD" in *"git push"*) ;; *) exit 0 ;; esac
case "$CMD" in *"git commit"*|*"git rebase"*|*"git merge"*|*"git reset"*|*"git am "*)
  echo "Casper: run the commit on its own first, then 'git push' as a separate command, so the bell asks about the right commit." >&2; exit 2 ;; esac
HUB=${CASPER_HUB:?}; ROOM=${CASPER_ROOM:?}; AGENT=${CASPER_AGENT:-agent}; FOR=${CASPER_APPROVER:-sankritya}
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
ASK="push-$AGENT-$SHA"
STATUS=$(curl -s -m 8 "$HUB/room/$ROOM/ask/$ASK" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status","none"))' 2>/dev/null || echo error)
case "$STATUS" in
  approved) exit 0 ;;
  declined) echo "Casper: $FOR said not now to pushing $SHA. Ask them in #$ROOM what to change." >&2; exit 2 ;;
  open) echo "Casper: still waiting for $FOR to approve pushing $SHA in #$ROOM. Keep working; try the push again after they answer." >&2; exit 2 ;;
  error) echo "Casper: couldn't reach the hub, so the push is blocked (fails closed)." >&2; exit 2 ;;
esac
FILES=$(git diff --name-only "@{u}..HEAD" 2>/dev/null || git show --name-only --format= HEAD 2>/dev/null)
LOG=$(git log --oneline "@{u}..HEAD" 2>/dev/null | head -5 || git log --oneline -1)
BODY=$(python3 - "$ASK" "$AGENT" "$FOR" "$SHA" "$FILES" "$LOG" <<'PY'
import json,sys
ask,agent,who,sha,files,log=sys.argv[1:7]
print(json.dumps({"id":ask,"kind":"bell","from":agent,"text":f"Ready to push {sha}:\n{log}".strip(),
  "meta":{"askId":ask,"for":who,"title":f"Push {sha} to main","files":[f for f in files.split("\n") if f][:20]}}))
PY
)
curl -s -m 8 -X POST "$HUB/room/$ROOM/post" -H 'content-type: application/json' -d "$BODY" >/dev/null || { echo "Casper: couldn't reach the hub, so the push is blocked (fails closed)." >&2; exit 2; }
echo "Casper: rang the bell for $FOR to approve pushing $SHA in #$ROOM. Keep working; try the push again after they answer." >&2
exit 2
