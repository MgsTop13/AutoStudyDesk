import crypto from "crypto";

const SECRET = process.env.mySpecialWord; // 32 chars
const ALGO = "aes-256-cbc";

export function criptografar(texto) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(SECRET), iv);
  
  let encrypted = cipher.update(texto, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return `${iv.toString("hex")}:${encrypted}`;
}

export function descriptografar(texto) {
  const [ivHex, encrypted] = texto.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(SECRET), iv);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}