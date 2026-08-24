import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3002";
const loginId = process.env.VERIFY_ADMIN_ID;
const password = process.env.VERIFY_ADMIN_PASSWORD;
if (!loginId || !password) throw new Error("VERIFY_ADMIN_ID and VERIFY_ADMIN_PASSWORD are required.");

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
];
const chromePath = chromeCandidates.find((candidate) => requireFile(candidate));
if (!chromePath) throw new Error("Chrome or Edge was not found.");

function requireFile(file) {
  try {
    return Boolean(file) && requireFileSync(file);
  } catch {
    return false;
  }
}

function requireFileSync(file) {
  return existsSync(file);
}

const port = 9333;
const profile = path.join(os.tmpdir(), "salon-campaign-v429-chrome");
await fs.rm(profile, { recursive: true, force: true });
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank"
], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let version;
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
    break;
  } catch {
    await delay(100);
  }
}
if (!version) throw new Error("Chrome DevTools did not start.");

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/admin/login`)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let messageId = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
});
function command(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await command("Page.navigate", { url: `${baseUrl}/admin/login` });
await delay(700);
await command("Runtime.evaluate", {
  expression: `(async()=>{await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:${JSON.stringify(loginId)},password:${JSON.stringify(password)},next:'/admin/customers/messages/campaigns'}),redirect:'follow'});return true})()`,
  awaitPromise: true,
  returnByValue: true
});
const temporaryCampaign = await command("Runtime.evaluate", {
  expression: `(async()=>{const now=new Date(),end=new Date(now.getTime()+86400000);const response=await fetch('/api/lien-campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'画面確認用キャンペーン',summary:'編集・削除ボタンの描画確認',body:'自動ブラウザ確認後に削除されるローカル検証データです。',targetMenu:'',discountRate:10,startsAt:now.toISOString(),endsAt:end.toISOString(),audienceGender:'',audienceMinAge:'',audienceMaxAge:'',imageKey:null})});return await response.json()})()`,
  awaitPromise: true,
  returnByValue: true
});
if (!temporaryCampaign.result.value?.campaignId) throw new Error(`Temporary campaign could not be created: ${JSON.stringify(temporaryCampaign.result.value)}`);
await command("Page.navigate", { url: `${baseUrl}/admin/customers/messages/campaigns` });
await delay(1200);
const inspection = await command("Runtime.evaluate", {
  expression: `({title:document.title,tabs:[...document.querySelectorAll('.workspace-tabs a')].map(a=>a.textContent.trim()),editButtons:document.querySelectorAll('[data-edit]').length,deleteButtons:document.querySelectorAll('[data-delete]').length,overflow:document.documentElement.scrollWidth>window.innerWidth,bodyText:document.body.innerText.slice(0,300)})`,
  returnByValue: true
});
const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
const output = path.resolve("tmp/campaign-management-v429.png");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, Buffer.from(screenshot.data, "base64"));
await command("Runtime.evaluate", {
  expression: `(async()=>{const response=await fetch('/api/lien-campaigns?id='+encodeURIComponent(${JSON.stringify(temporaryCampaign.result.value.campaignId)}),{method:'DELETE'});return response.ok})()`,
  awaitPromise: true,
  returnByValue: true
});
socket.close();
chrome.kill();

const result = inspection.result.value;
if (!result.tabs.includes("キャンペーン") || result.tabs.length !== 4) throw new Error(`Unexpected tabs: ${result.tabs.join(", ")}`);
if (result.editButtons < 1 || result.deleteButtons < 1) throw new Error("Campaign management actions were not rendered.");
if (result.overflow) throw new Error("The campaign page has unexpected horizontal overflow at 1440px.");
if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join(" | ")}`);
console.log(JSON.stringify({ ...result, screenshot: output, exceptions }, null, 2));
