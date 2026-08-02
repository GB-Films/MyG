"use client";

import { useRef, useState } from "react";

export function DeleteRecordButton({ id, kind, label }: { id: string; kind: "rsvp" | "gift"; label: string }) {
  const [open, setOpen] = useState(false);
  const allowSubmit = useRef(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px solid #f40009",
          color: "#f40009",
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: ".09em",
          padding: "8px 10px",
          textTransform: "uppercase",
        }}
      >
        Borrar
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${id}`}
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,.78)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 22,
            position: "fixed",
            zIndex: 1000,
          }}
        >
          <section style={{ background: "#10100f", border: "1px solid #575754", borderTop: "5px solid #f40009", color: "#f5f2eb", maxWidth: 520, padding: "38px 36px", width: "100%" }}>
            <p style={{ color: "#f40009", fontSize: 11, fontWeight: 900, letterSpacing: ".15em", margin: 0, textTransform: "uppercase" }}>Confirmar eliminación</p>
            <h2 id={`delete-title-${id}`} style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 400, lineHeight: 1.08, margin: "18px 0" }}>¿Borramos este registro?</h2>
            <p style={{ color: "#c9c7c1", lineHeight: 1.6, marginBottom: 30 }}>Se va a eliminar {label}. Esta acción no se puede deshacer.</p>
            <form
              action="/api/admin/delete"
              method="post"
              onSubmit={(event) => {
                if (!allowSubmit.current) event.preventDefault();
              }}
              style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
            >
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="kind" value={kind} />
              <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "1px solid #f5f2eb", color: "#f5f2eb", cursor: "pointer", fontWeight: 900, letterSpacing: ".08em", minWidth: 150, padding: "14px 18px", textTransform: "uppercase" }}>No, volver</button>
              <button type="submit" onClick={() => { allowSubmit.current = true; }} style={{ background: "#f40009", border: "1px solid #f40009", color: "white", cursor: "pointer", fontWeight: 900, letterSpacing: ".08em", minWidth: 180, padding: "14px 18px", textTransform: "uppercase" }}>Sí, borrar</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
