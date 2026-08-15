import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const source = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const entries = new Map();
const passwordArgument = process.argv.find((argument) => argument.startsWith("--password="));
const requestedPassword = passwordArgument?.slice("--password=".length);
const rotate = process.argv.includes("--rotate") || Boolean(requestedPassword);

if (requestedPassword && requestedPassword.length < 12) {
  throw new Error("The requested admin password must be at least 12 characters.");
}

for (const line of source.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) entries.set(match[1], match[2]);
}

const existingEmail = entries.get("ADMIN_EMAIL")?.replace(/^['\"]|['\"]$/g, "");
const existingHash = entries.get("ADMIN_PASSWORD_HASH")?.replace(/^['\"]|['\"]$/g, "");
const existingSecret = entries.get("ADMIN_AUTH_SECRET")?.replace(/^['\"]|['\"]$/g, "");

if (existingEmail && existingHash && existingSecret && !rotate) {
  console.log(JSON.stringify({ configured: true, changed: false, email: existingEmail }, null, 2));
  process.exit(0);
}

const email = existingEmail || "owner@salon-de-lien.local";
const password = requestedPassword || randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const secret = randomBytes(48).toString("base64url");
function escapeEnvValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/\$/g, "\\$").replace(/\"/g, '\\"');
}

function upsertEnvValue(content, key, value) {
  const line = `${key}=\"${escapeEnvValue(value)}\"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

let updated = source;
if (!updated.includes("# Salon de Lien admin authentication")) {
  updated = `${updated.trimEnd()}\n\n# Salon de Lien admin authentication\n`;
}
updated = upsertEnvValue(updated, "ADMIN_EMAIL", email);
updated = upsertEnvValue(updated, "ADMIN_PASSWORD_HASH", passwordHash);
updated = upsertEnvValue(updated, "ADMIN_AUTH_SECRET", secret);
updated = upsertEnvValue(updated, "ADMIN_SESSION_HOURS", "12");

writeFileSync(envPath, updated, "utf8");
console.log(JSON.stringify({ configured: true, changed: true, email, password }, null, 2));
