"use client";

import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import type { RoomItem } from "./seating-geometry";
import { tableNumber, tableTitle } from "./seating-geometry";

export function DeleteRoomItemDialog({ item, assigned, onCancel, onConfirm }: {
  item: RoomItem; assigned: number; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const table = item.kind === "table" || item.kind === "main";
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="seating-delete-dialog" aria-labelledby="seating-delete-title" aria-describedby="seating-delete-description" onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="seating-delete-content">
      <button type="button" className="seating-dialog-close" aria-label="Cerrar confirmación" onClick={onCancel}><X size={20} /></button>
      <span className="seating-delete-symbol"><Trash2 size={27} /></span>
      <p className="seating-kicker">Revisá antes de seguir</p>
      <h2 id="seating-delete-title">¿Seguro que querés eliminar {table ? "esta mesa" : "este elemento"}?</h2>
      <p className="seating-delete-name">{table ? `Mesa ${tableNumber(item) || "principal"}${tableTitle(item) ? ` · ${tableTitle(item)}` : ""}` : item.name}</p>
      <p id="seating-delete-description">{assigned ? `${assigned} ${assigned === 1 ? "persona quedará" : "personas quedarán"} sin mesa y ${assigned === 1 ? "seguirá" : "seguirán"} en la lista de invitados.` : "Podés recuperar este cambio con Deshacer o Ctrl+Z."}</p>
      <div className="seating-delete-actions"><button type="button" onClick={onCancel} autoFocus>Cancelar</button><button type="button" className="seating-delete-confirm" onClick={onConfirm}><Trash2 size={16} />Eliminar {table ? "mesa" : "elemento"}</button></div>
    </div>
  </dialog>;
}
