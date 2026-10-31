//created by kinjal
// Answer the bell from the terminal: bun run approve <askId> [no] [--agent wick] (the Casper UI calls /answer the same way).
const [askId, no] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const agent = process.argv.includes("--agent") ? process.argv[process.argv.indexOf("--agent") + 1] : "wick";
if (!askId) {
  const state = await (await fetch(`http://localhost:${process.env.COMPUTER_PORT ?? 8791}/computer/${agent}/state`)).json();
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}
const res = await fetch(`http://localhost:${process.env.COMPUTER_PORT ?? 8791}/computer/${agent}/answer`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ askId, yes: no !== "no", by: process.env.HUMAN_NAME ?? "Kinjal" }),
});
console.log(res.status, await res.text());
export {};
