import { ensureWeddingSchema } from "../../../../db";
import { isAdminRequest } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!await isAdminRequest(request)) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim().slice(0, 120);
  const kind = String(form.get("kind") ?? "");
  if (!id || (kind !== "rsvp" && kind !== "gift")) {
    return Response.json({ error: "Registro inválido" }, { status: 400 });
  }

  const DB = await ensureWeddingSchema();
  const table = kind === "rsvp" ? "rsvps" : "gift_confirmations";
  await DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return new Response(null, { status: 303, headers: { Location: "/admin" } });
}
