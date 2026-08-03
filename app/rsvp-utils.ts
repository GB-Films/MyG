export function normalizeRsvpEmail(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().slice(0, 180);
}

export async function rsvpDocumentId(email: string) {
  const normalizedEmail = normalizeRsvpEmail(email);
  const bytes = new TextEncoder().encode(normalizedEmail);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `rsvp_${hash}`;
}
