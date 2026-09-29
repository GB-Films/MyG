"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { FIREBASE_ADMIN_EMAIL, firebaseAuth, firebaseFunctions, firestore } from "../firebase";
import { DeleteRecordButton } from "./delete-record-button";
import { SeatingPlanner } from "./seating-planner";

type RsvpRow = {
  id: string;
  full_name: string;
  email: string;
  attendance: string;
  guest_count: number;
  guest_names: string;
  dietary: string;
  guest_dietary?: string;
  transport: string;
  song: string;
  favorite_movie?: string;
  message: string;
  created_at: string;
};

type GiftRow = {
  id: string;
  gift_name: string;
  amount: number;
  giver_name: string;
  email: string;
  dedication: string;
  created_at: string;
};

type Direction = "asc" | "desc";
type RsvpSortKey = "full_name" | "attendance" | "guest_count" | "guest_names" | "dietary" | "guest_dietary" | "transport" | "song" | "favorite_movie" | "email" | "created_at";
type GiftSortKey = "gift_name" | "giver_name" | "amount" | "dedication" | "email" | "created_at";

const RSVP_COLUMNS: Array<{ key: RsvpSortKey; label: string }> = [
  { key: "full_name", label: "Nombre" },
  { key: "attendance", label: "Respuesta" },
  { key: "guest_count", label: "Cantidad" },
  { key: "guest_names", label: "Acompañantes" },
  { key: "dietary", label: "Comida titular" },
  { key: "guest_dietary", label: "Comida acompañantes" },
  { key: "transport", label: "Transporte" },
  { key: "song", label: "Canción" },
  { key: "favorite_movie", label: "Película favorita" },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Fecha" },
];

const GIFT_COLUMNS: Array<{ key: GiftSortKey; label: string }> = [
  { key: "gift_name", label: "Regalo" },
  { key: "giver_name", label: "De" },
  { key: "amount", label: "Importe" },
  { key: "dedication", label: "Dedicatoria" },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Fecha" },
];

const cellStyle: CSSProperties = { padding: 12, borderBottom: "1px solid #383838", color: "#f5f2eb", verticalAlign: "top" };
const filterControlStyle: CSSProperties = { background: "#10100f", border: "1px solid #555", color: "#f5f2eb", minHeight: 42, padding: "8px 11px", fontSize: 14 };

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""), "es", { numeric: true, sensitivity: "base" });
}

