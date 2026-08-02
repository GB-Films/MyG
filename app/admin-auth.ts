import { headers } from "next/headers";
import { getWeddingEnv } from "../db";

const COOKIE_NAME = "mg_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

const textEncoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(value: string): Promise<string> {
  const secret = getWeddingEnv().ADMIN_SESSION_SECRET ?? "";
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return toBase64Url(new Uint8Array(signed));
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function readCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const entry of cookieHeader.split(";")) {
    const [name, ...value] = entry.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

async function verifySession(cookieHeader: string | null): Promise<boolean> {
  const token = readCookie(cookieHeader);
  if (!token) return false;
  const [encodedPayload, receivedSignature] = token.split(".");
  if (!encodedPayload || !receivedSignature) return false;
  const expectedSignature = await signature(encodedPayload);
  if (!expectedSignature || !constantTimeEqual(receivedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as { username?: string; expires?: number };
    const expectedUsername = getWeddingEnv().ADMIN_USERNAME ?? "";
    return Boolean(expectedUsername && payload.username === expectedUsername && Number(payload.expires) > Date.now());
  } catch {
    return false;
  }
}

export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  const environment = getWeddingEnv();
  const expectedUsername = environment.ADMIN_USERNAME ?? "";
  const expectedPassword = environment.ADMIN_PASSWORD ?? "";
  return Boolean(
    expectedUsername && expectedPassword &&
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(password, expectedPassword)
  );
}

export async function createAdminSessionCookie(username: string): Promise<string> {
  const payload = toBase64Url(textEncoder.encode(JSON.stringify({
    username,
    expires: Date.now() + SESSION_DURATION_SECONDS * 1000,
  })));
  const signedPayload = `${payload}.${await signature(payload)}`;
  return `${COOKIE_NAME}=${signedPayload}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearAdminSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const requestHeaders = await headers();
  return verifySession(requestHeaders.get("cookie"));
}

export function isAdminRequest(request: Request): Promise<boolean> {
  return verifySession(request.headers.get("cookie"));
}
