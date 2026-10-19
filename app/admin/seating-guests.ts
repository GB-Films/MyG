import type { Plan } from "./seating-planner";

/** One atomic edit/undo step for an entire guest transfer. */
export function reassignGuests(plan: Plan, guestIds: string[], tableId: string | null): Plan {
  const table = plan.items.find(item => item.id === tableId);
  if (!guestIds.length || (tableId && (!table || !["table", "main"].includes(table.kind)))) return plan;
  const assignments = { ...plan.assignments };
  for (const id of new Set(guestIds)) {
    if (tableId) assignments[id] = tableId;
    else delete assignments[id];
  }
  const reserved = table?.kind === "main" && plan.couple_at_main && !plan.couple_in_roster ? 2 : 0;
  const occupied = table ? Object.values(assignments).filter(id => id === tableId).length + reserved : 0;
  return { ...plan, assignments, items: plan.items.map(item => item.id === tableId && occupied > item.capacity ? { ...item, capacity: occupied } : item) };
}

/** Remove only the active seating roster, never RSVP records or their history. */
export function removeGuests(plan: Plan, guestIds: string[]): Plan {
  const ids = new Set(guestIds);
  if (!ids.size) return plan;
  return {
    ...plan,
    assignments: Object.fromEntries(Object.entries(plan.assignments).filter(([id]) => !ids.has(id))),
    official_guests: (plan.official_guests || []).filter(guest => !ids.has(guest.id)),
    manual_guests: plan.manual_guests.filter(guest => !ids.has(guest.id)),
    // Prevent RSVP-derived guests from returning on reload or a later response.
    excluded_guest_ids: [...new Set([...(plan.excluded_guest_ids || []), ...ids])],
  };
}
