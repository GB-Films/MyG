import type { Plan } from "./seating-planner";
import type { RoomOutline, RoomPoint } from "./room-outline-editor";
import type { RoomItem } from "./seating-geometry";

export const DEFAULT_OUTLINE: RoomOutline = { points: [{ x: 5, y: 5 }, { x: 95, y: 5 }, { x: 95, y: 95 }, { x: 5, y: 95 }] };

/** Distances are measured in canvas pixels, not distorted percentage coordinates. */
export function nearestWall(point: RoomPoint, outline: RoomOutline, width: number, height: number) {
  let best = { index: 0, t: .5, distance: Infinity };
  outline.points.forEach((a, index) => {
    const b = outline.points[(index + 1) % outline.points.length];
    const dx = (b.x - a.x) * width / 100, dy = (b.y - a.y) * height / 100;
    const length2 = dx * dx + dy * dy;
    if (!length2) return;
    const t = Math.max(0, Math.min(1, (((point.x - a.x) * width / 100) * dx + ((point.y - a.y) * height / 100) * dy) / length2));
    const distance = Math.hypot((point.x - a.x) * width / 100 - t * dx, (point.y - a.y) * height / 100 - t * dy);
    if (distance < best.distance) best = { index, t, distance };
  });
  return best;
}

export function snapDoor(item: RoomItem, outline: RoomOutline, width: number, height: number, wall = nearestWall(item, outline, width, height)): RoomItem {
  const a = outline.points[wall.index], b = outline.points[(wall.index + 1) % outline.points.length];
  const dx = (b.x - a.x) * width / 100, dy = (b.y - a.y) * height / 100;
  const length = Math.hypot(dx, dy);
  const doorWidth = Math.min(item.width || 100, Math.max(1, length - 4));
  const margin = Math.min(.5, (doorWidth / 2 + 2) / Math.max(1, length));
  const t = Math.max(margin, Math.min(1 - margin, wall.t));
  const area = outline.points.reduce((sum, p, i) => { const q = outline.points[(i + 1) % outline.points.length]; return sum + p.x * q.y - q.x * p.y; }, 0);
  return { ...item, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, width: doorWidth, height: doorWidth * 2, shape: "rectangle", rotation: (Math.atan2(dy, dx) * 180 / Math.PI + (area < 0 ? 180 : 0) + 360) % 360 };
}

/** Legacy plans get a visible rectangle without writing anything on load. */
export function withRoomDefaults(plan: Plan): Plan {
  const outline = plan.room_outline?.points.length && plan.room_outline.points.length >= 3 ? plan.room_outline : DEFAULT_OUTLINE;
  return { ...plan, room_outline: outline, items: plan.items.map(item => item.kind === "door" ? snapDoor(item, outline, plan.canvas?.width || 1400, plan.canvas?.height || 1050) : item) };
}

/** Grow the canvas around an expanded outline; keep furniture sizes and relative distances intact. */
export function applyRoomOutline(plan: Plan, outline: RoomOutline): Plan {
  const w = plan.canvas?.width || 1400, h = plan.canvas?.height || 1050;
  const left = Math.min(0, ...outline.points.map(p => p.x * w / 100 - 32));
  const top = Math.min(0, ...outline.points.map(p => p.y * h / 100 - 32));
  const right = Math.max(w, ...outline.points.map(p => p.x * w / 100 + 32));
  const bottom = Math.max(h, ...outline.points.map(p => p.y * h / 100 + 32));
  const width = Math.ceil(right - left), height = Math.ceil(bottom - top);
  const rebase = (p: RoomPoint) => ({ x: (p.x * w / 100 - left) / width * 100, y: (p.y * h / 100 - top) / height * 100 });
  const old = plan.room_outline || DEFAULT_OUTLINE;
  const items = plan.items.map(item => {
    if (item.kind !== "door") return { ...item, ...rebase(item) };
    const wall = old.points.length === outline.points.length ? nearestWall(item, old, w, h) : undefined;
    const snapped = snapDoor(item, outline, w, h, wall);
    return { ...snapped, ...rebase(snapped) };
  });
  return { ...plan, canvas: { width, height }, room_outline: { points: outline.points.map(rebase) }, items };
}
