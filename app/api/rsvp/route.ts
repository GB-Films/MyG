import { upsertFirestoreDocument } from "../../firebase-rest";
import { normalizeRsvpEmail, rsvpDocumentId } from "../../rsvp-utils";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim().slice(0, 120);
  const email = normalizeRsvpEmail(String(body.email ?? ""));
  const attendance = body.attendance === "yes" ? "yes" : body.attendance === "no" ? "no" : "";
  const guestCount = Math.max(1, Math.min(10, Number(body.guestCount) || 1));
  const guestNames = (Array.isArray(body.guestNames) ? body.guestNames : [])
    .map((name) => String(name ?? "").trim().slice(0, 120))
    .filter(Boolean);

  if (!fullName || !email.includes("@") || !attendance) {
    return Response.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (attendance === "yes" && guestNames.length !== guestCount - 1) {
    return Response.json({ error: "Faltan nombres de asistentes" }, { status: 400 });
  }

  const id = await rsvpDocumentId(email);
  await upsertFirestoreDocument("rsvps", id, {
    id,
    full_name: fullName,
    email,
    attendance,
    guest_count: guestCount,
    guest_names: guestNames.join(" · ").slice(0, 600),
    dietary: String(body.dietary ?? "").trim().slice(0, 300),
    transport: body.transport === "yes" ? "yes" : "no",
    song: String(body.song ?? "").trim().slice(0, 180),
    message: String(body.message ?? "").trim().slice(0, 500),
    created_at: new Date().toISOString(),
  });

  return Response.json({ ok: true }, { status: 201 });
}
