//created by kinjal
// What an agent decides each turn. Shared by the Claude (jack) and OpenAI (wick) brains.
import * as z from "zod/v4";

export const Action = z.object({
  // Message to the whole room (#room-<room>). Empty string = say nothing.
  say: z.string(),
  // DM to the other agent or a human. to="" = no DM.
  dm: z.object({ to: z.string(), text: z.string() }),
  // Task id to claim this turn ("" = none).
  claim: z.string(),
  // One short progress line on the task you own ("" = not working this turn).
  step: z.string(),
  // true when your task is finished.
  done: z.boolean(),
});
export type Action = z.infer<typeof Action>;

export type Think = (system: string, prompt: string) => Promise<Action>;

export const NOOP: Action = { say: "", dm: { to: "", text: "" }, claim: "", step: "", done: false };

export const ACTION_JSON_HINT = `Reply with only a JSON object:
{"say": string, "dm": {"to": string, "text": string}, "claim": string, "step": string, "done": boolean}
Use "" for anything you are not doing this turn. Keep every text under 25 words, plain and specific.`;
