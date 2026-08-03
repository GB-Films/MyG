"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { FIREBASE_ADMIN_EMAIL, firebaseAuth, firebaseFunctions, firestore } from "../firebase";
import { DeleteRecordButton } from "./delete-record-button";

type RsvpRow = {
  id: string; full_name: string; email: string; attendance: string; guest_count: number;
  guest_names: string; dietary: string; transport: string; song: string; favorite_movie?: string; message: string; created_at: string;
};
type GiftRow = {
  id: string; gift_name: string; amount: number; giver_name: string; email: string; dedication: string; created_at: string;
};

const cellStyle = { padding: 12, borderBottom: "1px solid #383838", color: "#f5f2eb" };

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [giftRows, setGiftRows] = useState<GiftRow[]>([]);
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetSyncMessage, setSheetSyncMessage] = useState("");

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeRsvps = onSnapshot(query(collection(firestore, "rsvps")), (snapshot) => {
      setRsvps(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RsvpRow)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    });
    const unsubscribeGifts = onSnapshot(query(collection(firestore, "gift_confirmations")), (snapshot) => {
      setGiftRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GiftRow)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    });
    return () => { unsubscribeRsvps(); unsubscribeGifts(); };
  }, [user]);

  const attending = useMemo(() => rsvps.filter((row) => row.attendance === "yes").reduce((sum, row) => sum + Number(row.guest_count || 0), 0), [rsvps]);
  const totalGifts = useMemo(() => giftRows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [giftRows]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setLoginError(false);
    const form = new FormData(event.currentTarget);
    try {
      const username = String(form.get("username") ?? "").trim().toLowerCase();
      if (username !== "guidoymaria") throw new Error("Usuario inválido");
      await signInWithEmailAndPassword(firebaseAuth, FIREBASE_ADMIN_EMAIL, String(form.get("password") ?? ""));
    } catch {
      setLoginError(true);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    const header = ["Nombre", "Respuesta", "Cantidad", "Acompañantes", "Comida", "Transporte", "Canción", "Película favorita", "Email", "Fecha"];
    const rows = rsvps.map((row) => [row.full_name, row.attendance === "yes" ? "Viene" : "No viene", row.guest_count, row.guest_names, row.dietary, row.transport === "yes" ? "Sí" : "No", row.song, row.favorite_movie ?? "", row.email, row.created_at]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = "asistentes-maria-guido.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function syncGoogleSheets() {
    setSheetSyncing(true);
    setSheetSyncMessage("");
    try {
      const sync = httpsCallable<undefined, { ok: boolean; confirmations: number; history: number; gifts: number }>(firebaseFunctions, "syncAllWeddingDataToGoogleSheets");
      const result = await sync();
      setSheetSyncMessage(`Sincronizado: ${result.data.confirmations} confirmaciones, ${result.data.history} versiones anteriores y ${result.data.gifts} regalos.`);
    } catch (error) {
      console.error("No se pudo sincronizar Google Sheets", error);
      setSheetSyncMessage("No se pudo sincronizar. Revisá que la planilla esté compartida con la cuenta de servicio.");
    } finally {
      setSheetSyncing(false);
    }
  }

  if (!authReady) return <main style={{ minHeight: "100vh", background: "#10100f" }} />;

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", background: "#10100f", color: "white", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif" }}>
        <section style={{ width: "min(460px, 100%)", border: "1px solid rgba(255,255,255,.35)", padding: "48px 42px" }}>
          <p style={{ letterSpacing: ".16em", textTransform: "uppercase", fontSize: 11 }}>María & Guido · Panel privado</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 400, lineHeight: 1, margin: "20px 0 14px" }}>Todo en un solo lugar.</h1>
          <p style={{ color: "#c9c7c1", lineHeight: 1.6 }}>Ingresen para ver confirmaciones, acompañantes y regalos declarados.</p>
          {loginError && <p role="alert" style={{ color: "#f40009", fontWeight: 700 }}>El usuario o la clave no son correctos.</p>}
          <form onSubmit={login} style={{ display: "grid", gap: 22, marginTop: 30 }}>
            <label style={{ display: "grid", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Usuario<input name="username" autoComplete="username" required style={{ background: "transparent", border: 0, borderBottom: "1px solid #777", color: "white", fontFamily: "Georgia, serif", fontSize: 21, padding: "11px 0", outline: "none" }} /></label>
            <label style={{ display: "grid", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Clave<input name="password" type="password" autoComplete="current-password" required style={{ background: "transparent", border: 0, borderBottom: "1px solid #777", color: "white", fontFamily: "Georgia, serif", fontSize: 21, padding: "11px 0", outline: "none" }} /></label>
            <button type="submit" disabled={loading} style={{ background: "#f40009", border: 0, color: "white", cursor: loading ? "wait" : "pointer", fontWeight: 900, letterSpacing: ".1em", marginTop: 8, padding: 16, textTransform: "uppercase" }}>{loading ? "Ingresando…" : "Entrar al panel"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "48px 4vw 80px", background: "#10100f", color: "#f5f2eb", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
        <div><p style={{ letterSpacing: ".15em", textTransform: "uppercase", fontSize: 11 }}>María & Guido</p><h1 style={{ fontFamily: "Georgia, serif", fontSize: 58, fontWeight: 400, margin: 0 }}>Panel del casamiento</h1></div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a href="https://docs.google.com/spreadsheets/d/1QuPLy0BrwkzNHFP-LJ-nlKmJ0eQORUEb5kJ55gel0ps/edit" target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 700 }}>Abrir Google Sheets</a>
          <button type="button" onClick={syncGoogleSheets} disabled={sheetSyncing} style={{ background: "#f40009", border: 0, color: "white", cursor: sheetSyncing ? "wait" : "pointer", fontWeight: 800, padding: "11px 15px", textTransform: "uppercase" }}>{sheetSyncing ? "Sincronizando…" : "Sincronizar Sheets"}</button>
          <button type="button" onClick={downloadCsv} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Descargar asistentes (CSV)</button>
          <button type="button" onClick={() => signOut(firebaseAuth)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", textDecoration: "underline" }}>Cerrar sesión</button>
        </div>
      </header>
      {sheetSyncMessage && <p role="status" style={{ color: sheetSyncMessage.startsWith("Sincronizado") ? "#76d69b" : "#ff6b72", fontWeight: 700 }}>{sheetSyncMessage}</p>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "42px 0" }}>
        {[["Personas confirmadas", attending], ["Regalos avisados", giftRows.length], ["Monto total", `$${totalGifts.toLocaleString("es-AR")}`]].map(([label, value]) => <article key={String(label)} style={{ background: "#191918", padding: 24, border: "1px solid #4a4a48", borderTop: "4px solid #f40009" }}><small style={{ color: "#c9c7c1" }}>{label}</small><strong style={{ display: "block", fontFamily: "Georgia,serif", fontSize: 48, marginTop: 10 }}>{value}</strong></article>)}
      </section>
      <h2>Asistencia</h2>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1220 }}><thead><tr>{["Nombre", "Respuesta", "Cantidad", "Acompañantes", "Comida", "Transporte", "Canción", "Película favorita", "Email", "Fecha", ""].map((h, index) => <th key={`${h}-${index}`} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #555", color: "#f5f2eb" }}>{h}</th>)}</tr></thead><tbody>{rsvps.map((row) => <tr key={row.id}><td style={cellStyle}>{row.full_name}</td><td style={cellStyle}>{row.attendance === "yes" ? "Viene" : "No viene"}</td><td style={cellStyle}>{row.guest_count}</td><td style={cellStyle}>{row.guest_names}</td><td style={cellStyle}>{row.dietary}</td><td style={cellStyle}>{row.transport === "yes" ? "Sí" : "No"}</td><td style={cellStyle}>{row.song}</td><td style={cellStyle}>{row.favorite_movie ?? ""}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString("es-AR")}</td><td style={cellStyle}><DeleteRecordButton label={`la confirmación de ${row.full_name}`} onDelete={() => deleteDoc(doc(firestore, "rsvps", row.id))} /></td></tr>)}</tbody></table></div>
      <h2 style={{ marginTop: 48 }}>Regalos declarados</h2>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}><thead><tr>{["Regalo", "De", "Importe", "Dedicatoria", "Email", "Fecha", ""].map((h, index) => <th key={`${h}-${index}`} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #555", color: "#f5f2eb" }}>{h}</th>)}</tr></thead><tbody>{giftRows.map((row) => <tr key={row.id}><td style={cellStyle}>{row.gift_name}</td><td style={cellStyle}>{row.giver_name}</td><td style={cellStyle}>${Number(row.amount).toLocaleString("es-AR")}</td><td style={cellStyle}>{row.dedication}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString("es-AR")}</td><td style={cellStyle}><DeleteRecordButton label={`el regalo “${row.gift_name}” de ${row.giver_name}`} onDelete={() => deleteDoc(doc(firestore, "gift_confirmations", row.id))} /></td></tr>)}</tbody></table></div>
    </main>
  );
}
