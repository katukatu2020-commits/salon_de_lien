import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashScryptPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyScryptPassword(password: string, encodedHash: string) {
  const [algorithm, salt, expectedHex, extra] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || extra) return false;

  try {
    const expected = Buffer.from(expectedHex, "hex");
    if (expected.length !== KEY_LENGTH) return false;
    const actual = scryptSync(password, salt, KEY_LENGTH);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
