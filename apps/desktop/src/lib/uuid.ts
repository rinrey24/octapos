/** Generate UUID v4 menggunakan Web Crypto API. */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Generate ID yang pendek untuk device_id (8 karakter hex). */
export function generateDeviceId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
