"use client";

import { useRef, type PointerEvent } from "react";
import { itemGeometry, resizeFromCorner, type RoomItem } from "./seating-geometry";

const corners: { name: string; direction: [number, number] }[] = [
  { name: "superior izquierda", direction: [-1, -1] }, { name: "superior derecha", direction: [1, -1] },
  { name: "inferior derecha", direction: [1, 1] }, { name: "inferior izquierda", direction: [-1, 1] },
];

export function ItemTransformControls({ item, zoom, canvasWidth, canvasHeight, onChange, onGesture }: {
  item: RoomItem; zoom: number; canvasWidth: number; canvasHeight: number;
  onChange: (id: string, patch: Partial<RoomItem>) => void;
  onGesture: (active: boolean) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ item: RoomItem; startX: number; startY: number; angle: number; corner?: [number, number] } | null>(null);
  const g = itemGeometry(item);
  const controlSize = 24 / zoom;
  const rotationBelow = item.y / 100 * canvasHeight - Math.hypot(g.width, g.height) / 2 < 48 / zoom;

  function point(event: PointerEvent<HTMLButtonElement>) {
    const rect = layer.current!.parentElement!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * canvasWidth, y: (event.clientY - rect.top) / rect.height * canvasHeight };
  }
  function start(event: PointerEvent<HTMLButtonElement>, corner?: [number, number]) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const p = point(event);
    gesture.current = { item: { ...item }, startX: p.x, startY: p.y, angle: Math.atan2(p.y - item.y / 100 * canvasHeight, p.x - item.x / 100 * canvasWidth), corner };
    event.currentTarget.setPointerCapture(event.pointerId);
    onGesture(true);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active) return;
    event.stopPropagation();
    const p = point(event);
    if (active.corner) {
      onChange(active.item.id, resizeFromCorner(active.item, active.corner, p.x - active.startX, p.y - active.startY, canvasWidth, canvasHeight));
    } else {
      const angle = Math.atan2(p.y - active.item.y / 100 * canvasHeight, p.x - active.item.x / 100 * canvasWidth);
      let rotation = (itemGeometry(active.item).rotation + (angle - active.angle) * 180 / Math.PI + 720) % 360;
      rotation = event.shiftKey ? Math.round(rotation / 15) * 15 % 360 : Math.round(rotation);
      onChange(active.item.id, { rotation });
    }
  }
  function finish() { if (gesture.current) { gesture.current = null; onGesture(false); } }

  return <div ref={layer} className="seating-transform" style={{ left: `${item.x}%`, top: `${item.y}%`, width: g.width, height: g.height, transform: `translate(-50%, -50%) rotate(${g.rotation}deg)` }}>
    {corners.map(({ name, direction }) => <button key={name} type="button" className="seating-resize-handle" aria-label={`Cambiar tamaño desde esquina ${name}`} title="Arrastrá para cambiar el tamaño" style={{ left: direction[0] < 0 ? 0 : "100%", top: direction[1] < 0 ? 0 : "100%", width: controlSize, height: controlSize, cursor: direction[0] === direction[1] ? "nwse-resize" : "nesw-resize" }} onPointerDown={event => start(event, direction)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? 10 : 2;
      const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
      const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
      onChange(item.id, resizeFromCorner(item, direction, dx, dy, canvasWidth, canvasHeight));
    }} />)}
    <span className="seating-rotation-stem" style={{ height: 32 / zoom, top: rotationBelow ? g.height : -32 / zoom }} />
    <button type="button" className="seating-rotation-handle" aria-label="Girar elemento arrastrando" title="Arrastrá para girar · Shift: pasos de 15°" style={{ top: rotationBelow ? g.height + 32 / zoom : -32 / zoom, width: controlSize, height: controlSize, fontSize: 17 / zoom }} onPointerDown={event => start(event)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault(); onChange(item.id, { rotation: (g.rotation + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 15 : 1) + 360) % 360 });
    }}>↻</button>
  </div>;
}
