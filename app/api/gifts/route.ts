import { createFirestoreDocument } from "../../firebase-rest";

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

  const id = crypto.randomUUID();
  await createFirestoreDocument("gift_confirmations", id, {
    id,
    gift_id: giftId,
    gift_name: giftName,
    amount,
    giver_name: giverName,
    email,
    dedication,
    status: "transfer_declared",
    created_at: new Date().toISOString(),
  });

  return Response.json({ ok: true }, { status: 201 });
}
