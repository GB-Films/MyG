import type { Plan } from "./seating-planner";

/** Only names and seating are shared. Never copy contact, dietary or source data. */
export function publicSeatingPlan(plan: Plan) {
  const guests = plan.guest_source === "official" ? plan.official_guests || [] : plan.manual_guests;
  const assignments: Record<string, string> = {};
  const official_guests = guests.map((guest, index) => {
    const id = `person-${index + 1}`;
    if (plan.assignments[guest.id]) assignments[id] = plan.assignments[guest.id];
    return { id, name: guest.name };
  });
  return {
    version: plan.version,
    items: plan.items.map(({ id, kind, name, capacity, x, y, movie, number }) => ({ id, kind, name, capacity, x, y, ...(movie ? { movie } : {}), ...(number ? { number } : {}) })),
    assignments, official_guests, guest_source: "official",
    manual_guests: [], couple_at_main: plan.couple_at_main,
    couple_in_roster: !!plan.couple_in_roster,
    ...(plan.canvas ? { canvas: plan.canvas } : {}),
    ...(plan.room_outline ? { room_outline: { points: plan.room_outline.points.map(({ x, y }) => ({ x, y })) } } : {}),
    updated_at: plan.updated_at || new Date().toISOString(),
  };
}
