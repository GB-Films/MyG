"use client";

import { useState } from "react";

export function DeleteRecordButton({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ background: "transparent", border: "1px solid #f40009", color: "#f40009", cursor: "pointer", fontSize: 10, fontWeight: 900, letterSpacing: ".09em", padding: "8px 10px", textTransform: "uppercase" }}>Borrar</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" style={{ alignItems: "center", background: "rgba(0,0,0,.78)", display: "flex", inset: 0, justifyContent: "center", padding: 22, position: "fixed", zIndex: 1000 }}>
          <section style={{ background: "#10100f", border: "1px solid #575754", borderTop: "5px solid #f40009", color: "#f5f2eb", maxWidth: 520, padding: "38px 36px", width: "100%" }}>
            <p style={{ color: "#f40009", fontSize: 11, fontWeight: 900, letterSpacing: ".15em", margin: 0, textTransform: "uppercase" }}>Confirmar eliminación</p>
            <h2 id="delete-title" style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 400, lineHeight: 1.08, margin: "18px 0" }}>¿Borramos este registro?</h2>
            <p style={{ color: "#c9c7c1", lineHeight: 1.6, marginBottom: 30 }}>Se va a eliminar {label}. Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button type="button" onClick={() => setOpen(false)} disabled={deleting} style={{ background: "transparent", border: "1px solid #f5f2eb", color: "#f5f2eb", cursor: "pointer", fontWeight: 900, letterSpacing: ".08em", minWidth: 150, padding: "14px 18px", textTransform: "uppercase" }}>No, volver</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} style={{ background: "#f40009", border: "1px solid #f40009", color: "white", cursor: deleting ? "wait" : "pointer", fontWeight: 900, letterSpacing: ".08em", minWidth: 180, padding: "14px 18px", textTransform: "uppercase" }}>{deleting ? "Borrando…" : "Sí, borrar"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
