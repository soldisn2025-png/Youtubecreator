import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY ?? "dev-only-token-encryption-key";
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(cipherText: string): string {
  const payload = Buffer.from(cipherText, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
