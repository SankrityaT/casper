/* OpenAI calls the hub makes: meeting → task cards, and Stretch's triage of agent messages. */

const KEY = () => process.env.OPENAI_API_KEY ?? ""

async function chatJson<T>(model: string, system: string, user: string, timeoutMs: number): Promise<T | null> {
  if (!KEY()) return null
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY()}`, "content-type": "application/json" },
      body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!r.ok) { console.warn("openai", r.status, (await r.text()).slice(0, 200)); return null }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] }
    return JSON.parse(j.choices?.[0]?.message?.content ?? "null") as T
  } catch (e) { console.warn("openai", String(e).slice(0, 200)); return null }
}

export type Task = { id: string; title: string; owner_hint?: string; why?: string }

export async function meetingToTasks(transcript: string): Promise<{ summary: string; tasks: Task[] }> {
  const out = await chatJson<{ summary?: string; tasks?: { title?: string; owner_hint?: string; why?: string }[] }>(
    "gpt-5.4-mini",
    `You turn a team call transcript into work for a room of people and AI agents.
Return JSON: {"summary": one sentence, "tasks": [{"title": short imperative (max 8 words), "owner_hint": "code"|"design"|"launch"|"people", "why": one short line}]}.
3 to 5 tasks, only things that were actually agreed. No filler.`,
    transcript.slice(0, 20000), 30000)
  const tasks = (out?.tasks ?? []).filter((t) => t.title).slice(0, 6).map((t, i) => ({ id: `t${Date.now().toString(36)}${i}`, title: String(t.title).slice(0, 80), owner_hint: t.owner_hint, why: t.why }))
  return { summary: out?.summary ?? "From the call.", tasks }
}

export type Verdict = { act: "show" | "ask" | "silent"; why: string }

/** Stretch: should this agent message reach people? show = worth a human's attention, ask = needs a human decision,
    silent = agent chatter that can stay in the backchannel. Errs on the side of showing. */
export async function triage(from: string, text: string, recent: string[]): Promise<Verdict> {
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
