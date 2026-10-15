export type ItemKind = "table" | "main" | "couple" | "dance" | "dj" | "door";
export type RoomItem = { id: string; kind: ItemKind; name: string; capacity: number; x: number; y: number; movie?: string; number?: number; shape?: "circle" | "rectangle"; width?: number; height?: number; rotation?: number };

export function tableNumber(item: RoomItem) {
  return item.number || Number(item.name.match(/^(?:Mesa\s*)?(\d+)$/i)?.[1]) || 0;
}

export function tableTitle(item: RoomItem) {
  return item.movie ?? (/^(?:Mesa\s*\d+|\d+|Mesa principal)$/i.test(item.name.trim()) ? "" : item.name);
}

export function itemGeometry(item: RoomItem) {
  const defaults = { table: [104, 104], main: [144, 104], couple: [94, 68], dance: [138, 120], dj: [92, 65], door: [100, 70] };
  const shape = item.shape || (item.kind === "table" ? "circle" : "rectangle");
  const width = item.width || defaults[item.kind][0];
  const height = shape === "circle" ? width : item.height || defaults[item.kind][1];
  return { shape, width, height, rotation: item.rotation || 0 };
}

export function seatPosition(index: number, count: number, geometry: ReturnType<typeof itemGeometry>) {
  if (geometry.shape === "circle") {
    const angle = index / count * Math.PI * 2 - Math.PI / 2;
    return { left: `${50 + Math.cos(angle) * 50}%`, top: `${50 + Math.sin(angle) * 50}%` };
  }
  const { width: w, height: h } = geometry;
  const distance = (index + .5) / count * 2 * (w + h);
  const [x, y] = distance < w ? [distance, 0] : distance < w + h ? [w, distance - w] : distance < 2 * w + h ? [2 * w + h - distance, h] : [0, 2 * (w + h) - distance];
  return { left: `${x / w * 100}%`, top: `${y / h * 100}%` };
}

/** Resize in the item's rotated axes, keeping the opposite corner fixed. */
export function resizeFromCorner(item: RoomItem, corner: [number, number], dx: number, dy: number, canvasWidth: number, canvasHeight: number) {
  const g = itemGeometry(item);
  const angle = g.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const localX = c * dx + s * dy, localY = -s * dx + c * dy;
  const [sx, sy] = corner;
  const clampSize = (v: number, min: number) => Math.round(Math.max(min, Math.min(500, v)));
  const width = clampSize(g.width + (g.shape === "circle" ? (sx * localX + sy * localY) / 2 : sx * localX), 60);
  const height = g.shape === "circle" ? width : clampSize(g.height + sy * localY, 40);
  const shiftX = sx * (width - g.width) / 2, shiftY = sy * (height - g.height) / 2;
  return { width, height, x: item.x + (c * shiftX - s * shiftY) / canvasWidth * 100, y: item.y + (s * shiftX + c * shiftY) / canvasHeight * 100 };
}