function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: Direction; onClick: () => void }) {
  return (
    <th style={{ textAlign: "left", padding: 0, borderBottom: "1px solid #555", color: "#f5f2eb" }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ordenar por ${label}`}
        style={{ alignItems: "center", background: "transparent", border: 0, color: "inherit", cursor: "pointer", display: "flex", fontWeight: 800, gap: 7, minHeight: 72, padding: 12, textAlign: "left", width: "100%" }}
      >
        <span>{label}</span>
        <span aria-hidden="true" style={{ color: active ? "#f40009" : "#777", fontSize: 12 }}>{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
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
  const [rsvpSearch, setRsvpSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [transportFilter, setTransportFilter] = useState("all");
  const [rsvpSort, setRsvpSort] = useState<{ key: RsvpSortKey; direction: Direction }>({ key: "created_at", direction: "desc" });
  const [giftSearch, setGiftSearch] = useState("");
  const [giftSort, setGiftSort] = useState<{ key: GiftSortKey; direction: Direction }>({ key: "created_at", direction: "desc" });

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeRsvps = onSnapshot(query(collection(firestore, "rsvps")), (snapshot) => {
      setRsvps(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RsvpRow)));
    });
    const unsubscribeGifts = onSnapshot(query(collection(firestore, "gift_confirmations")), (snapshot) => {
      setGiftRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GiftRow)));
    });
    return () => { unsubscribeRsvps(); unsubscribeGifts(); };
  }, [user]);

  const attending = useMemo(() => rsvps.filter((row) => row.attendance === "yes").reduce((sum, row) => sum + Number(row.guest_count || 0), 0), [rsvps]);
  const totalGifts = useMemo(() => giftRows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [giftRows]);

  const filteredRsvps = useMemo(() => {
    const search = normalized(rsvpSearch);
    return [...rsvps]
      .filter((row) => attendanceFilter === "all" || row.attendance === attendanceFilter)
      .filter((row) => transportFilter === "all" || row.transport === transportFilter)
      .filter((row) => !search || normalized([
        row.full_name, row.email, row.guest_names, row.dietary, row.guest_dietary,
        row.song, row.favorite_movie, row.message,
      ].join(" ")).includes(search))
      .sort((a, b) => compareValues(a[rsvpSort.key], b[rsvpSort.key]) * (rsvpSort.direction === "asc" ? 1 : -1));
  }, [rsvps, rsvpSearch, attendanceFilter, transportFilter, rsvpSort]);

  const filteredGifts = useMemo(() => {
    const search = normalized(giftSearch);
    return [...giftRows]
      .filter((row) => !search || normalized([row.gift_name, row.giver_name, row.email, row.dedication, row.amount].join(" ")).includes(search))
      .sort((a, b) => compareValues(a[giftSort.key], b[giftSort.key]) * (giftSort.direction === "asc" ? 1 : -1));
  }, [giftRows, giftSearch, giftSort]);

  function toggleRsvpSort(key: RsvpSortKey) {
    setRsvpSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  function toggleGiftSort(key: GiftSortKey) {
    setGiftSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

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
    const header = ["Nombre", "Respuesta", "Cantidad", "Acompañantes", "Comida titular", "Comida acompañantes", "Transporte", "Canción", "Película favorita", "Email", "Fecha"];
    const rows = filteredRsvps.map((row) => [row.full_name, row.attendance === "yes" ? "Viene" : "No viene", row.guest_count, row.guest_names, row.dietary, row.guest_dietary ?? "", row.transport === "yes" ? "Sí" : "No", row.song, row.favorite_movie ?? "", row.email, row.created_at]);
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
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <a href="#mesas" style={{ color: "inherit", fontWeight: 700 }}>Organizar mesas ↓</a>
          <a href="https://docs.google.com/spreadsheets/d/1QuPLy0BrwkzNHFP-LJ-nlKmJ0eQORUEb5kJ55gel0ps/edit" target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 700 }}>Abrir Google Sheets</a>
          <button type="button" onClick={syncGoogleSheets} disabled={sheetSyncing} style={{ background: "#f40009", border: 0, color: "white", cursor: sheetSyncing ? "wait" : "pointer", fontWeight: 800, padding: "11px 15px", textTransform: "uppercase" }}>{sheetSyncing ? "Sincronizando…" : "Sincronizar Sheets"}</button>
          <button type="button" onClick={downloadCsv} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Descargar vista (CSV)</button>
          <button type="button" onClick={() => signOut(firebaseAuth)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", textDecoration: "underline" }}>Cerrar sesión</button>
        </div>
      </header>
      {sheetSyncMessage && <p role="status" style={{ color: sheetSyncMessage.startsWith("Sincronizado") ? "#76d69b" : "#ff6b72", fontWeight: 700 }}>{sheetSyncMessage}</p>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "42px 0" }}>
        {[["Personas confirmadas", attending], ["Regalos avisados", giftRows.length], ["Monto total", `$${totalGifts.toLocaleString("es-AR")}`]].map(([label, value]) => <article key={String(label)} style={{ background: "#191918", padding: 24, border: "1px solid #4a4a48", borderTop: "4px solid #f40009" }}><small style={{ color: "#c9c7c1" }}>{label}</small><strong style={{ display: "block", fontFamily: "Georgia,serif", fontSize: 48, marginTop: 10 }}>{value}</strong></article>)}
      </section>

      <h2>Asistencia</h2>
      <section aria-label="Filtros de asistencia" style={{ alignItems: "center", background: "#191918", border: "1px solid #383838", borderBottom: 0, display: "flex", flexWrap: "wrap", gap: 10, padding: 14 }}>
        <input aria-label="Buscar en asistencia" value={rsvpSearch} onChange={(event) => setRsvpSearch(event.target.value)} placeholder="Buscar nombre, email, acompañante…" style={{ ...filterControlStyle, flex: "1 1 280px" }} />
        <select aria-label="Filtrar por respuesta" value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value)} style={filterControlStyle}>
          <option value="all">Todas las respuestas</option><option value="yes">Vienen</option><option value="no">No vienen</option>
        </select>
        <select aria-label="Filtrar por transporte" value={transportFilter} onChange={(event) => setTransportFilter(event.target.value)} style={filterControlStyle}>
          <option value="all">Todo transporte</option><option value="yes">Necesitan transporte</option><option value="no">No necesitan</option>
        </select>
        <select aria-label="Ordenar asistencia por" value={rsvpSort.key} onChange={(event) => setRsvpSort({ key: event.target.value as RsvpSortKey, direction: rsvpSort.direction })} style={filterControlStyle}>
          {RSVP_COLUMNS.map((column) => <option key={column.key} value={column.key}>Ordenar: {column.label}</option>)}
        </select>
        <button type="button" onClick={() => setRsvpSort((current) => ({ ...current, direction: current.direction === "asc" ? "desc" : "asc" }))} style={{ ...filterControlStyle, cursor: "pointer", minWidth: 48 }} aria-label="Cambiar dirección del orden">{rsvpSort.direction === "asc" ? "▲" : "▼"}</button>
        <button type="button" onClick={() => { setRsvpSearch(""); setAttendanceFilter("all"); setTransportFilter("all"); setRsvpSort({ key: "created_at", direction: "desc" }); }} style={{ ...filterControlStyle, cursor: "pointer" }}>Limpiar</button>
        <span style={{ color: "#aaa", fontSize: 13, marginLeft: "auto" }}>Mostrando {filteredRsvps.length} de {rsvps.length}</span>
      </section>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1380 }}>
          <thead><tr>{RSVP_COLUMNS.map((column) => <SortableHeader key={column.key} label={column.label} active={rsvpSort.key === column.key} direction={rsvpSort.direction} onClick={() => toggleRsvpSort(column.key)} />)}<th aria-label="Acciones" style={{ borderBottom: "1px solid #555" }} /></tr></thead>
          <tbody>
            {filteredRsvps.map((row) => <tr key={row.id}><td style={cellStyle}>{row.full_name}</td><td style={cellStyle}>{row.attendance === "yes" ? "Viene" : "No viene"}</td><td style={cellStyle}>{row.guest_count}</td><td style={cellStyle}>{row.guest_names}</td><td style={cellStyle}>{row.dietary}</td><td style={cellStyle}>{row.guest_dietary ?? ""}</td><td style={cellStyle}>{row.transport === "yes" ? "Sí" : "No"}</td><td style={cellStyle}>{row.song}</td><td style={cellStyle}>{row.favorite_movie ?? ""}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString("es-AR")}</td><td style={cellStyle}><DeleteRecordButton label={`la confirmación de ${row.full_name}`} onDelete={() => deleteDoc(doc(firestore, "rsvps", row.id))} /></td></tr>)}
            {filteredRsvps.length === 0 && <tr><td colSpan={12} style={{ ...cellStyle, color: "#aaa", padding: 28, textAlign: "center" }}>No hay resultados para esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      <SeatingPlanner rsvps={rsvps} />

      <h2 style={{ marginTop: 48 }}>Regalos declarados</h2>
      <section aria-label="Filtros de regalos" style={{ alignItems: "center", background: "#191918", border: "1px solid #383838", borderBottom: 0, display: "flex", flexWrap: "wrap", gap: 10, padding: 14 }}>
        <input aria-label="Buscar en regalos" value={giftSearch} onChange={(event) => setGiftSearch(event.target.value)} placeholder="Buscar regalo, persona, email…" style={{ ...filterControlStyle, flex: "1 1 280px" }} />
        <select aria-label="Ordenar regalos por" value={giftSort.key} onChange={(event) => setGiftSort({ key: event.target.value as GiftSortKey, direction: giftSort.direction })} style={filterControlStyle}>
          {GIFT_COLUMNS.map((column) => <option key={column.key} value={column.key}>Ordenar: {column.label}</option>)}
        </select>
        <button type="button" onClick={() => setGiftSort((current) => ({ ...current, direction: current.direction === "asc" ? "desc" : "asc" }))} style={{ ...filterControlStyle, cursor: "pointer", minWidth: 48 }} aria-label="Cambiar dirección del orden de regalos">{giftSort.direction === "asc" ? "▲" : "▼"}</button>
        <button type="button" onClick={() => { setGiftSearch(""); setGiftSort({ key: "created_at", direction: "desc" }); }} style={{ ...filterControlStyle, cursor: "pointer" }}>Limpiar</button>
        <span style={{ color: "#aaa", fontSize: 13, marginLeft: "auto" }}>Mostrando {filteredGifts.length} de {giftRows.length}</span>
      </section>
      <div style={{ overflowX: "auto", background: "#191918", border: "1px solid #383838" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead><tr>{GIFT_COLUMNS.map((column) => <SortableHeader key={column.key} label={column.label} active={giftSort.key === column.key} direction={giftSort.direction} onClick={() => toggleGiftSort(column.key)} />)}<th aria-label="Acciones" style={{ borderBottom: "1px solid #555" }} /></tr></thead>
          <tbody>
            {filteredGifts.map((row) => <tr key={row.id}><td style={cellStyle}>{row.gift_name}</td><td style={cellStyle}>{row.giver_name}</td><td style={cellStyle}>${Number(row.amount).toLocaleString("es-AR")}</td><td style={cellStyle}>{row.dedication}</td><td style={cellStyle}>{row.email}</td><td style={cellStyle}>{new Date(row.created_at).toLocaleDateString("es-AR")}</td><td style={cellStyle}><DeleteRecordButton label={`el regalo “${row.gift_name}” de ${row.giver_name}`} onDelete={() => deleteDoc(doc(firestore, "gift_confirmations", row.id))} /></td></tr>)}
            {filteredGifts.length === 0 && <tr><td colSpan={7} style={{ ...cellStyle, color: "#aaa", padding: 28, textAlign: "center" }}>No hay resultados para esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
