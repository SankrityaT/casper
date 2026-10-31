# Casper: the company knowledge base (Oct 31)

Two pipelines, one store.
1. **Backfill**: everything the company knew before Casper, imported once, indexed well.
2. **Compounding**: what people and agents learn every day in Casper, folded back in.

Read with `memory.md` (who can see what) and `agent-harness.md` (how memory reaches an agent).

---

## The store: gbrain, with our rules on top

**gbrain** (Garry Tan's open-source company brain, MIT) is the store. It already does what this doc needs: markdown pages
with frontmatter and `[[links]]` become a typed graph, with hybrid keyword + vector search, `remember` / `forget` to correct
facts, cited synthesis, a company-brain page shape (people, customers, decisions with `supersedes`, meetings), and MCP.
Postgres + pgvector backs shared brains. Pin a commit; it ships daily.

What Casper adds, because gbrain doesn't know our rooms:
- **One brain per wing** (a hard wall between teams), plus a source per room inside it.
- **Visibility filter in the hub**: every read goes through the hub, which drops anything the caller's owner can't see and
  enforces "origin sticks". Agents never get a raw gbrain token.
- **Fatso is the only writer** (`put_page`, `remember`, `forget`), so what gets learned stays deliberate.
- **Events from the Room actor** (approvals, corrections, handoffs) are what Fatso learns from.
- **Playbooks live in gbrain's skills catalog** (with approved publishers): Fatso publishes a skill when a kind of task
  succeeds a few times; agents load it on similar tasks. No separate skill store.
- **Pitch note:** keep the Terse actors and Relay visible in the demo; gbrain stays behind the scenes (judges may see "a wrapper").
- **Run it next to the hub, once.** One gbrain process (PGLite takes one writer), reached only by the hub. Agents get
  results injected into their prompt or from `casper_memory_search`; no `gbrain mcp expose` or Tailscale this weekend.
  Needs Bun ≥ 1.4.4 (boat VMs ship 1.3.14, so it never runs there).
- **Ask an organizer** whether open-source libraries like gbrain (and agent-browser) are allowed (all code is written at the event).
  Fallback: a markdown folder the hub greps.
- **Not used: gstack.** gbrain covers memory and skills.

The tiers below are how we use it.

## The three tiers

| Tier | What | Where | Why there |
|---|---|---|---|
| **Raw** | every imported doc, thread, PR, transcript, chunked, with source URL, author, time and the source's own permissions | gbrain pages (its hybrid index) | tens of thousands of chunks, hybrid search, cheap to re-embed |
| **Facts** | small atomic facts: decisions, owners, definitions, how-tos, with links (updates / extends / derives), a trust level, an expiry and the source spans they came from | gbrain (`remember` / `forget`, linked pages), written only by Fatso | gbrain already does correctable, linked, cited facts |
| **Profile** | a short always-loaded summary per wing and per room: charter, glossary, who owns what, active projects, the territory index | a gbrain page, cached in the Space / Room actor | loaded at every session start, rebuilt when facts change |

Note: actors stay the source of truth for anything that must be ordered (the event log, approvals, claims). gbrain is
what Fatso learns *from* those events; it can be rebuilt from the sources plus the event log at any time.

---

## 1. Backfill: bringing in what they had before

```
connect sources ─► fetch (resumable) ─► normalize ─► dedupe ─► chunk by structure ─► index raw (hybrid)
                                                                     │
                                         prioritize high-signal ─────┘
                                                   │
                                                   ▼
                                Fatso distills facts ─► resolve entities ─► review queue ─► profiles
```

**Sources, in order of value per minute of setup**
1. **GitHub**: code (by symbol), merged PRs with their description and review comments, issues, CODEOWNERS, git history.
2. **Linear / Jira**: issues, projects, assignees, status history.
3. **Notion / Confluence / Google Docs**: specs, runbooks, RFCs.
4. **Slack export**: channels the admin picks. Threads with replies, not every message.
5. **Meeting transcripts**: Zoom, Granola, Meet.
6. Opt-in per person: email and calendar, which stay in that person's own layer ("Yours").

**Each importer is an actor.** One Terse actor per source holds its cursor and checkpoints, so a 3-hour import
survives crashes and resumes (Lazarus again). After the first pass, webhooks keep it incremental.

**Normalize** everything to one shape:
`Doc { id, source, url, title, author, created, updated, acl, parent, kind }`. Permissions come along: a private
Slack channel or a restricted Notion page maps to the matching memory layer, never wider.

**Dedupe**: content hash for exact copies, near-duplicate check for pasted specs and edited copies. Keep the newest
and link the rest.

**Chunk by structure, not by fixed size**: code by function and class, docs by heading, Slack by thread, PRs as
description + review, transcripts by speaker turn. Each chunk keeps its parent's title and permissions.

**Prioritize before spending model money.** Embedding everything is cheap; running a model over everything isn't.
Only high-signal sources get distilled into facts:
- merged PRs, edited-in-the-last-year docs, RFCs and runbooks
- Slack threads with a decision word ("we'll go with", "decided", "let's not") or 5+ replies
- issues closed with a resolution
- skip bot messages, joins, emoji-only replies

**Distill (Fatso, in the background).** From high-signal sources, extract only what changes future answers:
- **Decisions**: "we chose X because Y", by whom, when, superseding what
- **Ownership**: who owns which area (from CODEOWNERS, git authorship, issue assignees, who answers questions about it)
- **Glossary and entities**: projects, services, customers, internal names ("Hydra = the billing worker")
- **How-tos**: deploy steps, on-call runbooks
- **Open questions**: things asked and never answered

Every fact cites the exact source spans. Old decisions that were later reversed are linked with **updates**: the
newest wins and the old one stays as history, so agents don't act on a decision from 2023 that died in 2024.

**Resolve entities**: the same person across Slack, GitHub and Linear (by email and name) becomes one person; the
same service named three ways becomes one entity. This is what lets an agent know who to ask.

**Quality, before anyone relies on it**
- **Review queue**: for each area, Fatso shows its owner ~20 facts it learned ("Here's what I think is true about
  billing"). Approve, fix or forget. Approved facts become trusted.
- **Coverage report**: areas with no owner, no decisions or only stale docs, shown to the wing owner.
- **Retrieval check**: generate questions from the sources ("who owns the billing worker?") and measure whether search
  finds the answer in its top results. Re-run after every import. This is the number to watch.

**Day-one output**: a wing profile (charter, glossary, owners, active projects) that every agent loads at session
start, plus a searchable Library. A new agent in the room knows what "the migration" means on its first turn.

---

## 2. Compounding: learning from daily work

Casper's advantage over learning from Slack: work in Casper is already **structured events** in the Room actor.
Claims, handoffs, approvals, "Not now", decisions, corrections and reactions are labelled signal, not chat to guess at.

**What triggers learning** (Fatso dreams after the moment settles, never mid-conversation):
| Event | What gets learned |
|---|---|
| Approval decided | a confirmed decision, with the diff or evidence attached |
| "Not now" / a person corrects an agent ("no, it's opt-in") | an update to the fact the agent used, or a new rule |
| Agents disagree and a person picks | the winning fact; the other is marked superseded |
| Thread goes quiet / task ships | a summary: what was done, by whom, which files, what was decided |
| Call transcript lands | tasks (Casper) + decisions and owners (Fatso) |
| PR merged | ownership drift (who's touching what now) |

**Trust levels**, used to rank and to decide what gets injected:
`proposed` (an agent said it) < `observed` (from a source) < `confirmed` (a person approved it or decided it).
Agents can propose; only people confirm.

**Playbooks (skills from real runs)**: when the same kind of task succeeds a few times ("ship a billing flag"),
Fatso writes a playbook from the actual runs: steps, files touched, checks, who approved. The next agent on a
similar task gets the playbook. This is how the team's way of working compounds, not just its facts.

**Notebook → room → wing promotion**: an agent's private notes get promoted when they prove useful (cited in an
approved answer) or a person confirms them. Nothing jumps layers silently.

**Feedback on recall**: the hub logs which memories were injected into a turn and whether that turn ended approved,
corrected or ignored. Useful memories rank higher; unused ones decay; corrected ones get fixed.

**Gardening (weekly, background)**: merge duplicates, expire time-bound facts, flag stale ones (source changed and no
reads in 90 days), refresh owners from recent commits, rebuild profiles.

---

## How it reaches an agent (recap)
1. **Profile** at session start: wing + room profile, territory index.
2. **Prompt hook**: hybrid search over the caller's layers (full-text + vector + one hop along fact links), reranked
   by relevance × trust × recency; ~10 short memories injected.
3. **Tool**: `casper_memory_search` mid-task, returning facts with their sources and, when asked, the raw chunks.
Search always filters by the caller's layers first, then ranks. Every read is logged.

## Saturday cut
- Import **one GitHub repo + one Slack export or Notion space**; indexed in gbrain.
- Fatso distills decisions and owners for the demo repo; wing profile generated.
- Approvals in the demo become confirmed decisions (already designed).
- Prompt hook injecting memories into Claude Code.
Later: entity resolution, review queue, playbooks, recall feedback, gardening.
