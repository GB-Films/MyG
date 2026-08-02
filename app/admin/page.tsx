import { ensureWeddingSchema } from "../../db";
import { isAdminAuthenticated } from "../admin-auth";
import { DeleteRecordButton } from "./delete-record-button";

export const dynamic = "force-dynamic";

type RsvpRow = {
  id: string; full_name: string; email: string; attendance: string; guest_count: number;
  guest_names: string; dietary: string; transport: string; song: string; message: string; created_at: string;
};
type GiftRow = {
  id: string; gift_name: string; amount: number; giver_name: string; email: string; dedication: string; created_at: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const authenticated = await isAdminAuthenticated();
  const params = await searchParams;

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", background: "#10100f", color: "white", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif" }}>
        <section style={{ width: "min(460px, 100%)", border: "1px solid rgba(255,255,255,.35)", padding: "48px 42px" }}>
          <p style={{ letterSpacing: ".16em", textTransform: "uppercase", fontSize: 11 }}>María & Guido · Panel privado</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 400, lineHeight: 1, margin: "20px 0 14px" }}>Todo en un solo lugar.</h1>
          <p style={{ color: "#c9c7c1", lineHeight: 1.6 }}>Ingresen para ver confirmaciones, acompañantes y regalos declarados.</p>
          {params.error === "1" && <p role="alert" style={{ color: "#f40009", fontWeight: 700 }}>El usuario o la clave no son correctos.</p>}
          <form action="/api/admin/login" method="post" style={{ display: "grid", gap: 22, marginTop: 30 }}>
            <label style={{ display: "grid", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>
              Usuario
              <input name="username" autoComplete="username" required style={{ background: "transparent", border: 0, borderBottom: "1px solid #777", color: "white", fontFamily: "Georgia, serif", fontSize: 21, padding: "11px 0", outline: "none" }} />
            </label>
            <label style={{ display: "grid", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>
              Clave
              <input name="password" type="password" autoComplete="current-password" required style={{ background: "transparent", border: 0, borderBottom: "1px solid #777", color: "white", fontFamily: "Georgia, serif", fontSize: 21, padding: "11px 0", outline: "none" }} />
            </label>
            <button type="submit" style={{ background: "#f40009", border: 0, color: "white", cursor: "pointer", fontWeight: 900, letterSpacing: ".1em", marginTop: 8, padding: 16, textTransform: "uppercase" }}>Entrar al panel</button>
          </form>
        </section>
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
  const totalGifts = giftRows.reduce((sum, row) => sum + row.amount, 0);
  const cellStyle = { padding: 12, borderBottom: "1px solid #383838", color: "#f5f2eb" };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "48px 4vw 80px", background: "#10100f", color: "#f5f2eb", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
        <div><p style={{ letterSpacing: ".15em", textTransform: "uppercase", fontSize: 11 }}>María & Guido</p><h1 style={{ fontFamily: "Georgia, serif", fontSize: 58, fontWeight: 400, margin: 0 }}>Panel del casamiento</h1></div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a href="/api/admin/asistentes" style={{ color: "inherit", fontWeight: 700 }}>Descargar asistentes (CSV)</a>
          <form action="/api/admin/logout" method="post"><button type="submit" style={{ background: "transparent", border: 0, cursor: "pointer", textDecoration: "underline" }}>Cerrar sesión</button></form>
        </div>
      </header>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "42px 0" }}>
        {[['Personas confirmadas', attending], ['Regalos avisados', giftRows.length], ['Monto total', `$${totalGifts.toLocaleString('es-AR')}`]].map(([label, value]) => <article key={String(label)} style={{ background: "#191918", padding: 24, border: "1px solid #4a4a48", borderTop: "4px solid #f40009" }}><small style={{ color: "#c9c7c1" }}>{label}</small><strong style={{ display: "block", fontFamily: "Georgia,serif", fontSize: 48, marginTop: 10 }}>{value}</strong></article>)}
      </section>
      <h2>Asistencia</h2>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}><thead><tr>{['Nombre','Respuesta','Cantidad','Acompañantes','Comida','Transporte','Email','Fecha',''].map((h, index)=><th key={`${h}-${index}`} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #555", color: "#f5f2eb" }}>{h}</th>)}</tr></thead><tbody>{rsvps.map(row=><tr key={row.id}><td style={cellStyle}>{row.full_name}</td><td style={cellStyle}>{row.attendance === 'yes' ? 'Viene' : 'No viene'}</td><td style={cellStyle}>{row.guest_count}</td><td style={cellStyle}>{row.guest_names}</td><td style={cellStyle}>{row.dietary}</td><td style={cellStyle}>{row.transport === 'yes' ? 'Sí' : 'No'}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString('es-AR')}</td><td style={cellStyle}><DeleteRecordButton id={row.id} kind="rsvp" label={`la confirmación de ${row.full_name}`} /></td></tr>)}</tbody></table></div>
      <h2 style={{ marginTop: 48 }}>Regalos declarados</h2>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}><thead><tr>{['Regalo','De','Importe','Dedicatoria','Email','Fecha',''].map((h, index)=><th key={`${h}-${index}`} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #555", color: "#f5f2eb" }}>{h}</th>)}</tr></thead><tbody>{giftRows.map(row=><tr key={row.id}><td style={cellStyle}>{row.gift_name}</td><td style={cellStyle}>{row.giver_name}</td><td style={cellStyle}>${row.amount.toLocaleString('es-AR')}</td><td style={cellStyle}>{row.dedication}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString('es-AR')}</td><td style={cellStyle}><DeleteRecordButton id={row.id} kind="gift" label={`el regalo “${row.gift_name}” de ${row.giver_name}`} /></td></tr>)}</tbody></table></div>
    </main>
  );
}
