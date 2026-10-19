"use client";

import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";

export function DeleteGuestsDialog({ guests, onCancel, onConfirm }: {
  guests: { id: string; name: string }[]; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const multiple = guests.length > 1;
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="seating-delete-dialog" aria-labelledby="delete-guests-title" aria-describedby="delete-guests-description" onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="seating-delete-content">
      <button type="button" className="seating-dialog-close" aria-label="Cerrar confirmación" onClick={onCancel}><X size={20} /></button>
      <span className="seating-delete-symbol"><Trash2 size={27} /></span>
      <p className="seating-kicker">Revisá antes de seguir</p>
      <h2 id="delete-guests-title">¿Eliminar {multiple ? `estas ${guests.length} personas` : "a esta persona"} del casamiento?</h2>
      <ul className="seating-delete-guest-names">{guests.map(guest => <li key={guest.id}>{guest.name}</li>)}</ul>
      <p id="delete-guests-description">{multiple ? "Se quitarán" : "Se quitará"} de la lista de invitados, de las mesas y del plano compartido. Sus respuestas y mensajes anteriores se conservan en el admin.</p>
      <p>Podés deshacer este cambio con Ctrl+Z mientras seguís en el editor.</p>
      <div className="seating-delete-actions"><button type="button" onClick={onCancel} autoFocus>Cancelar</button><button type="button" className="seating-delete-confirm" onClick={onConfirm}><Trash2 size={16} />Eliminar {multiple ? "personas" : "persona"}</button></div>
    </div>
  </dialog>;
}
