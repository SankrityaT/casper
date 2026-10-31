/* Contact form endpoint. Logs for now; swap the console.log for Supabase or email when the backend lands. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 120);
  const email = String(body?.email ?? "").trim().slice(0, 200);
  const message = String(body?.message ?? "").trim().slice(0, 4000);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5) {
    return Response.json({ ok: false, error: "Add your name, a valid email and a message." }, { status: 400 });
  }
  console.log("[contact]", { name, email, message, at: new Date().toISOString() });
  return Response.json({ ok: true });
}
