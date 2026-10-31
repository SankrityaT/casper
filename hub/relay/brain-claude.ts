//created by kinjal
// jack's brain: Claude via the Anthropic SDK with structured outputs.
// Uses ANTHROPIC_API_KEYS (comma-separated, one picked at random per call) or ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Action, NOOP, type Think } from "./brain";

const KEYS = (process.env.ANTHROPIC_API_KEYS ?? process.env.ANTHROPIC_API_KEY ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const MODEL = process.env.JACK_MODEL ?? "claude-opus-5-5";

const clients = KEYS.map((apiKey) => new Anthropic({ apiKey }));
const pick = () => clients[Math.floor(Math.random() * clients.length)];

export const thinkClaude: Think = async (system, prompt) => {
  if (!clients.length) throw new Error("no ANTHROPIC_API_KEYS / ANTHROPIC_API_KEY");
  const response = await pick().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(Action) },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") return NOOP;
  return response.parsed_output ?? NOOP;
};
