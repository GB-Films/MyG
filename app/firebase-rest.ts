const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/casamientomyg-e3340/databases/(default)/documents";
const FIREBASE_API_KEY = "AIzaSyA2-9mZ2ZJ1uNsjBmjZZEmnKYdjhMQf9Qw";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string };

function encodeFields(values: Record<string, string | number>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]): [string, FirestoreValue] => [
      key,
      typeof value === "number"
        ? { integerValue: String(Math.trunc(value)) }
        : { stringValue: value },
    ]),
  );
}

export async function createFirestoreDocument(
  collectionName: "rsvps" | "gift_confirmations",
  id: string,
  values: Record<string, string | number>,
) {
  const url = `${FIRESTORE_BASE}/${collectionName}?documentId=${encodeURIComponent(id)}&key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(values) }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Firestore write failed", response.status, detail);
    throw new Error("No se pudo guardar el registro");
  }
}

export async function upsertFirestoreDocument(
  collectionName: "rsvps" | "gift_confirmations",
  id: string,
  values: Record<string, string | number>,
) {
  const url = `${FIRESTORE_BASE}/${collectionName}/${encodeURIComponent(id)}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(values) }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Firestore upsert failed", response.status, detail);
    throw new Error("No se pudo guardar el registro");
  }
}
