import { ensureWeddingSchema } from "../../../db";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const giftId = String(body.giftId ?? "").trim().slice(0, 100);
  const giftName = String(body.giftName ?? "").trim().slice(0, 180);
  const giverName = String(body.giverName ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180);
  const dedication = String(body.dedication ?? "").trim().slice(0, 600);
  const amount = Math.max(0, Math.min(100000000, Number(body.amount) || 0));

  if (!giftId || !giftName || !giverName || !email.includes("@") || !dedication || !amount) {
    return Response.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const DB = await ensureWeddingSchema();
  await DB.prepare(`INSERT INTO gift_confirmations
    (id, gift_id, gift_name, amount, giver_name, email, dedication, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'transfer_declared', ?)`)
    .bind(
      crypto.randomUUID(), giftId, giftName, amount, giverName, email, dedication, new Date().toISOString(),
    )
    .run();

  return Response.json({ ok: true }, { status: 201 });
}
