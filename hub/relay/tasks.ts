//created by kinjal
// The 3 task cards jack + batty split, and claim(task) against the hub.
// HUB_URL set   -> POST ${HUB_URL}/room/:room/claim {task, agent}; 200 {ok:true, owner} | 409 {ok:false, owner}.
// HUB_URL unset -> first-come claims kept in .state/claims.json.
// Either way a kind:"claim" event lands in out.jsonl (and on the hub mirror).
import { DM_ROOM, HUB_URL, publish, readJson, writeJson, type CasperEvent } from "./state";

export interface TaskCard {
  id: string;
  title: string;
  brief: string;
}

// Same ids as web/components/ws/data.tsx TASKS (tPost belongs to the computer step).
export const TASKS: TaskCard[] = [
  { id: "tApi", title: "Autopay API", brief: "PATCH /autopay on bills: opt-in flag stored as a column on bills, tests." },
  { id: "tUi", title: "Autopay toggle UI", brief: "Toggle on the bill screen that calls PATCH /autopay, optimistic state, error toast." },
  { id: "tLog", title: "Changelog", brief: "Changelog entry for autopay once API + UI ship." },
];

export const taskById = (id: string) => TASKS.find((t) => t.id === id);

type Claims = Record<string, string>; // taskId -> agent
export const loadClaims = (): Claims => readJson<Claims>("claims.json") ?? {};

export const postToHub = (event: CasperEvent) => publish(event);

export async function claim(taskId: string, agent: string, room = DM_ROOM): Promise<{ ok: boolean; owner: string }> {
  let result: { ok: boolean; owner: string };
  if (HUB_URL) {
    try {
      const res = await fetch(`${HUB_URL}/room/${encodeURIComponent(room)}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: taskId, agent }),
      });
      if (res.status !== 200 && res.status !== 409) throw new Error(`HTTP ${res.status}`);
      result = (await res.json()) as { ok: boolean; owner: string };
    } catch (err) {
      console.warn("hub claim failed, using local claims:", (err as Error).message);
      result = localClaim(taskId, agent);
    }
  } else {
    result = localClaim(taskId, agent);
  }

  const task = taskById(taskId);
  await postToHub({
    room,
    kind: "claim",
    from: agent,
    text: result.ok ? `${agent} claimed ${task?.title ?? taskId}` : `${agent} tried ${task?.title ?? taskId}, ${result.owner} has it`,
    ts: new Date().toISOString(),
    meta: { task: taskId, ok: result.ok, owner: result.owner },
  });
  return result;
}

function localClaim(taskId: string, agent: string) {
  const claims = loadClaims();
  const owner = claims[taskId];
  if (owner && owner !== agent) return { ok: false, owner };
  claims[taskId] = agent;
  writeJson("claims.json", claims);
  return { ok: true, owner: agent };
}
