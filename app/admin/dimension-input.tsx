"use client";

import { useState } from "react";

/** Keep incomplete typing local. Commit only on Enter or blur, never on each digit. */
export function DimensionInput({ value, min, max, step = 1, label, onCommit }: {
  value: number; min: number; max: number; step?: number; label: string; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft !== null && draft.trim() !== "" && Number.isFinite(Number(draft))) {
      const next = Math.min(max, Math.max(min, Number(draft)));
      if (next !== value) onCommit(next);
    }
    setDraft(null);
  }
  return <input aria-label={label} title={`Entre ${min} y ${max}. Enter o salir del campo para aplicar; Escape para cancelar.`} type="number" min={min} max={max} step={step} value={draft ?? value}
    onFocus={() => setDraft(String(value))} onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.preventDefault(); setDraft(null); }
    }} />;
}
