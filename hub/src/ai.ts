/* OpenAI calls the hub makes: meeting → task cards, and Stretch's triage of agent messages. */

const KEY = () => process.env.OPENAI_API_KEY ?? ""
export const usage = { calls: 0, failures: 0, promptTokens: 0, completionTokens: 0, byModel: {} as Record<string, number> }

async function chatJson<T>(model: string, system: string, user: string, timeoutMs: number): Promise<T | null> {
  if (!KEY()) return null
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY()}`, "content-type": "application/json" },
      body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!r.ok) { usage.failures++; console.warn("openai", r.status, (await r.text()).slice(0, 200)); return null }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    usage.calls++; usage.byModel[model] = (usage.byModel[model] ?? 0) + 1
    usage.promptTokens += j.usage?.prompt_tokens ?? 0; usage.completionTokens += j.usage?.completion_tokens ?? 0
    return JSON.parse(j.choices?.[0]?.message?.content ?? "null") as T
  } catch (e) { console.warn("openai", String(e).slice(0, 200)); return null }
}

export type Task = { id: string; title: string; owner_hint?: string; why?: string }

export async function meetingToTasks(transcript: string): Promise<{ summary: string; tasks: Task[] }> {
  const out = await chatJson<{ summary?: string; tasks?: { title?: string; owner_hint?: string; why?: string }[] }>(
    "gpt-5.4-mini",
    `You turn a team call transcript into work for a room of people and AI agents.
Return JSON: {"summary": one sentence, "tasks": [{"title": short imperative (max 8 words), "owner_hint": "code"|"design"|"launch"|"people", "why": one short line}]}.
3 to 4 tasks, only things that were actually agreed. Each task must be a distinct job one agent can own end to end (for example: build it in code, write the demo or launch script, draft the launch post). Approvals, "ask before posting", and implementation details of another task are NOT separate tasks; fold them into the task they belong to. No filler.`,
    transcript.slice(0, 20000), 30000)
  const tasks = (out?.tasks ?? []).filter((t) => t.title).slice(0, 6).map((t, i) => ({ id: `t${Date.now().toString(36)}${i}`, title: String(t.title).slice(0, 80), owner_hint: t.owner_hint, why: t.why }))
  return { summary: out?.summary ?? "From the call.", tasks }
}

export type Verdict = { act: "show" | "ask" | "silent"; why: string }

/** Stretch: should this agent message reach people? show = worth a human's attention, ask = needs a human decision,
    silent = agent chatter that can stay in the backchannel. Errs on the side of showing. */
/** Jev (TypeSafe): a ~100 ms typed judgment, used first for Stretch's triage; OpenAI is the fallback. */
export const jevUsage = { calls: 0, failures: 0 }
async function jevTriage(from: string, text: string, recent: string[]): Promise<Verdict | null> {
  const key = process.env.TYPESAFE_API_KEY
  if (!key) return null
  try {
    const r = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ model: "jev-latest", state: { recent: recent.slice(-8).join("\n"), message: `${from}: ${text}` }, questions: { reach: { type: "choice",
        instructions: "An AI agent posted this in a team room shared with people. Should it reach the people?",
        criteria: { silent: "step-by-step progress, claims or 'taking X', acknowledgements, repeats of a recent line, offers of unrequested extra work, agent-to-agent coordination", show: "a task finished or shipped for the first time, a result or number a person should see, the agent is blocked, or a direct reply to a person", ask: "the agent needs a person's decision or permission" } } } }),
    })
    if (!r.ok) { jevUsage.failures++; return null }
    const j = (await r.json()) as { answers?: { reach?: { choice?: string; confidence?: number } } }
    jevUsage.calls++
    const a = j.answers?.reach
    if (!a?.choice) return null
    // act when sure; when Jev isn't sure, let the person see it
    const act = (a.confidence ?? 0) < 0.6 ? "show" : (a.choice as Verdict["act"])
    return { act, why: `Jev ${a.choice} (${Math.round((a.confidence ?? 0) * 100)}%)` }
  } catch { jevUsage.failures++; return null }
}

export async function triage(from: string, text: string, recent: string[]): Promise<Verdict> {
  const jev = await jevTriage(from, text, recent)
  if (jev) return jev
  const out = await chatJson<{ act?: string; why?: string }>(
    "gpt-5.4-mini",
    `You are Stretch, the dispatcher in a team chat where AI agents work alongside people. Agents don't get bored and keep posting; your job is to protect the humans' attention.
