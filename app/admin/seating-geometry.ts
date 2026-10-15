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

export type SelectionBox = { left: number; top: number; right: number; bottom: number };

/** Axis-aligned world bounds, including a rectangular table's rotation. */
export function selectionBounds(item: RoomItem, width: number, height: number): SelectionBox {
  const g = itemGeometry(item), angle = g.rotation * Math.PI / 180;
  const halfW = g.shape === "circle" ? g.width / 2 : (Math.abs(Math.cos(angle)) * g.width + Math.abs(Math.sin(angle)) * g.height) / 2;
  const halfH = g.shape === "circle" ? g.height / 2 : (Math.abs(Math.sin(angle)) * g.width + Math.abs(Math.cos(angle)) * g.height) / 2;
  const x = item.x / 100 * width, y = item.y / 100 * height;
  return { left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH };
}

export function tablesInBox(items: RoomItem[], box: SelectionBox, width: number, height: number) {
  return items.filter(item => {
    if (!["table", "main"].includes(item.kind)) return false;
    const bounds = selectionBounds(item, width, height);
    return bounds.right >= box.left && bounds.left <= box.right && bounds.bottom >= box.top && bounds.top <= box.bottom;
  }).map(item => item.id);
}

/** Clamp the entire group together so no table moves relative to another. */
export function moveTableGroup(items: RoomItem[], dx: number, dy: number, width: number, height: number) {
  if (!items.length) return [];
  const bounds = items.map(item => selectionBounds(item, width, height));
  const minX = -Math.min(...bounds.map(b => b.left)), maxX = width - Math.max(...bounds.map(b => b.right));
  const minY = -Math.min(...bounds.map(b => b.top)), maxY = height - Math.max(...bounds.map(b => b.bottom));
  const x = minX > maxX ? 0 : Math.min(maxX, Math.max(minX, dx));
  const y = minY > maxY ? 0 : Math.min(maxY, Math.max(minY, dy));
  return items.map(item => ({ ...item, x: item.x + x / width * 100, y: item.y + y / height * 100 }));
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
