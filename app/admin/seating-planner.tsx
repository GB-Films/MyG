"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { firestore } from "../firebase";
import "./seating-planner.css";

type RsvpSource = {
  id: string;
  full_name: string;
  attendance: string;
  guest_count: number;
  guest_names: string;
  dietary: string;
  guest_dietary?: string;
};

type Guest = { id: string; name: string; dietary: string; group: string; manual?: boolean };
type ItemKind = "table" | "main" | "couple" | "dance" | "dj";
type RoomItem = { id: string; kind: ItemKind; name: string; capacity: number; x: number; y: number };
type Plan = {
  version: number;
  items: RoomItem[];
  assignments: Record<string, string>;
  manual_guests: Guest[];
  couple_at_main: boolean;
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
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  if (kind === "dance") return "Pista";
  if (kind === "dj") return "Cabina";
  if (kind === "couple") return "Novios";
  return "Mesa";
}

export function SeatingPlanner({ rsvps }: { rsvps: RsvpSource[] }) {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("table-1");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const drag = useRef<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null);

  const rsvpGuests = useMemo(() => guestsFromRsvps(rsvps), [rsvps]);
  const guests = useMemo(() => [...rsvpGuests, ...plan.manual_guests], [rsvpGuests, plan.manual_guests]);
  const guestById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
  const selectedItem = plan.items.find((item) => item.id === selectedItemId);
  const assignedCount = guests.filter((guest) => plan.assignments[guest.id] && plan.items.some((item) => item.id === plan.assignments[guest.id])).length;
  const orphanedAssignments = Object.keys(plan.assignments).filter((id) => !guestById.has(id)).length;
  const visibleGuests = guests.filter((guest) => `${guest.name} ${guest.group} ${guest.dietary}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const reservedCoupleSeats = (item: RoomItem) => item.kind === "main" && plan.couple_at_main ? 2 : 0;

  useEffect(() => {
    getDoc(planRef).then((snapshot) => {
      if (snapshot.exists()) {
        const saved = snapshot.data() as Plan;
        setPlan({ ...DEFAULT_PLAN, ...saved, items: saved.items || DEFAULT_PLAN.items, assignments: saved.assignments || {}, manual_guests: saved.manual_guests || [] });
      }
      setLoading(false);
    }).catch((error) => {
      console.error("No se pudo leer el plano", error);
      setStatus("No pudimos cargar el plano. Revisá la conexión antes de editar.");
      setLoadFailed(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  function updatePlan(updater: (current: Plan) => Plan) {
    setPlan(updater);
    setDirty(true);
    setStatus("");
  }

  function assignGuest(guestId: string, tableId: string | null) {
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
    const existing = plan.items.filter((item) => item.kind === kind);
    if (kind !== "table" && existing.length) {
      setSelectedItemId(existing[0].id);
      return;
    }
    const number = plan.items.filter((item) => item.kind === "table").length + 1;
    const item: RoomItem = { id: crypto.randomUUID(), kind, name: kind === "table" ? `Mesa ${number}` : labelFor(kind), capacity: kind === "table" ? 8 : 0, x: 30 + (number % 3) * 18, y: 34 + Math.floor(number / 3) * 16 };
    updatePlan((current) => ({ ...current, items: [...current.items, item] }));
    setSelectedItemId(item.id);
  }

  function updateItem(id: string, patch: Partial<RoomItem>) {
    updatePlan((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function removeItem(id: string) {
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
    if (selectedGuestId && ["table", "main"].includes(item.kind)) return;
    const stage = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!stage) return;
    drag.current = { id: item.id, x: item.x, y: item.y, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onItemPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const stage = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!stage) return;
    const x = clamp(drag.current.x + (event.clientX - drag.current.startX) / stage.width * 100, 7, 93);
    const y = clamp(drag.current.y + (event.clientY - drag.current.startY) / stage.height * 100, 8, 92);
    if (Math.abs(x - drag.current.x) + Math.abs(y - drag.current.y) > 0.3) updateItem(drag.current.id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  function onItemPointerUp() { drag.current = null; }

  function dropGuest(event: DragEvent<HTMLButtonElement>, item: RoomItem) {
    event.preventDefault();
    const guestId = event.dataTransfer.getData("text/plain");
    if (guestById.has(guestId)) assignGuest(guestId, item.id);
  }

  async function save() {
    if (loadFailed) return;
    setSaving(true);
    setStatus("");
    try {
      const nextVersion = await runTransaction(firestore, async (transaction) => {
        const current = await transaction.get(planRef);
        const version = Number(current.data()?.version || 0);
        if (version !== plan.version) throw new Error("El plano cambió en otra sesión. Recargá la página antes de guardar para evitar reemplazar esos cambios.");
        transaction.set(planRef, { ...plan, version: version + 1, updated_at: new Date().toISOString() });
        return version + 1;
      });
      setPlan((current) => ({ ...current, version: nextVersion }));
      setDirty(false);
      setStatus("Plano guardado para el panel privado.");
    } catch (error) {
      setStatus(error instanceof Error && error.message.startsWith("El plano cambió") ? error.message : "No se pudo guardar el plano. Revisá la conexión y volvé a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="seating" id="mesas" aria-label="Organizador de mesas">
      <header className="seating-heading">
        <div><p className="seating-kicker">Plano del salón</p><h2>Organizá las mesas.</h2><p>Arrastrá muebles en el plano. Para asignar a alguien, arrastrá su nombre a una mesa o tocá primero su nombre y después la mesa.</p></div>
        <div className="seating-header-actions"><span aria-live="polite">{loadFailed ? "No se pudo cargar" : dirty ? "Cambios sin guardar" : "Todo guardado"}</span><button type="button" onClick={save} disabled={loading || loadFailed || saving || !dirty}>{saving ? "Guardando…" : "Guardar plano"}</button><button type="button" className="seating-secondary" onClick={() => window.print()}>Imprimir plano</button></div>
      </header>
      {status && <p className="seating-status" role="status">{status}</p>}
      <div className="seating-summary"><strong>{guests.length}</strong> invitados que vienen · <strong>{assignedCount}</strong> ubicados · <strong>{guests.length - assignedCount}</strong> sin mesa {orphanedAssignments > 0 && <span>· {orphanedAssignments} asignaciones antiguas para revisar</span>}</div>
      <fieldset className="seating-layout" disabled={loading || loadFailed || saving}>
        <aside className="seating-guests">
          <h3>Invitados</h3>
          <input aria-label="Buscar invitados" placeholder="Buscar persona o grupo…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="seating-guest-list">
            {visibleGuests.map((guest) => {
              const table = plan.items.find((item) => item.id === plan.assignments[guest.id]);
              return <button key={guest.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", guest.id)} onClick={() => setSelectedGuestId(selectedGuestId === guest.id ? null : guest.id)} className={selectedGuestId === guest.id ? "selected" : ""}>
                <span><strong>{guest.name}</strong><small>{guest.group !== guest.name ? guest.group : guest.manual ? "Agregado al plano" : "Titular"}{guest.dietary ? ` · ${guest.dietary}` : ""}</small></span><em>{table?.name || "Sin mesa"}</em>
              </button>;
            })}
          </div>
          {selectedGuestId && <div className="seating-guest-actions"><button type="button" onClick={() => assignGuest(selectedGuestId, null)}>Dejar sin mesa</button>{plan.manual_guests.some((guest) => guest.id === selectedGuestId) && <button type="button" onClick={() => { updatePlan((current) => ({ ...current, manual_guests: current.manual_guests.filter((guest) => guest.id !== selectedGuestId), assignments: Object.fromEntries(Object.entries(current.assignments).filter(([id]) => id !== selectedGuestId)) })); setSelectedGuestId(null); }}>Quitar persona del plano</button>}</div>}
          <form className="seating-manual" onSubmit={(event) => { event.preventDefault(); const name = manualName.trim(); if (!name) return; updatePlan((current) => ({ ...current, manual_guests: [...current.manual_guests, { id: `manual:${crypto.randomUUID()}`, name, dietary: "", group: "Agregado al plano", manual: true }] })); setManualName(""); }}>
            <label htmlFor="seating-new-guest">Agregar persona pendiente</label><div><input id="seating-new-guest" value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nombre y apellido" maxLength={120} /><button type="submit">Agregar</button></div>
          </form>
        </aside>
        <div className="seating-workspace">
          <div className="seating-tools"><button type="button" onClick={() => addItem("table")}>+ Mesa</button><button type="button" onClick={() => addItem("main")}>Mesa principal</button><button type="button" onClick={() => addItem("dance")}>Pista</button><button type="button" onClick={() => addItem("dj")}>DJ</button></div>
          <div className="seating-stage" aria-label="Plano editable del salón">
            <div className="seating-stage-caption">SALÓN · ARRASTRÁ PARA MOVER</div>
            {plan.items.filter((item) => item.kind !== "couple" || !plan.couple_at_main).map((item) => {
              const people = guests.filter((guest) => plan.assignments[guest.id] === item.id);
              const isTable = item.kind === "table" || item.kind === "main";
              const occupied = people.length + reservedCoupleSeats(item);
              return <button key={item.id} type="button" className={`seating-item seating-${item.kind}${selectedItemId === item.id ? " active" : ""}${selectedGuestId && isTable ? " target" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => { setSelectedItemId(item.id); if (selectedGuestId && isTable) assignGuest(selectedGuestId, item.id); }} onPointerDown={(event) => onItemPointerDown(event, item)} onPointerMove={onItemPointerMove} onPointerUp={onItemPointerUp} onPointerCancel={onItemPointerUp} onDragOver={isTable ? (event) => event.preventDefault() : undefined} onDrop={isTable ? (event) => dropGuest(event, item) : undefined} title={`${item.name}${isTable ? ` · ${occupied}/${item.capacity} lugares` : ""}`}>
                {isTable && <span className="seating-seats" aria-hidden="true">{Array.from({ length: item.capacity }, (_, index) => { const angle = 2 * Math.PI * index / item.capacity; return <i key={index} className={index < occupied ? "filled" : ""} style={{ left: `${50 + Math.cos(angle) * 45}%`, top: `${50 + Math.sin(angle) * 45}%` }} />; })}</span>}
                <span className="seating-item-label"><small>{labelFor(item.kind)}</small><strong>{item.name}</strong>{isTable && <em>{occupied}/{item.capacity}{item.kind === "main" && plan.couple_at_main ? " · novios" : ""}</em>}</span>
              </button>;
            })}
          </div>
          <div className="seating-editor">
            {selectedItem ? <>
              <div><small>Elemento seleccionado</small><h3>{selectedItem.name}</h3></div>
              {["table", "main"].includes(selectedItem.kind) && <>
                <label>Nombre o número<input value={selectedItem.name} maxLength={40} onChange={(event) => updateItem(selectedItem.id, { name: event.target.value })} /></label>
                <label>Lugares<input type="number" min={1} max={24} value={selectedItem.capacity} onChange={(event) => {
                  const capacity = clamp(Number(event.target.value) || 1, 1, 24);
                  const occupied = Object.values(plan.assignments).filter((id) => id === selectedItem.id).length + reservedCoupleSeats(selectedItem);
                  if (capacity >= occupied) updateItem(selectedItem.id, { capacity });
                }} /></label>
              </>}
              {selectedItem.kind === "main" && <label className="seating-check"><input type="checkbox" checked={plan.couple_at_main} onChange={(event) => setCoupleAtMain(event.target.checked)} />Los novios se sientan en la mesa principal (2 lugares)</label>}
              {["table", "main"].includes(selectedItem.kind) && <div className="seating-assigned"><strong>Personas en esta mesa</strong>{guests.filter((guest) => plan.assignments[guest.id] === selectedItem.id).map((guest) => <button type="button" key={guest.id} onClick={() => assignGuest(guest.id, null)} title="Quitar de la mesa">{guest.name} ×</button>)}</div>}
              {selectedItem.kind === "table" && <button className="seating-remove" type="button" onClick={() => removeItem(selectedItem.id)}>Quitar mesa y liberar lugares</button>}
            </> : <p>Seleccioná una mesa para cambiarle el nombre, los lugares y sus invitados.</p>}
          </div>
          <div className="seating-roster" aria-label="Distribución por mesa">
            {plan.items.filter((item) => item.kind === "table" || item.kind === "main").map((item) => {
              const people = guests.filter((guest) => plan.assignments[guest.id] === item.id);
              return <article key={item.id}><h3>{item.name}</h3><small>{people.length + reservedCoupleSeats(item)}/{item.capacity} lugares</small>{item.kind === "main" && plan.couple_at_main && <p>María y Guido</p>}{people.length ? people.map((guest) => <p key={guest.id}>{guest.name}{guest.dietary ? <em> · {guest.dietary}</em> : null}</p>) : <p className="seating-empty">Sin invitados asignados</p>}</article>;
            })}
          </div>
        </div>
      </fieldset>
    </section>
  );
}
