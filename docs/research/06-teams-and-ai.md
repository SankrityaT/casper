# Teams and AI: what's missing (research, Oct 30)

Three passes: published studies, what people say on X, Reddit and HN (X read through Juno), and a competitor map. Numbers marked (2nd) come from secondary coverage.

## The headline
- **YC's Fall 2026 RFS "Multiplayer AI" (Aaron Epstein)** asks for a "production-ready multiplayer AI workspace that lets a whole team collaborate with AI agents in real time": watch, steer, hand off, and turn past sessions into a searchable team knowledge base. That is Casper. It also means YC-funded competitors are coming.
- **Microsoft Work Trend Index, May 2026:** organisational factors explain 67% of AI impact, individual factors 32%. The best AI users are far more likely to have teams that share agents and mistakes (61% vs 36%).

## Studies
| Finding | Source |
|---|---|
| 95% of company GenAI pilots fail; the cause is a "learning gap" (tools don't remember or adapt) | MIT NANDA, Aug 2025 (2nd, Fortune) |
| 39% say "no one" is responsible when an agent makes a mistake; 9% of orgs review employee-built agents; 64% say agents are unreliable | Asana State of AI at Work 2025 (2nd) |
| 40% of US workers got AI "workslop" last month, ~2 h lost each time; recipients rate the sender as less capable and reliable | BetterUp/Stanford, HBR, Sept 2025 |
| 77% of company Claude API use is automation; deployment is limited by "access to information" more than model ability | Anthropic Economic Index, Sept 2025 |
| Over 40% of agentic AI projects will be cancelled by 2027 ("inadequate risk controls") | Gartner, Jun 2025 |
| 96% of orgs use agents, 12% manage them centrally; 68% can't tell agent actions from human ones | OutSystems / CSA 2026 (vendor-funded) |
| Teams spend 25% of their time searching for answers | Atlassian State of Teams 2025 |

## What people say (strongest themes)
1. **The agent's context is stuck in one person's session.** "I end up playing telephone with the LLM — copying my teammate's questions from Slack to the LLM chat, pasting the answers back." (HN, Jun 2026). "Most of what evaporates isn't knowledge, it's decisions: we tried X, rejected it because Y." (r/ClaudeAI, Sept 2026)
2. **One human supervising many agents becomes the bottleneck.** "the bottleneck quickly became my ability to personally supervise all these agents" (@voooooogel, 2,062 likes). "managing 10 agents can become a full time job"
3. **Teammates' agent output floods review.** "if I take any reasonable amount of time to review I get told I'm slowing the team down" (r/ExperiencedDevs, 230 upvotes)
4. **Agent sprawl.** Nobody knows which agents exist, who owns them, or what they can touch.
5. **Approvals become a reflex.** "after 3 months you just click yes… caught maybe 2 actual mistakes in the last 200 approvals." "Multiplayer is hard for a boring reason: accountability." (@CyrilCoste, Oct 30)
6. **Context dies in handoffs** between agents.
- **Weak:** demand for agents from different *companies* talking. On X the phrase is mostly a joke. Treat cross-company as later, not the lead.

## Competitors (who covers what)
- **Nobody combines** agents from different owners with a live computer you can take over, or a canvas with agent computers.
- **Team memory is now standard** (PromptQL, Notion, Town, Claude Tag, Pentagon). It can't be the edge on its own.
- **Most dangerous:**
  - **Slack:** Slack Code puts Claude, Devin and Copilot in channels, Slack Connect spans companies, and it owns distribution.
  - **Grok Bot:** cloud computer, takeover, approval cards, shared bots within a team.
  - **PromptQL:** $136M, "multiplayer AI that replaces Slack", a computer per bot, a team wiki.
- **Closest look-alike:** Pentagon (YC S26), a spatial canvas of agents plus a knowledge base, but no agent computers.
