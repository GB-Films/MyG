"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type PointerEvent } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firestore } from "../firebase";
import { RoomOutlineEditor, type RoomOutline } from "./room-outline-editor";
import "./seating-planner.css";
import { publicSeatingPlan } from "./public-seating";
import { itemGeometry, seatPosition, tableNumber, tableTitle, tablesInBox, moveTableGroup, type SelectionBox, type ItemKind, type RoomItem } from "./seating-geometry";
import { ItemTransformControls } from "./item-transform-controls";
import { PlanConflictError, PlanSession } from "./plan-session";
import { downloadSeatingPng } from "./export-seating-png";
import { Download, Link as LinkIcon, Undo2, Redo2, Scan, Trash2, ArrowLeft } from "lucide-react";
import { applyRoomOutline, DEFAULT_OUTLINE, snapDoor, withRoomDefaults } from "./room-geometry";
import { DimensionInput } from "./dimension-input";
import { DeleteRoomItemDialog } from "./delete-room-item-dialog";

type RsvpSource = {
  id: string;
  full_name: string;
  attendance: string;
  guest_count: number;
  guest_names: string;
  dietary: string;
  guest_dietary?: string;
};

type Guest = { id: string; name: string; dietary: string; group: string; manual?: boolean; source_row?: number };
export type Plan = {
  version: number;
  items: RoomItem[];
  assignments: Record<string, string>;
  manual_guests: Guest[];
  couple_at_main: boolean;
  couple_in_roster?: boolean;
  guest_source?: "rsvps" | "official";
  official_guests?: Guest[];
  canvas?: { width: number; height: number };
  room_outline?: RoomOutline;
  source?: { url: string; title: string; sheet: string; range: string; imported_at: string; guest_count: number; table_count: number; sha256: string };
  updated_at?: string;
};

const DEFAULT_PLAN: Plan = {
  version: 0,
  items: [
    { id: "table-1", kind: "table", name: "Mesa 1", capacity: 8, x: 28, y: 37 },
    { id: "table-2", kind: "table", name: "Mesa 2", capacity: 8, x: 55, y: 37 },
    { id: "main", kind: "main", name: "Mesa principal", capacity: 8, x: 43, y: 78 },
    { id: "dance", kind: "dance", name: "Pista de baile", capacity: 0, x: 68, y: 72 },
    { id: "dj", kind: "dj", name: "DJ", capacity: 0, x: 87, y: 78 },
    { id: "couple", kind: "couple", name: "Novios", capacity: 0, x: 14, y: 78 },
  ],
  assignments: {},
  manual_guests: [],
  couple_at_main: true,
};

const planRef = doc(firestore, "seating_plans", "main");
const publicPlanRef = doc(firestore, "public_seating", "main");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

async function persistPlan(plan: Plan, expectedVersion: number) {
  return runTransaction(firestore, async transaction => {
    const current = await transaction.get(planRef);
    const version = Number(current.data()?.version || 0);
    if (version !== expectedVersion) throw new PlanConflictError();
    const next = { ...plan, version: version + 1, updated_at: new Date().toISOString() };
    transaction.set(planRef, next);
    transaction.set(publicPlanRef, publicSeatingPlan(next));
    return version + 1;
  });
}

async function persistSharedPlan(plan: Plan, version: number, base: Plan) {
  const changes = plan.items.flatMap(item => {
    const previous = base.items.find(other => other.id === item.id);
    if (!previous || !["table", "main"].includes(item.kind)) return [];
    const patch: Record<string, number> = {};
    for (const key of ["x", "y", "number"] as const) if (item[key] !== previous[key] && item[key] !== undefined) patch[key] = item[key]!;
    return Object.keys(patch).length ? [{ id: item.id, patch }] : [];
  });
  if (!changes.length) return version;
  try {
    const update = httpsCallable<{ version: number; changes: typeof changes }, { version: number }>(getFunctions(firestore.app, "us-central1"), "updateSharedSeating");
    return (await update({ version, changes })).data.version;
  } catch (error) {
    if ((error as { code?: string }).code === "functions/aborted") throw new PlanConflictError();
    throw error;
  }
}

