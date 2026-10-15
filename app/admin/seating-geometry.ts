export type ItemKind = "table" | "main" | "couple" | "dance" | "dj" | "door";
export type RoomItem = { id: string; kind: ItemKind; name: string; capacity: number; x: number; y: number; movie?: string; number?: number; shape?: "circle" | "rectangle"; width?: number; height?: number; rotation?: number };

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
