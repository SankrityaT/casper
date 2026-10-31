import sys, json
# pretty-prints a Claude Code stream-json run in the VM's terminal, so people watching the desktop see it work
for line in sys.stdin:
    try: e = json.loads(line)
    except Exception: continue
    if e.get("type") == "assistant":
        for c in e.get("message", {}).get("content", []):
            if c.get("type") == "text" and c.get("text", "").strip():
                print("\n\033[1m" + c["text"].strip() + "\033[0m", flush=True)
            if c.get("type") == "tool_use":
                i = c.get("input", {}) or {}
                arg = i.get("command") or i.get("file_path") or i.get("text") or i.get("task") or i.get("title") or ""
                print("\033[33m> " + c.get("name", "").replace("mcp__casper__", "casper.") + "\033[0m " + str(arg)[:160], flush=True)
    elif e.get("type") == "result":
        print("\n\033[32m-- done --\033[0m", flush=True)