Return JSON {"act": "show"|"ask"|"silent", "why": max 8 words}.
show ONLY: a task finished or shipped (first time it's said), the agent is blocked, a result or number a human should see, or a direct reply to something a human asked.
ask: the agent needs a human decision or permission.
silent: step-by-step progress ("1/3", "starting", "next I'll…"), claims or "taking X" (the room already shows claims), acknowledgements, anything a recent line already said (repeats), offers of unrequested extra work, agent-to-agent coordination.`,
    `Recent room lines (oldest first):\n${recent.slice(-10).join("\n")}\n\nNew message from ${from}:\n${text}`, 8000)
  const act = out?.act === "silent" || out?.act === "ask" ? out.act : "show"
  return { act, why: String(out?.why ?? "").slice(0, 80) }
}

/** Casper answers a person's question from the room's own history (the room is the memory). */
export async function answerFromRoom(question: string, history: string[]): Promise<string> {
  const out = await chatJson<{ answer?: string }>(
    "gpt-5.4-mini",
    `You are Casper, the host of a team room where people and AI agents work. Answer the person's question using ONLY the room history below. Quote who said what (name and #seq) when it helps. If the history doesn't contain the answer, say so in one line. Max 3 sentences. Return JSON {"answer": "..."}.`,
    `Room history (oldest first):\n${history.slice(-250).join("\n")}\n\nQuestion: ${question}`, 30000)
  return out?.answer?.trim() || "I couldn't find that in this room."
}

export type Dispatch = { action: "answer" | "wake" | "summon" | "none"; agent?: string; task?: string; why: string }
/** Stretch reads a person's message that wasn't addressed to anyone and decides who should act on it. */
export async function dispatch(from: string, text: string, agents: { name: string; busy: boolean }[], recent: string[]): Promise<Dispatch> {
  const out = await chatJson<Partial<Dispatch>>(
    "gpt-5.4-mini",
    `You are Stretch, the dispatcher of a team room where people and AI coding agents work together. A person just posted a message without addressing anyone. Decide what should happen.
Agents available in this room (name, busy?): ${agents.map((a) => `${a.name}${a.busy ? " (busy)" : ""}`).join(", ") || "none yet"}.
Return JSON {"action": "answer"|"wake"|"summon"|"none", "agent": name or null, "task": what the agent should do, in one or two sentences, or null, "why": max 10 words}.
answer: it's a question about the room's history or status; Casper answers. wake: an existing idle agent should do it. summon: it's real work (code, docs, research, a launch) and no idle agent fits; a new agent gets its own computer. none: chit-chat or nothing to do.`,
    `Recent room lines:\n${recent.slice(-12).join("\n")}\n\n${from}: ${text}`, 12000)
  const action = (["answer", "wake", "summon", "none"] as const).includes(out?.action as never) ? (out!.action as Dispatch["action"]) : "none"
  return { action, agent: out?.agent ?? undefined, task: out?.task ?? undefined, why: String(out?.why ?? "") }
}

/** Stretch splits the tasks from a call between the room's agents and new ones. */
export async function assign(tasks: { id: string; title: string; owner_hint?: string }[], agents: string[]): Promise<{ task: string; agent: string | null }[]> {
  const out = await chatJson<{ plan?: { task?: string; agent?: string | null }[] }>(
    "gpt-5.4-mini",
    `You are Stretch, the dispatcher. Assign each task to an existing agent (by name) or to null (a new agent will be started for it). Prefer existing agents; never give one agent more than one task. Tasks that only a person can do (decisions, approvals, calls) get "person".
Return JSON {"plan":[{"task": exact title, "agent": name | null | "person"}]}.`,
    `Agents: ${agents.join(", ") || "none"}\nTasks:\n${tasks.map((t) => `- ${t.title} (${t.owner_hint ?? "work"})`).join("\n")}`, 12000)
  return (out?.plan ?? []).filter((p) => p.task).map((p) => ({ task: String(p.task), agent: p.agent ?? null }))
}
