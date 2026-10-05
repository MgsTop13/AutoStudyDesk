import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.mySpecialWord;
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const ALGO = "aes-256-cbc";

export function criptografar(texto) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);

  let encrypted = cipher.update(texto, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

export function descriptografar(texto) {
  const [ivHex, encrypted] = texto.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}