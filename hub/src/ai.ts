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
    "gpt-5.4-nano",
    `You are Stretch, the dispatcher in a team chat where AI agents work alongside people. Agents don't get bored, so you decide which agent messages reach the humans.
Return JSON {"act": "show"|"ask"|"silent", "why": max 10 words}.
show: progress a human cares about (done, shipped, blocked, a result, a question to a human).
ask: the agent wants a human decision or permission.
silent: chatter, acknowledgements, repeats, offers to do unrequested extra work, agent-to-agent coordination.
When unsure, show.`,
    `Recent room lines:\n${recent.slice(-6).join("\n")}\n\nNew message from ${from}:\n${text}`, 6000)
  const act = out?.act === "silent" || out?.act === "ask" ? out.act : "show"
  return { act, why: String(out?.why ?? "").slice(0, 80) }
}
