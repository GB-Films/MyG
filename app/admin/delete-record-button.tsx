"use client";

export function DeleteRecordButton({ id, kind, label }: { id: string; kind: "rsvp" | "gift"; label: string }) {
  return (
    <form
      action="/api/admin/delete"
      method="post"
      onSubmit={(event) => {
        if (!window.confirm(`¿Seguro que quieren borrar ${label}? Esta acción no se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
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
    </form>
  );
}
