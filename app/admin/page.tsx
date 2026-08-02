import { ensureWeddingSchema, getWeddingEnv } from "../../db";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

type RsvpRow = {
  id: string; full_name: string; email: string; attendance: string; guest_count: number;
  guest_names: string; dietary: string; transport: string; song: string; message: string; created_at: string;
};
type GiftRow = {
  id: string; gift_name: string; amount: number; giver_name: string; email: string; dedication: string; created_at: string;
};

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const allowlist = (getWeddingEnv().ADMIN_EMAILS ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);

  if (!allowlist.includes(user.email.toLowerCase())) {
    return (
      <main style={{ fontFamily: "Arial, sans-serif", padding: "10vh 8vw", maxWidth: 760 }}>
        <p style={{ letterSpacing: ".15em", textTransform: "uppercase", fontSize: 12 }}>Panel privado</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 56, fontWeight: 400 }}>Falta autorizar tu email.</h1>
        <p>Agregá <strong>{user.email}</strong> a la variable ADMIN_EMAILS del sitio para ver las confirmaciones.</p>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/api/admin/asistentes" style={{ background: "#10100f", color: "white", padding: "14px 18px", textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Descargar lista de personas</a>
          <a href={chatGPTSignOutPath("/admin")}>Cerrar sesión</a>
        </div>
      </main>
    );
  }

  const DB = await ensureWeddingSchema();
  const [rsvpResult, giftResult] = await Promise.all([
    DB.prepare("SELECT * FROM rsvps ORDER BY created_at DESC").all<RsvpRow>(),
    DB.prepare("SELECT * FROM gift_confirmations ORDER BY created_at DESC").all<GiftRow>(),
  ]);
  const rsvps = rsvpResult.results;
  const giftRows = giftResult.results;
  const attending = rsvps.filter((row) => row.attendance === "yes").reduce((sum, row) => sum + row.guest_count, 0);

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "48px 4vw", background: "#f2efe7", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
        <div><p style={{ letterSpacing: ".15em", textTransform: "uppercase", fontSize: 11 }}>María & Guido</p><h1 style={{ fontFamily: "Georgia, serif", fontSize: 58, fontWeight: 400, margin: 0 }}>Panel del casamiento</h1></div>
        <a href={chatGPTSignOutPath("/admin")}>Cerrar sesión</a>
      </header>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "42px 0" }}>
        {[['Confirmaciones', rsvps.length], ['Invitados que vienen', attending], ['Regalos avisados', giftRows.length]].map(([label, value]) => <article key={String(label)} style={{ background: "white", padding: 24, border: "1px solid #d2cec4" }}><small>{label}</small><strong style={{ display: "block", fontFamily: "Georgia,serif", fontSize: 48, marginTop: 10 }}>{value}</strong></article>)}
      </section>
      <h2>Asistencia</h2>
      <div style={{ overflowX: "auto", background: "white" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}><thead><tr>{['Nombre','Respuesta','Cantidad','Acompañantes','Comida','Transporte','Email','Fecha'].map((h)=><th key={h} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead><tbody>{rsvps.map(row=><tr key={row.id}><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.full_name}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.attendance === 'yes' ? 'Viene' : 'No viene'}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.guest_count}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.guest_names}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.dietary}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.transport === 'yes' ? 'Sí' : 'No'}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.email}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{new Date(row.created_at).toLocaleDateString('es-AR')}</td></tr>)}</tbody></table></div>
      <h2 style={{ marginTop: 48 }}>Regalos declarados</h2>
      <div style={{ overflowX: "auto", background: "white" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{['Regalo','De','Importe','Dedicatoria','Email','Fecha'].map((h)=><th key={h} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead><tbody>{giftRows.map(row=><tr key={row.id}><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.gift_name}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.giver_name}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>${row.amount.toLocaleString('es-AR')}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.dedication}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{row.email}</td><td style={{padding:12,borderBottom:"1px solid #eee"}}>{new Date(row.created_at).toLocaleDateString('es-AR')}</td></tr>)}</tbody></table></div>
    </main>
  );
}
