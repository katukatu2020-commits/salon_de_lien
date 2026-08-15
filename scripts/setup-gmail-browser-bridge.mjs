import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const extensionDirectory = path.join(root, "tools", "gmail-browser-bridge");
const configPath = path.join(extensionDirectory, "config.local.js");
const baseUrlArgument = process.argv.find((value) => value.startsWith("--base-url="));
const baseUrl = (
  baseUrlArgument?.slice("--base-url=".length) ||
  process.env.LIEN_APP_BASE_URL ||
  "http://100.82.182.81:3000"
).replace(/\/$/, "");

function parseEnvironment(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values.set(match[1], match[2].trim().replace(/^"|"$/g, ""));
  }
  return values;
}

function setEnvironmentValue(source, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return `${source.trimEnd()}\n${line}\n`;
}

let envSource = "";
try {
  envSource = await readFile(envPath, "utf8");
} catch {
  envSource = "";
}

const environment = parseEnvironment(envSource);
const secret = environment.get("GMAIL_BROWSER_INGEST_SECRET") || randomBytes(32).toString("base64url");
envSource = setEnvironmentValue(envSource, "GMAIL_BROWSER_INGEST_SECRET", secret);
envSource = setEnvironmentValue(envSource, "GMAIL_AUTO_SYNC_ENABLED", "false");
await writeFile(envPath, envSource, "utf8");

await mkdir(extensionDirectory, { recursive: true });
const config = {
  appBaseUrl: baseUrl,
  ingestEndpoint: `${baseUrl}/api/integrations/gmail/browser-ingest`,
  bridgeSecret: secret,
  gmailAccountIndex: "2",
  senderName: "【かんざし結】受付",
  senderEmail: "kanzashi@pacificporter.jp",
  lookbackDays: 60,
  syncIntervalMinutes: 1
};
await writeFile(
  configPath,
  `globalThis.LIEN_GMAIL_BRIDGE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log("Gmailブラウザ連携のローカル設定を作成しました。");
console.log(`拡張機能フォルダー: ${extensionDirectory}`);
console.log(`接続先: ${baseUrl}`);
console.log("秘密鍵は .env.local と config.local.js に保存し、画面やログには表示していません。");
