# Computers for agents: boat.dev vs Superserve vs Freestyle

Oct 30. From the docs only; nothing tested. Both Superserve and Freestyle sponsor Haunted Hacks (flyer, Oct 31). Sponsors: Terse and Agent Relay (hosts), OpenAI, Supabase, Mastra, Freestyle, Superserve; powered by BuilderBase. boat.dev is not a sponsor.

| | boat.dev | Superserve | Freestyle |
|---|---|---|---|
| Desktop with Chrome | Yes, 1080p | Yes, `superserve/desktop` template, 1280x800 | Build it yourself (GNOME + noVNC guide) |
| Live view to embed | WebRTC URL, open within 10 min | noVNC URL `6080-{id}.sandbox.superserve.ai`, private URLs expire in 60 s | Route port 6080 yourself; public unless you add auth |
| Two people watching | **No**: a new viewer takes the stream | Probably yes (VNC `-AlwaysShared`) | Probably yes |
| Human takeover | Yes | Yes via noVNC (not tested) | Yes via noVNC |
| Agent included | **Yes**: `boat prompt` (Claude/Codex), `/events`, `/steer`, `/interrupt` | No. TS computer-use API (`step()` = actions + screenshot); we write the loop | No |
| Logins survive stop | Yes (disk snapshot) | Yes (pause keeps memory + disk; apps stay open) | Yes |
| Template / fork | Snapshots, seconds | Snapshots under 1 s, forks | Snapshots under 50 ms |
| Region | EU only | US-east | Unknown |
| Cost | $20 plan | $100 free credit (after adding billing); 2 GiB RAM cap on Free | $50 Hobby |

Docs: docs.superserve.ai/sandbox/desktop.md, /preview-urls.md, /snapshots.md; freestyle.sh/docs/vms/*.
