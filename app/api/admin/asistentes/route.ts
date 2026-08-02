import { ensureWeddingSchema, getWeddingEnv } from "../../../../db";
import { chatGPTSignInPath, getChatGPTUser } from "../../../chatgpt-auth";

type RsvpRow = {
  full_name: string;
  email: string;
  attendance: string;
  guest_count: number;
  guest_names: string;
  dietary: string;
  transport: string;
  song: string;
  message: string;
  created_at: string;
};

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.redirect(new URL(chatGPTSignInPath("/admin"), request.url), 302);
  }

  const allowlist = (getWeddingEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.includes(user.email.toLowerCase())) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const DB = await ensureWeddingSchema();
  const result = await DB.prepare("SELECT * FROM rsvps ORDER BY created_at DESC").all<RsvpRow>();
  const rows = result.results.flatMap((rsvp) => {
    const people = rsvp.attendance === "yes"
      ? [rsvp.full_name, ...rsvp.guest_names.split(" · ").map((name) => name.trim()).filter(Boolean)]
      : [rsvp.full_name];
    return people.map((person, index) => [
      person,
      index === 0 ? "Titular" : "Acompañante",
      rsvp.attendance === "yes" ? "Viene" : "No viene",
      rsvp.full_name,
      rsvp.email,
      rsvp.dietary,
      rsvp.transport === "yes" ? "Sí" : "No",
      rsvp.song,
      rsvp.message,
      new Date(rsvp.created_at).toLocaleDateString("es-AR"),
    ]);
  });
  const headings = ["Persona", "Tipo", "Respuesta", "Grupo", "Email", "Comida", "Transporte", "Canción", "Mensaje", "Fecha"];
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lista-asistentes-maria-guido.csv"',
    },
  });
}
