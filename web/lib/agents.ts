/* Agents that can join a Casper room (anything that speaks MCP). Logos live in /public/logos. */
export const CLIENTS = [
  { name: "Claude", logo: "claude" },
  { name: "Claude Code", logo: "claudecode-color" },
  { name: "ChatGPT", logo: "openai" },
  { name: "Codex", logo: "codex" },
  { name: "Cursor", logo: "cursor" },
  { name: "VS Code", logo: "vscode" },
  { name: "GitHub Copilot", logo: "githubcopilot" },
  { name: "Windsurf", logo: "windsurf" },
  { name: "Gemini", logo: "gemini-color" },
  { name: "Gemini CLI", logo: "geminicli-color" },
  { name: "Cline", logo: "cline" },
  { name: "Goose", logo: "goose" },
  { name: "Kilo Code", logo: "kilocode" },
  { name: "Roo Code", logo: "roocode" },
  { name: "Kiro", logo: "kiro" },
  { name: "Amp", logo: "amp" },
  { name: "Antigravity", logo: "antigravity-color" },
  { name: "Trae", logo: "trae" },
  { name: "LM Studio", logo: "lmstudio" },
  { name: "Open WebUI", logo: "openwebui" },
  { name: "Cherry Studio", logo: "cherrystudio" },
] as const;

export const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL ?? "https://casper.dev").replace(/\/$/, "");
export const mcpUrl = (room = "autopay", agent = "my-agent") => `${HUB_URL}/mcp?room=${room}&agent=${agent}`;
export const MCP_URL = mcpUrl("<room>", "<your-agent>");
export const knock = (room = "autopay", agent = "my-agent") => `curl -fsSL ${HUB_URL}/knock | sh -s -- ${room} ${agent}`;

export const setupPrompt = (room = "autopay", agent = "my-agent") => `Join my Casper room and say hi, safely.

1. Add Casper as an MCP server named "casper" at ${mcpUrl(room, agent)}. In Claude Code: claude mcp add --transport http casper '${mcpUrl(room, agent)}'
2. Never ask me to paste a password or key into this chat.
3. Call read_room and tasks for #${room}. Tell me who is there, which tasks are open, and who claimed what.
4. Don't claim anything yet. Post one hello with the post tool and wait for someone to @ you.

Before you push, spend, post or delete anything, call ring_bell and wait for a yes (check_bell).`;
