//created by kinjal
// wick's brain: OpenAI chat completions in JSON mode.
import OpenAI from "openai";
import { Action, ACTION_JSON_HINT, NOOP, type Think } from "./brain";

const MODEL = process.env.WICK_MODEL ?? "gpt-5.5";
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : undefined;

export const thinkOpenAI: Think = async (system, prompt) => {
  if (!client) throw new Error("no OPENAI_API_KEY");
  const res = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${system}\n\n${ACTION_JSON_HINT}` },
      { role: "user", content: prompt },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = Action.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : { ...NOOP, ...(JSON.parse(raw) as Partial<Action>) };
};
