import { ensureWeddingSchema } from "../../../db";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180);
  const attendance = body.attendance === "yes" ? "yes" : body.attendance === "no" ? "no" : "";
  const guestCount = Math.max(1, Math.min(10, Number(body.guestCount) || 1));

  if (!fullName || !email.includes("@") || !attendance) {
    return Response.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const DB = await ensureWeddingSchema();
  await DB.prepare(`INSERT INTO rsvps
    (id, full_name, email, attendance, guest_count, guest_names, dietary, transport, song, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      crypto.randomUUID(),
      fullName,
      email,
      attendance,
      guestCount,
      String(body.guestNames ?? "").trim().slice(0, 300),
      String(body.dietary ?? "").trim().slice(0, 300),
      body.transport === "yes" ? "yes" : "no",
      String(body.song ?? "").trim().slice(0, 180),
      String(body.message ?? "").trim().slice(0, 500),
      new Date().toISOString(),
    )
    .run();

  return Response.json({ ok: true }, { status: 201 });
}