function guestsFromRsvps(rsvps: RsvpSource[]): Guest[] {
  return rsvps.flatMap((rsvp) => {
    if (rsvp.attendance !== "yes") return [];
    const names = String(rsvp.guest_names || "").split(/\s*[·;\n]\s*/).filter(Boolean);
    const diets = Object.fromEntries(String(rsvp.guest_dietary || "").split(/\s*[·;\n]\s*/).filter(Boolean).map((entry) => {
      const separator = entry.indexOf(":");
      return separator < 0 ? [entry.trim(), ""] : [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
    }));
    const guests: Guest[] = [{ id: `${rsvp.id}:0`, name: rsvp.full_name, dietary: rsvp.dietary || "", group: rsvp.full_name }];
    for (let index = 1; index < Number(rsvp.guest_count || 1); index++) {
      const name = names[index - 1] || `Acompañante ${index + 1} de ${rsvp.full_name}`;
      guests.push({ id: `${rsvp.id}:${index}`, name, dietary: diets[name] || "", group: rsvp.full_name });
    }
    return guests;
  });
}

function labelFor(kind: ItemKind) {
  if (kind === "main") return "Principal";
  if (kind === "dance") return "Pista";
  if (kind === "dj") return "Cabina";
  if (kind === "couple") return "Novios";
  if (kind === "door") return "Puerta";
  return "Mesa";
}

function tableDisplayName(item: RoomItem) {
  return String(tableNumber(item) || (item.kind === "main" ? "Principal" : "—"));
}

export function SeatingPlanner({ rsvps, readOnly = false, sharedEdit = false }: { rsvps: RsvpSource[]; readOnly?: boolean; sharedEdit?: boolean }) {
  const fullEdit = !readOnly && !sharedEdit;
  const [session] = useState(() => new PlanSession(withRoomDefaults(DEFAULT_PLAN), sharedEdit ? persistSharedPlan : persistPlan));
  const { plan, dirty, saving, error: saveError, canUndo, canRedo } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const setSelectedItemId = useCallback((id: string) => setSelectedItemIds(id ? [id] : []), []);
  const [marquee, setMarquee] = useState<SelectionBox | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RoomItem | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [drawingOutline, setDrawingOutline] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fitMode = useRef(true);
  const pan = useRef<{ x: number; y: number; left: number; top: number; deselect: boolean } | null>(null);
  const transforming = useRef(false);
  const drag = useRef<{ items: RoomItem[]; startX: number; startY: number; moved: boolean } | null>(null);
  const marqueeGesture = useRef<{ x: number; y: number; initial: string[]; additive: boolean; moved: boolean } | null>(null);
  const skipItemClick = useRef(false);

  const rsvpGuests = useMemo(() => guestsFromRsvps(rsvps), [rsvps]);
  const officialRoster = plan.guest_source === "official";
  const guests = useMemo(() => officialRoster ? plan.official_guests || [] : [...rsvpGuests, ...plan.manual_guests], [officialRoster, plan.official_guests, rsvpGuests, plan.manual_guests]);
  const guestById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
  const selectedItems = plan.items.filter(item => selectedItemIds.includes(item.id));
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : undefined;
  const sidebarTables = selectedItems.filter(item => ["table", "main"].includes(item.kind));
  const sidebarTable = selectedItem && ["table", "main"].includes(selectedItem.kind) ? selectedItem : null;
  const selectedGeometry = selectedItem ? itemGeometry(selectedItem) : null;
  const assignedCount = guests.filter((guest) => plan.assignments[guest.id] && plan.items.some((item) => item.id === plan.assignments[guest.id])).length;
  const orphanedAssignments = Object.keys(plan.assignments).filter((id) => !guestById.has(id)).length;
  const normalizeSearch = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
  const visibleGuests = sidebarTables.length ? guests.filter(guest => sidebarTables.some(table => plan.assignments[guest.id] === table.id)) : guests.filter((guest) => normalizeSearch(`${guest.name} ${guest.group || ""} ${guest.dietary || ""}`).includes(normalizeSearch(search)));
  const reservedCoupleSeats = (item: RoomItem) => item.kind === "main" && plan.couple_at_main && !plan.couple_in_roster ? 2 : 0;
  const canvasWidth = plan.canvas?.width || 1400;
  const canvasHeight = plan.canvas?.height || 1050;
  const viewFactor = drawingOutline ? 2 : 1;

  const fitCanvas = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;
    fitMode.current = true;
    setZoom(Math.min((container.clientWidth - 32) / (canvasWidth * viewFactor), (container.clientHeight - 32) / (canvasHeight * viewFactor), 1.5));
    setCamera({ x: 0, y: 0 });
  }, [canvasWidth, canvasHeight, viewFactor]);

  const changeZoom = useCallback((next: number, anchor?: { clientX: number; clientY: number }) => {
    const container = canvasRef.current;
    if (!container) return;
    const bounded = clamp(next, .15, 2);
    const rect = container.getBoundingClientRect();
    const anchorX = anchor ? anchor.clientX - rect.left - container.clientWidth / 2 : 0;
    const anchorY = anchor ? anchor.clientY - rect.top - container.clientHeight / 2 : 0;
    fitMode.current = false;
    setZoom(bounded);
    setCamera(current => ({ x: anchorX - (anchorX - current.x) * bounded / zoom, y: anchorY - (anchorY - current.y) * bounded / zoom }));
  }, [zoom]);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (transforming.current || drag.current || pan.current || marqueeGesture.current) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
      changeZoom(zoom * Math.exp(-clamp(delta, -200, 200) * .003), event);
    };
    container.addEventListener("wheel", wheel, { passive: false });
    return () => container.removeEventListener("wheel", wheel);
  }, [loading, zoom, changeZoom]);

  useEffect(() => {
    if (!canvasWidth || !canvasRef.current) return;
    const container = canvasRef.current;
    const fit = () => { if (fitMode.current) { setZoom(Math.min((container.clientWidth - 32) / (canvasWidth * viewFactor), (container.clientHeight - 32) / (canvasHeight * viewFactor), 1.5)); setCamera({ x: 0, y: 0 }); } };
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight, loading, viewFactor]);

  useEffect(() => {
    let initialized = false;
    return onSnapshot(readOnly || sharedEdit ? publicPlanRef : planRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (readOnly || sharedEdit) { setStatus("El plano todavía no está publicado. Volvé a visitar este enlace en unos minutos."); setLoadFailed(true); }
      } else {
        const saved = snapshot.data() as Plan;
        const current = session.getSnapshot();
        if (!initialized || (saved.version > current.plan.version && !current.dirty && !current.saving && !drag.current && !transforming.current && !marqueeGesture.current)) {
          const loaded = withRoomDefaults({ ...DEFAULT_PLAN, ...saved, items: saved.items || DEFAULT_PLAN.items, assignments: saved.assignments || {}, manual_guests: saved.manual_guests || [] });
          session.load(loaded);
        }
        setLoadFailed(false);
      }
      initialized = true;
      setLoading(false);
    }, () => { setStatus("No pudimos cargar el plano. Revisá tu conexión y recargá la página."); setLoadFailed(true); setLoading(false); });
  }, [readOnly, sharedEdit, session]);

  useEffect(() => { session.resume(); return () => session.pause(); }, [session]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (pendingDelete || drawingOutline || event.ctrlKey || event.metaKey || event.altKey || (event.target as Element)?.closest("input:not([type=range]),textarea,select,[contenteditable=true]")) return;
      if (event.key.toLowerCase() === "h" && !drag.current && !marqueeGesture.current) { event.preventDefault(); fitCanvas(); }
      if (event.key === "Escape") { marqueeGesture.current = null; setMarquee(null); setSelectedItemId(""); setSelectedGuestId(null); setSearch(""); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [fitCanvas, pendingDelete, drawingOutline, setSelectedItemId]);

  useEffect(() => {
    if (readOnly) return;
    const keyboard = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || drawingOutline || pendingDelete || (event.target as Element)?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) session.redo(); else session.undo(); }
      else if (event.key.toLowerCase() === "y") { event.preventDefault(); session.redo(); }
    };
    window.addEventListener("keydown", keyboard);
    const online = () => { void session.flush(); };
    window.addEventListener("online", online);
    return () => { window.removeEventListener("keydown", keyboard); window.removeEventListener("online", online); };
  }, [session, readOnly, drawingOutline, pendingDelete]);

  useEffect(() => {
    if (!dirty && !drawingOutline) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty, drawingOutline]);

  function updatePlan(updater: (current: Plan) => Plan, key = "") {
    if (readOnly) return;
    session.change(updater, key);
    setStatus("");
  }

  function assignGuest(guestId: string, tableId: string | null) {
    if (!fullEdit) return;
    const table = plan.items.find((item) => item.id === tableId);
    if (tableId && (!table || !["table", "main"].includes(table.kind))) return;
    if (tableId && plan.assignments[guestId] !== tableId && Object.values(plan.assignments).filter((id) => id === tableId).length + reservedCoupleSeats(table!) >= table!.capacity) {
      setStatus(`${table!.name} ya tiene ${table!.capacity} lugares ocupados.`);
      return;
    }
    updatePlan((current) => {
      const assignments = { ...current.assignments };
      if (tableId) assignments[guestId] = tableId;
      else delete assignments[guestId];
      return { ...current, assignments };
    });
    setSelectedGuestId(null);
  }

  function addItem(kind: ItemKind) {
    if (!fullEdit) return;
    const existing = plan.items.filter((item) => item.kind === kind);
    if (kind !== "table" && kind !== "door" && existing.length) {
      setSelectedItemId(existing[0].id);
      return;
    }
    const usedNumbers = new Set(plan.items.map((item) => item.number || Number(item.name.match(/^Mesa\s+(\d+)/i)?.[1] || 0)));
    let number = 1;
    while (usedNumbers.has(number)) number++;
    const item: RoomItem = { id: crypto.randomUUID(), kind, name: kind === "table" ? `Mesa ${number}` : kind === "door" ? `Puerta ${existing.length + 1}` : labelFor(kind), capacity: kind === "table" || kind === "main" ? 8 : 0, x: 50, y: kind === "door" ? 5 : 35, ...(kind === "table" ? { number } : {}) };
    updatePlan((current) => ({ ...current, items: [...current.items, kind === "door" ? snapDoor(item, current.room_outline || DEFAULT_OUTLINE, canvasWidth, canvasHeight) : item] }));
    setSelectedItemId(item.id);
  }

  function updateItem(id: string, patch: Partial<RoomItem>) {
    if (sharedEdit) {
      const item = plan.items.find(item => item.id === id);
      if (!item || !["table", "main"].includes(item.kind)) return;
      patch = Object.fromEntries(Object.entries(patch).filter(([key]) => ["x", "y", "number"].includes(key)));
      if (!Object.keys(patch).length) return;
    }
    updatePlan((current) => ({ ...current, items: current.items.map((item) => item.id === id ? item.kind === "door" ? snapDoor({ ...item, ...patch }, current.room_outline || DEFAULT_OUTLINE, canvasWidth, canvasHeight) : { ...item, ...patch } : item) }), `${id}:${Object.keys(patch).join(",")}`);
  }

  function removeItem(id: string) {
    if (!fullEdit) return;
    updatePlan((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
      assignments: Object.fromEntries(Object.entries(current.assignments).filter(([, tableId]) => tableId !== id)),
    }));
    setSelectedItemId("");
  }

  function setCoupleAtMain(enabled: boolean) {
    const main = plan.items.find((item) => item.kind === "main");
    if (enabled && main && Object.values(plan.assignments).filter((id) => id === main.id).length + 2 > main.capacity) {
      setStatus("La mesa principal necesita dos lugares libres para los novios. Aumentá su capacidad o reubicá invitados.");
      return;
    }
    updatePlan((current) => ({ ...current, couple_at_main: enabled }));
  }

  function onItemPointerDown(event: PointerEvent<HTMLButtonElement>, item: RoomItem) {
    if (readOnly || event.button !== 0 || (sharedEdit && !["table", "main"].includes(item.kind))) return;
    skipItemClick.current = false;
    if (event.shiftKey && ["table", "main"].includes(item.kind)) return;
    if (selectedGuestId && ["table", "main"].includes(item.kind)) return;
    const moving = selectedItemIds.includes(item.id) && selectedItems.length > 1 ? selectedItems : [item];
    fitMode.current = false;
    if (moving.length === 1) setSelectedItemId(item.id);
    session.beginGesture();
    drag.current = { items: moving.map(item => ({ ...item })), startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onItemPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const screenX = event.clientX - active.startX, screenY = event.clientY - active.startY;
    if (!active.moved && Math.hypot(screenX, screenY) < 3) return;
    active.moved = true;
    const dx = screenX / stage.width * canvasWidth, dy = screenY / stage.height * canvasHeight;
    if (active.items.length === 1 && active.items[0].kind === "door") {
      const item = active.items[0];
      updateItem(item.id, { x: clamp(item.x + dx / canvasWidth * 100, 0, 100), y: clamp(item.y + dy / canvasHeight * 100, 0, 100) });
      return;
    }
    const positions = new Map(moveTableGroup(active.items, dx, dy, canvasWidth, canvasHeight).map(item => [item.id, item]));
    updatePlan(current => ({ ...current, items: current.items.map(item => { const moved = positions.get(item.id); return moved ? { ...item, x: moved.x, y: moved.y } : item; }) }), "move-tables");
  }

  function onItemPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    if (event.type === "pointerup") onItemPointerMove(event);
    skipItemClick.current = drag.current.moved;
    drag.current = null;
    session.endGesture();
  }

  function clickItem(item: RoomItem, additive: boolean) {
    if (skipItemClick.current) { skipItemClick.current = false; return; }
    if (additive && !readOnly && ["table", "main"].includes(item.kind)) {
      setSelectedGuestId(null);
      setSelectedItemIds(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids.filter(id => plan.items.some(item => item.id === id && ["table", "main"].includes(item.kind))), item.id]);
      return;
    }
    setSelectedItemId(item.id);
    if (fullEdit && selectedGuestId && ["table", "main"].includes(item.kind)) assignGuest(selectedGuestId, item.id);
  }

  function startMarquee(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    fitMode.current = false;
    event.currentTarget.focus({ preventScroll: true });
    setSelectedGuestId(null);
    marqueeGesture.current = { x: event.clientX, y: event.clientY, initial: selectedItems.filter(item => ["table", "main"].includes(item.kind)).map(item => item.id), additive: event.shiftKey, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMarquee(event: PointerEvent<HTMLDivElement>) {
    const active = marqueeGesture.current, stage = stageRef.current?.getBoundingClientRect();
    if (!active || !stage) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 4) return;
    active.moved = true;
    const box = { left: Math.min(active.x, event.clientX), right: Math.max(active.x, event.clientX), top: Math.min(active.y, event.clientY), bottom: Math.max(active.y, event.clientY) };
    const found = tablesInBox(plan.items, { left: (box.left - stage.left) / stage.width * canvasWidth, right: (box.right - stage.left) / stage.width * canvasWidth, top: (box.top - stage.top) / stage.height * canvasHeight, bottom: (box.bottom - stage.top) / stage.height * canvasHeight }, canvasWidth, canvasHeight);
    setSelectedItemIds(active.additive ? [...new Set([...active.initial, ...found])] : found);
    const viewport = event.currentTarget.getBoundingClientRect();
    setMarquee({ left: box.left - viewport.left, right: box.right - viewport.left, top: box.top - viewport.top, bottom: box.bottom - viewport.top });
  }

  function endMarquee(event: PointerEvent<HTMLDivElement>) {
    const active = marqueeGesture.current;
    if (!active || event.target !== event.currentTarget) return;
    if (event.type === "pointerup") {
      moveMarquee(event);
      if (!active.moved && !active.additive) { setSelectedItemId(""); setSearch(""); }
    } else if (event.type === "pointercancel") setSelectedItemIds(active.initial);
    marqueeGesture.current = null;
    setMarquee(null);
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    fitMode.current = false;
    pan.current = { x: event.clientX, y: event.clientY, left: camera.x, top: camera.y, deselect: event.button === 0 };
    event.currentTarget.classList.add("is-panning");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (pan.current && event.type === "pointerup") setCamera({ x: pan.current.left + event.clientX - pan.current.x, y: pan.current.top + event.clientY - pan.current.y });
    if (pan.current?.deselect && event.type === "pointerup" && Math.hypot(event.clientX - pan.current.x, event.clientY - pan.current.y) < 4) { setSelectedItemId(""); setSelectedGuestId(null); setSearch(""); }
    pan.current = null;
    event.currentTarget.classList.remove("is-panning");
  }

  function dropGuest(event: DragEvent<HTMLButtonElement>, item: RoomItem) {
    event.preventDefault();
    const guestId = event.dataTransfer.getData("text/plain");
    if (guestById.has(guestId)) assignGuest(guestId, item.id);
  }


  return (
    <section className={`seating seating-studio${readOnly ? " seating-readonly" : ""}`} id="mesas" aria-label="Organizador de mesas">
      <header className="seating-heading">
        <div><p className="seating-kicker">María & Guido · 21.11.2026</p><h2>{readOnly ? "Encontrá tu lugar." : sharedEdit ? "Organizá las mesas." : "Diseñá el salón."}</h2><p>{readOnly ? "Buscá tu nombre o elegí una mesa para ver quiénes la comparten." : sharedEdit ? "Mové las mesas y cambiá sus números. Los cambios se guardan para todos." : "Mové las mesas, dibujá el salón y distribuí a tus invitados."}</p></div>

      </header>
      {(saveError || status) && <p className="seating-status" role={saveError ? "alert" : "status"}>{saveError || status}</p>}
      {loading && <p role="status">Cargando plano…</p>}
      {!loading && !loadFailed && <>
      <div className="seating-summary"><span><strong>{plan.items.filter(i => i.kind === "table" || i.kind === "main").length}</strong> mesas</span><span><strong>{guests.length}</strong> personas</span><span><strong>{assignedCount}</strong> ubicados</span>{guests.length !== assignedCount && <span>{guests.length - assignedCount} sin mesa</span>}{!readOnly && orphanedAssignments > 0 && <span>{orphanedAssignments} asignaciones para revisar</span>}<a href="#listado-mesas">Ver todas las listas ↓</a></div>
      <fieldset className="seating-layout">
        <aside className="seating-guests" aria-label={sidebarTables.length > 1 ? "Invitados de las mesas seleccionadas" : sidebarTable ? `Invitados de la mesa ${tableDisplayName(sidebarTable)}` : "Todos los invitados"}>
          <div className="seating-sidebar-heading">
            <h3>{sidebarTables.length > 1 ? `${sidebarTables.length} mesas` : sidebarTable ? `Mesa ${tableDisplayName(sidebarTable)}` : "Invitados"}</h3><span>{sidebarTables.length ? visibleGuests.length : guests.length}</span>
          </div>
          {sidebarTables.length ? <div className="seating-sidebar-table-heading">
            {sidebarTables.length > 1 ? <p>Mesas {sidebarTables.map(tableDisplayName).join(", ")}</p> : sidebarTable && tableTitle(sidebarTable) && <p>{tableTitle(sidebarTable)}</p>}
            <button type="button" className="seating-all-guests" onClick={() => { setSelectedItemId(""); setSelectedGuestId(null); setSearch(""); }}><ArrowLeft size={14} />Todos los invitados</button>
          </div> : <input aria-label="Buscar invitados" placeholder="Buscar por nombre…" value={search} onChange={(event) => setSearch(event.target.value)} />}
          <div key={sidebarTables.map(table => table.id).join(",") || "all-guests"} className="seating-guest-list" tabIndex={0} aria-label={sidebarTables.length > 1 ? "Personas de las mesas seleccionadas" : sidebarTable ? "Personas de esta mesa" : "Lista de invitados"}>
            {visibleGuests.map((guest) => {
              const table = plan.items.find((item) => item.id === plan.assignments[guest.id]);
              return <button key={guest.id} type="button" draggable={fullEdit} onDragStart={(event) => event.dataTransfer.setData("text/plain", guest.id)} onClick={() => { setSelectedGuestId(selectedGuestId === guest.id ? null : guest.id); if (table) { setSelectedItemId(table.id); fitCanvas(); } }} className={selectedGuestId === guest.id ? "selected" : ""}>
                <span><strong>{guest.name}</strong>{fullEdit && <small>{guest.group}{guest.dietary ? ` · ${guest.dietary}` : ""}</small>}</span>{!sidebarTable && <em>{table ? tableDisplayName(table) : "—"}</em>}
              </button>;
            })}
            {!visibleGuests.length && <p className="seating-no-results">{sidebarTables.length ? "Todavía no hay invitados asignados." : "No encontramos ese nombre."}</p>}
          </div>
          {fullEdit && selectedGuestId && <div className="seating-guest-actions"><span>Elegí una mesa para ubicar a {guestById.get(selectedGuestId)?.name}.</span><button type="button" onClick={() => assignGuest(selectedGuestId, null)}>Dejar sin mesa</button><button type="button" onClick={() => setSelectedGuestId(null)}>Cancelar selección</button></div>}
          {fullEdit && !officialRoster && <form className="seating-manual" onSubmit={(event) => { event.preventDefault(); const name = manualName.trim(); if (!name) return; updatePlan((current) => ({ ...current, manual_guests: [...current.manual_guests, { id: `manual:${crypto.randomUUID()}`, name, dietary: "", group: "Agregado al plano", manual: true }] })); setManualName(""); }}><label htmlFor="seating-new-guest">Agregar persona pendiente</label><div><input id="seating-new-guest" value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nombre y apellido" maxLength={120} /><button type="submit">Agregar</button></div></form>}
        </aside>
        <div className="seating-workspace">
          {fullEdit && <div className="seating-tools"><span>Agregar</span><button type="button" onClick={() => addItem("table")}>+ Mesa</button><button type="button" onClick={() => addItem("main")}>Principal</button><button type="button" onClick={() => addItem("dance")}>Pista</button><button type="button" onClick={() => addItem("dj")}>DJ</button><button type="button" onClick={() => addItem("door")}>+ Puerta</button></div>}
          <RoomOutlineEditor readOnly={!fullEdit} outline={plan.room_outline || DEFAULT_OUTLINE} disabled={loading || loadFailed} zoom={zoom} onEditingChange={(editing) => { fitMode.current = true; setDrawingOutline(editing); setCamera({ x: 0, y: 0 }); if (editing) setSelectedGuestId(null); }} onApply={(outline) => updatePlan((current) => applyRoomOutline(current, outline || DEFAULT_OUTLINE))}>
          {({ layer, editing }) => <>
            <div className="seating-zoom"><button type="button" className="seating-fit-button" title="Centrar y encuadrar todo el salón · H" onClick={fitCanvas}><Scan size={15} /><span>Centrar plano</span><kbd>H</kbd></button></div>
            <div className="seating-canvas" ref={canvasRef} tabIndex={0} aria-label="Vista del salón, desplazable con la ruedita apretada o las flechas" onKeyDown={event => { if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); fitMode.current = false; setCamera(current => ({ x: current.x + (event.key === "ArrowLeft" ? 40 : event.key === "ArrowRight" ? -40 : 0), y: current.y + (event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0) })); }} onPointerDownCapture={event => { if (event.button === 1 && !transforming.current && !drag.current) { event.stopPropagation(); startPan(event); } }} onPointerDown={event => { if (editing || event.button !== 0 || (event.target as Element).closest("button")) return; if (readOnly) startPan(event); else startMarquee(event); }} onPointerMove={event => { if (marqueeGesture.current) moveMarquee(event); else if (pan.current) setCamera({ x: pan.current.left + event.clientX - pan.current.x, y: pan.current.top + event.clientY - pan.current.y }); }} onPointerUp={event => { endMarquee(event); endPan(event); }} onPointerCancel={event => { endMarquee(event); endPan(event); }} onLostPointerCapture={event => { endMarquee(event); endPan(event); }} onAuxClick={event => { if (event.button === 1) event.preventDefault(); }}>
              {marquee && <div className="seating-marquee" aria-hidden="true" style={{ left: marquee.left, top: marquee.top, width: marquee.right - marquee.left, height: marquee.bottom - marquee.top }} />}
              <div className="seating-canvas-center">
              <div className="seating-scaled-frame" style={{ width: canvasWidth * zoom * viewFactor, height: canvasHeight * zoom * viewFactor, transform: `translate(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px))` }}>
                <div ref={stageRef} className={`seating-stage${editing ? " outline-editing" : ""}`} aria-label={readOnly ? "Plano del salón" : "Plano editable del salón"} style={{ position: "absolute", left: editing ? canvasWidth * zoom / 2 : 0, top: editing ? canvasHeight * zoom / 2 : 0, width: canvasWidth, height: canvasHeight, minHeight: 0, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                  {layer}
                  {plan.items.filter((item) => item.kind !== "couple" || !plan.couple_at_main).map((item) => {
                    const people = guests.filter((guest) => plan.assignments[guest.id] === item.id);
                    const isTable = item.kind === "table" || item.kind === "main";
                    const occupied = people.length + reservedCoupleSeats(item);
                    const geometry = itemGeometry(item);
                    return <button key={item.id} type="button" disabled={editing} className={`seating-item seating-${item.kind}${selectedItemIds.includes(item.id) ? " active" : ""}${fullEdit && selectedGuestId && isTable ? " target" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: geometry.width, height: geometry.height, borderRadius: geometry.shape === "circle" ? "50%" : 8, transform: `translate(-50%, -50%) rotate(${geometry.rotation}deg)` }} onClick={event => clickItem(item, event.shiftKey)} onPointerDown={(event) => onItemPointerDown(event, item)} onPointerMove={onItemPointerMove} onPointerUp={onItemPointerUp} onPointerCancel={onItemPointerUp} onLostPointerCapture={onItemPointerUp} onDragOver={fullEdit && isTable ? (event) => event.preventDefault() : undefined} onDrop={fullEdit && isTable ? (event) => dropGuest(event, item) : undefined} aria-label={`${isTable ? `Mesa ${tableDisplayName(item)}${tableTitle(item) ? ` · ${tableTitle(item)}` : ""}` : item.name}${isTable ? ` · ${occupied}/${item.capacity} lugares` : ""}`} title={isTable ? `Mesa ${tableDisplayName(item)}${tableTitle(item) ? ` · ${tableTitle(item)}` : ""}` : item.name}>
                      {isTable && <span className="seating-seats">{Array.from({ length: item.capacity }, (_, index) => <i key={index} className={index < occupied ? "filled" : ""} style={seatPosition(index, item.capacity, geometry)} />)}</span>}
                      {item.kind === "door" && <svg className="seating-door-symbol" viewBox="0 -100 100 200" aria-hidden="true"><path d="M0 0 H100" stroke="#10100f" strokeWidth="9" /><path d="M0 0 V100 M0 100 A100 100 0 0 0 100 0" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M0 -5 V5 M100 -5 V5" stroke="currentColor" strokeWidth="4" /></svg>}
                      <span className="seating-item-label" style={{ transform: `rotate(${-geometry.rotation}deg)` }}>{item.kind !== "table" && <small>{labelFor(item.kind)}</small>}<strong className={isTable ? "seating-table-number" : ""}>{isTable ? tableDisplayName(item) : item.name}</strong>{isTable && tableTitle(item) && <span className="seating-movie">{tableTitle(item)}</span>}{isTable && <em>{occupied}/{item.capacity}</em>}</span>
                    </button>;
                  })}
                  {fullEdit && !editing && !selectedGuestId && selectedItem && (selectedItem.kind !== "couple" || !plan.couple_at_main) && <ItemTransformControls key={selectedItem.id} item={selectedItem} zoom={zoom} canvasWidth={canvasWidth} canvasHeight={canvasHeight} onChange={updateItem} onGesture={active => { transforming.current = active; if (active) session.beginGesture(); else session.endGesture(); }} />}
                </div>
              </div>
              </div>
            </div>
          </>}
          </RoomOutlineEditor>
      {!readOnly && <div className="seating-editor">
            {selectedItems.length > 1 ? <><div><small>Selección múltiple</small><h3>{selectedItems.length} mesas</h3></div><span className="seating-group-numbers">Mesas {selectedItems.map(tableDisplayName).join(", ")}</span></> : selectedItem && selectedGeometry ? <>
              <div><small>Elemento seleccionado</small><h3>{["table", "main"].includes(selectedItem.kind) ? `Mesa ${tableDisplayName(selectedItem)}` : selectedItem.name}</h3></div>
              {["table", "main"].includes(selectedItem.kind) && <>
                <label>Número de mesa<DimensionInput key={`${selectedItem.id}:number`} label="Número de mesa" min={1} max={999} value={tableNumber(selectedItem)} onCommit={number => updateItem(selectedItem.id, { number: Math.round(number) })} /></label>
                {fullEdit && <><label>Nombre de la mesa<input aria-label="Nombre de la mesa" placeholder="Película o nombre" value={tableTitle(selectedItem)} maxLength={80} onChange={event => updateItem(selectedItem.id, { movie: event.target.value })} /></label>
                <label>Lugares<DimensionInput key={`${selectedItem.id}:capacity`} label="Lugares de la mesa" min={1} max={24} value={selectedItem.capacity} onCommit={(capacity) => {
                  const occupied = Object.values(plan.assignments).filter((id) => id === selectedItem.id).length + reservedCoupleSeats(selectedItem);
                  if (Math.round(capacity) >= occupied) updateItem(selectedItem.id, { capacity: Math.round(capacity) });
                }} /></label></>}
              </>}
              {fullEdit && ["table", "main"].includes(selectedItem.kind) && <label>Forma<select aria-label="Forma de la mesa" value={selectedGeometry.shape} onChange={(event) => { const shape = event.target.value as "circle" | "rectangle"; updateItem(selectedItem.id, { shape, width: shape === "circle" ? 104 : 160, height: 104 }); }}><option value="circle">Circular</option><option value="rectangle">Rectangular</option></select></label>}
              {fullEdit && !["table", "main"].includes(selectedItem.kind) && <label>Nombre<input aria-label="Nombre del elemento" value={selectedItem.name} maxLength={40} onChange={event => updateItem(selectedItem.id, { name: event.target.value })} /></label>}
              {fullEdit && <>
              <label>{selectedGeometry.shape === "circle" ? "Diámetro" : "Ancho"}<DimensionInput key={`${selectedItem.id}:width`} label="Ancho del elemento" min={60} max={500} step={5} value={selectedGeometry.width} onCommit={width => updateItem(selectedItem.id, { width })} /></label>
              {selectedGeometry.shape !== "circle" && selectedItem.kind !== "door" && <label>Alto<DimensionInput key={`${selectedItem.id}:height`} label="Alto del elemento" min={40} max={500} step={5} value={selectedGeometry.height} onCommit={height => updateItem(selectedItem.id, { height })} /></label>}
              {selectedItem.kind !== "door" && <><label>Giro (°)<DimensionInput key={`${selectedItem.id}:rotation`} label="Rotación del elemento" min={0} max={359} step={15} value={selectedGeometry.rotation} onCommit={rotation => updateItem(selectedItem.id, { rotation })} /></label>
              <button className="seating-quarter-turn" type="button" onClick={() => updateItem(selectedItem.id, { rotation: (selectedGeometry.rotation + 90) % 360 })}>Girar 90° ↻</button></>}
              {["table", "main", "door", "dance", "dj"].includes(selectedItem.kind) && <button className="seating-remove seating-trash-button" type="button" aria-label={selectedItem.kind === "table" || selectedItem.kind === "main" ? "Eliminar mesa" : "Eliminar elemento"} title="Eliminar" onClick={() => setPendingDelete(selectedItem)}><Trash2 size={18} /></button>}
              {selectedItem.kind === "main" && !plan.couple_in_roster && <label className="seating-check"><input type="checkbox" checked={plan.couple_at_main} onChange={(event) => setCoupleAtMain(event.target.checked)} />Los novios se sientan en la mesa principal (2 lugares)</label>}
              {selectedItem.kind === "main" && plan.couple_in_roster && <p className="seating-couple-note">Los novios ya están incluidos por nombre en la lista y ocupan sus dos lugares.</p>}
              </>}
            </> : <p>Seleccioná una mesa para {sharedEdit ? "cambiar su número." : "editar sus datos."}</p>}
          </div>}
        <div className="seating-header-actions">
          {!readOnly && <><span className="seating-save-state" aria-live="polite">{loadFailed ? "No se pudo cargar" : saveError ? "Guardado pendiente" : saving ? "Guardando…" : drawingOutline ? "Contorno en edición" : dirty ? "Guardado automático pendiente…" : "Todo guardado"}</span>
          <button className="seating-secondary seating-icon-button" type="button" aria-label="Deshacer" title="Deshacer · Ctrl+Z" disabled={!canUndo || drawingOutline} onClick={session.undo}><Undo2 size={18} /></button>
          <button className="seating-secondary seating-icon-button" type="button" aria-label="Rehacer" title="Rehacer · Ctrl+Shift+Z" disabled={!canRedo || drawingOutline} onClick={session.redo}><Redo2 size={18} /></button></>}
          <button type="button" className="seating-secondary seating-icon-button" aria-label="Copiar enlace" title="Copiar enlace de las mesas" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/mesas/`); setStatus("Enlace copiado para compartir."); } catch { setStatus(`Compartí este enlace: ${window.location.origin}/mesas/`); } }}><LinkIcon size={18} /></button>
          <button type="button" className="seating-secondary seating-icon-button" aria-label="Descargar plano PNG" title="Descargar el plano completo en PNG" disabled={loading || loadFailed || drawingOutline || exporting} onClick={async () => { setExporting(true); try { await downloadSeatingPng(plan); setStatus("Plano descargado en PNG."); } catch { setStatus("No se pudo generar el PNG. Volvé a intentarlo."); } finally { setExporting(false); } }}><Download size={18} /></button>
        </div>
        </div>
      </fieldset>
      <div className="seating-roster-heading" id="listado-mesas"><div><p className="seating-kicker">La compañía perfecta</p><h2>Todas las mesas.</h2></div><p>{guests.length} personas · {plan.items.filter(i => i.kind === "table" || i.kind === "main").length} mesas</p></div>
      <div className="seating-roster" aria-label="Distribución por mesa">
        {plan.items.filter((item) => item.kind === "table" || item.kind === "main").sort((a, b) => (a.number || 0) - (b.number || 0)).map((item) => {
          const people = guests.filter((guest) => plan.assignments[guest.id] === item.id);
          return <article key={item.id} className={selectedItemIds.includes(item.id) ? "selected" : ""}><div className="seating-roster-top"><h3 className="seating-roster-number">{tableDisplayName(item)}</h3><small>{people.length + reservedCoupleSeats(item)} personas</small></div>{tableTitle(item) && <p className="seating-roster-movie">{tableTitle(item)}</p>}{item.kind === "main" && plan.couple_at_main && !plan.couple_in_roster && <p>María y Guido</p>}{people.length ? people.map((guest) => <p key={guest.id} className={selectedGuestId === guest.id ? "highlighted" : ""}>{guest.name}{fullEdit && guest.dietary ? <em> · {guest.dietary}</em> : null}</p>) : <p className="seating-empty">Sin invitados asignados</p>}</article>;
        })}
      </div>
      </>}
      {pendingDelete && fullEdit && <DeleteRoomItemDialog item={pendingDelete} assigned={Object.values(plan.assignments).filter(id => id === pendingDelete.id).length} onCancel={() => setPendingDelete(null)} onConfirm={() => { removeItem(pendingDelete.id); setPendingDelete(null); }} />}
    </section>
  );
}
