import crypto from "crypto";

const KEY = (process.env.TOKEN_ENCRYPTION_KEY || "").padEnd(32, "0").slice(0, 32);
const IV_LEN = 16;

export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

export function decrypt(payload: string) {
  const [ivHex, dataHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
