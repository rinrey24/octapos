/** Hash string dengan SHA-256 menggunakan Web Crypto API (browser native). */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate salt acak (hex 16 byte). */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash PIN/password: "sha256(salt + value)" disimpan sebagai "salt:hash".
 * Format: "<salt_hex>:<sha256_hex>"
 */
export async function hashSecret(value: string): Promise<string> {
  const salt = generateSalt();
  const hash = await sha256(salt + value);
  return `${salt}:${hash}`;
}

/** Verifikasi value terhadap stored hash (format "salt:hash"). */
export async function verifySecret(value: string, stored: string): Promise<boolean> {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;
  const hash = await sha256(salt + value);
  return hash === expectedHash;
}
