"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent, type MouseEvent, type KeyboardEvent } from "react";

export type RoomPoint = { x: number; y: number };
export type RoomOutline = { points: RoomPoint[] };
type Draft = { points: RoomPoint[]; closed: boolean };
type Mode = "rectangle" | "polygon" | "edit";

// The room may extend beyond the old canvas. Applying it expands the canvas.
const limit = (n: number) => Math.round(n * 10) / 10;
const cross = (a: RoomPoint, b: RoomPoint, c: RoomPoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

function validOutline(points: RoomPoint[]) {
  if (points.length < 3) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.2) return false;
    area += a.x * b.y - b.x * a.y;
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j], d = points[(j + 1) % points.length];
      const overlap = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
        && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
      if (overlap && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0) return false;
    }
  }
  return Math.abs(area) > 0.1;
}

export function RoomOutlineEditor({ outline, disabled, readOnly = false, zoom, onApply, onEditingChange, children }: {
  readOnly?: boolean;
  outline?: RoomOutline;
  disabled: boolean;
  zoom: number;
  onApply: (outline: RoomOutline | null) => void;
  onEditingChange: (editing: boolean) => void;
  children: (state: { layer: ReactNode; editing: boolean }) => ReactNode;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [draft, setDraft] = useState<Draft>({ points: [], closed: false });
  const [history, setHistory] = useState<Draft[]>([]);
  const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
  const [error, setError] = useState("");
  const layerRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ kind: "corner"; index: number } | { kind: "rectangle"; start: RoomPoint } | null>(null);
  const editing = mode !== null;
  useEffect(() => {
    if (!editing) return;
    const undo = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || event.shiftKey || pointer.current) return;
      event.preventDefault();
      const previous = history.at(-1);
      if (!previous) return;
      setDraft(previous); setMode(previous.closed ? "edit" : "polygon"); setHistory(h => h.slice(0, -1)); setSelectedCorner(null); setError("");
    };
    window.addEventListener("keydown", undo);
    return () => window.removeEventListener("keydown", undo);
  }, [editing, history]);
  const shown = editing ? draft : { points: outline?.points || [], closed: true };
  const pointString = shown.points.map((p) => `${p.x},${p.y}`).join(" ");

  function remember() {
    setHistory((previous) => [...previous.slice(-29), draft]);
    setError("");
  }

  function start() {
    const points = outline?.points.map((p) => ({ ...p })) || [];
    setDraft({ points, closed: points.length >= 3 });
    setMode(points.length >= 3 ? "edit" : "polygon");
    setHistory([]);
    setSelectedCorner(null);
    setError("");
    onEditingChange(true);
  }

  function finish() {
    if (!draft.closed || !validOutline(draft.points)) {
      setError("Cerrá el contorno y revisá que las paredes no se crucen ni queden esquinas superpuestas.");
      return;
    }
    onApply({ points: draft.points });
    setMode(null);
    onEditingChange(false);
  }

  function changeMode(next: Mode) {
    remember();
    setSelectedCorner(null);
    setMode(next);
    if (next === "polygon") setDraft({ points: [], closed: false });
  }

  function pointAt(event: { clientX: number; clientY: number }) {
    const rect = layerRef.current!.getBoundingClientRect();
    return { x: limit((event.clientX - rect.left) / rect.width * 100), y: limit((event.clientY - rect.top) / rect.height * 100) };
  }

  function onCanvasClick(event: MouseEvent<HTMLDivElement>) {
    if (disabled || mode !== "polygon" || draft.closed) return;
    const point = pointAt(event);
    if (draft.points.length && Math.hypot(point.x - draft.points.at(-1)!.x, point.y - draft.points.at(-1)!.y) < 0.5) return;
    remember();
    setDraft({ points: [...draft.points, point], closed: false });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current || disabled) return;
    const point = pointAt(event);
    if (pointer.current.kind === "rectangle") {
      const start = pointer.current.start;
      setDraft({ points: [start, { x: point.x, y: start.y }, point, { x: start.x, y: point.y }], closed: true });
    } else {
      const index = pointer.current.index;
      setDraft((current) => ({ ...current, points: current.points.map((p, i) => i === index ? point : p) }));
    }
  }

  function closePolygon() {
    if (draft.points.length < 3) return;
    remember();
    setDraft((current) => ({ ...current, closed: true }));
    setMode("edit");
  }

  function addCorner(index: number, point: RoomPoint) {
    remember();
    setDraft((current) => ({ ...current, points: [...current.points.slice(0, index + 1), point, ...current.points.slice(index + 1)] }));
    setSelectedCorner(index + 1);
  }

  function removeCorner(index: number) {
    if (draft.points.length <= 3) return;
    remember();
    setDraft((current) => ({ ...current, points: current.points.filter((_, i) => i !== index) }));
    setSelectedCorner(null);
  }

  function moveWithKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (mode !== "edit") return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeCorner(index);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    remember();
    const step = event.shiftKey ? 2 : 0.5;
    setDraft((current) => ({ ...current, points: current.points.map((p, i) => i !== index ? p : {
      x: limit(p.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0)),
      y: limit(p.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0)),
    }) }));
  }

  const layer = <div ref={layerRef} className={`seating-outline-layer${editing ? " editing" : ""}${mode === "rectangle" ? " rectangle-mode" : ""}`} style={disabled ? { pointerEvents: "none" } : undefined}
    onClick={onCanvasClick}
    onPointerDown={(event) => {
      if (disabled || mode !== "rectangle" || event.button !== 0) return;
      event.preventDefault();
      remember();
      pointer.current = { kind: "rectangle", start: pointAt(event) };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={onPointerMove}
    onPointerUp={(event) => {
      if (!pointer.current) return;
      if (pointer.current.kind === "rectangle") { onPointerMove(event); setMode("edit"); }
      pointer.current = null;
    }}
    onPointerCancel={() => { pointer.current = null; }}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {shown.closed && shown.points.length >= 3 && <path className="seating-outline-outside" fillRule="evenodd" d={`M0,0 H100 V100 H0 Z M${shown.points.map((p) => `${p.x},${p.y}`).join(" L")} Z`} />}
      {shown.closed && shown.points.length >= 3 ? <polygon className="seating-outline-wall" points={pointString} vectorEffect="non-scaling-stroke" /> : <polyline className="seating-outline-wall draft" points={pointString} vectorEffect="non-scaling-stroke" />}
    </svg>
    {mode === "edit" && draft.closed && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="seating-outline-edges">
      {draft.points.map((a, index) => {
        const b = draft.points[(index + 1) % draft.points.length];
        return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={`Agregar esquina en pared ${index + 1}`} onClick={(event) => { event.stopPropagation(); addCorner(index, pointAt(event)); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); addCorner(index, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); } }} />;
      })}
    </svg>}
    {editing && draft.points.map((point, index) => <button type="button" key={index} className={`seating-outline-corner${selectedCorner === index ? " selected" : ""}`} style={{ left: `${point.x}%`, top: `${point.y}%`, width: Math.min(60, 24 / zoom), height: Math.min(60, 24 / zoom) }} aria-label={mode === "polygon" && index === 0 && draft.points.length >= 3 ? "Cerrar contorno en la primera esquina" : `Esquina ${index + 1}`} aria-pressed={selectedCorner === index}
      onClick={(event) => { event.stopPropagation(); if (mode === "polygon" && index === 0) closePolygon(); else setSelectedCorner(index); }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (disabled || mode !== "edit" || event.button !== 0) return;
        event.preventDefault();
        remember();
        setSelectedCorner(index);
        pointer.current = { kind: "corner", index };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => moveWithKeys(event, index)} />)}
  </div>;

  return <>
    {!readOnly && <div className={`seating-outline-tools${editing ? " editing" : ""}`}>
      {!editing ? <button type="button" onClick={start}>{outline ? "Editar contorno del salón" : "Dibujar salón"}</button> : <>
        <div className="seating-outline-actions">
          <button type="button" aria-pressed={mode === "rectangle"} onClick={() => changeMode("rectangle")}>Rectángulo rápido</button>
          <button type="button" aria-pressed={mode === "polygon"} onClick={() => changeMode("polygon")}>Contorno libre</button>
          {!draft.closed && <button type="button" disabled={draft.points.length < 3} onClick={closePolygon}>Cerrar contorno</button>}
          <button type="button" disabled={!history.length} onClick={() => { const previous = history.at(-1)!; setDraft(previous); setMode(previous.closed ? "edit" : "polygon"); setHistory((h) => h.slice(0, -1)); setSelectedCorner(null); setError(""); }}>Deshacer</button>
          <button type="button" disabled={selectedCorner === null || draft.points.length <= 3 || mode !== "edit"} onClick={() => { if (selectedCorner !== null) removeCorner(selectedCorner); }}>Quitar esquina</button>
          <button type="button" className="seating-outline-apply" disabled={!draft.closed} onClick={finish}>Aplicar contorno</button>
          <button type="button" onClick={() => { setMode(null); pointer.current = null; onEditingChange(false); }}>Cancelar</button>
          <button type="button" onClick={() => { remember(); setDraft({ points: [{ x: 5, y: 5 }, { x: 95, y: 5 }, { x: 95, y: 95 }, { x: 5, y: 95 }], closed: true }); setMode("edit"); }}>Restablecer rectángulo</button>
        </div>
        <p>{mode === "rectangle" ? "Arrastrá sobre el plano para dibujar un rectángulo. Después podés agregar y mover esquinas." : mode === "polygon" ? "Tocá cada esquina del salón. Para cerrarlo, tocá el primer punto o «Cerrar contorno». Podés dibujar entrantes, salientes y formas en L." : "Arrastrá las esquinas hacia afuera para ampliar el salón. Tocá una pared para agregar una esquina y crear un entrante o saliente."} Al aplicar el contorno, el plano se amplía y se guarda automáticamente. Ruedita apretada: recorrer el plano.</p>
        {error && <p className="seating-outline-error" role="status">{error}</p>}
      </>}
    </div>}
    {children({ layer, editing })}
  </>;
}
