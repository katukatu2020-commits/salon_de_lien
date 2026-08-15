import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { URL } from "node:url";

const CALLBACK_HOST = "127.0.0.1";
const CALLBACK_PORT = 53682;
const REDIRECT_URI = `http://${CALLBACK_HOST}:${CALLBACK_PORT}/oauth2/callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send"
];

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

async function readLocalEnvironment() {
  const sources = [".env", ".env.local"];
  const values = {};
  for (const path of sources) {
    if (!existsSync(path)) continue;
    Object.assign(values, parseEnv(await readFile(path, "utf8")));
  }
  return { ...values, ...process.env };
}

function setEnvValue(source, key, value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
}

async function saveConfiguration(values) {
  const path = ".env.local";
  let source = existsSync(path) ? await readFile(path, "utf8") : "";
  for (const [key, value] of Object.entries(values)) source = setEnvValue(source, key, value);
  await writeFile(path, source, "utf8");
}

async function exchangeCode(code, clientId, clientSecret) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.refresh_token || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `OAuth token error (${response.status})`);
  }
  return payload;
}

async function fetchProfile(accessToken) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const profile = await response.json();
  if (!response.ok || !profile.emailAddress) {
    throw new Error(`Gmail profile error (${response.status})`);
  }
  return profile;
}

const env = await readLocalEnvironment();
const clientId = env.GMAIL_OAUTH_CLIENT_ID?.trim();
const clientSecret = env.GMAIL_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error("GMAIL_OAUTH_CLIENT_ID と GMAIL_OAUTH_CLIENT_SECRET を .env.local に設定してください。");
  process.exitCode = 1;
} else {
  const state = randomBytes(24).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    ...(env.GMAIL_RESERVATION_EMAIL?.trim() ? { login_hint: env.GMAIL_RESERVATION_EMAIL.trim() } : {}),
    include_granted_scopes: "true",
    state
  }).toString();
  await writeFile(".gmail-oauth-authorization-url.txt", authUrl.toString(), "utf8");

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", REDIRECT_URI);
      if (requestUrl.pathname !== "/oauth2/callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      if (requestUrl.searchParams.get("state") !== state) throw new Error("OAuth state mismatch");
      const code = requestUrl.searchParams.get("code");
      if (!code) throw new Error(requestUrl.searchParams.get("error") || "Authorization code was not returned");

      const tokens = await exchangeCode(code, clientId, clientSecret);
      const profile = await fetchProfile(tokens.access_token);
      const expectedEmail = env.GMAIL_RESERVATION_EMAIL?.trim();
      if (expectedEmail && profile.emailAddress.toLowerCase() !== expectedEmail.toLowerCase()) {
        throw new Error(`接続したアカウント (${profile.emailAddress}) が GMAIL_RESERVATION_EMAIL と一致しません。`);
      }

      await saveConfiguration({
        GMAIL_RESERVATION_EMAIL: profile.emailAddress,
        GMAIL_OAUTH_REFRESH_TOKEN: tokens.refresh_token,
        GMAIL_AUTO_SYNC_ENABLED: "true",
        GMAIL_SYNC_CRON_SECRET: env.GMAIL_SYNC_CRON_SECRET?.trim() || randomBytes(32).toString("hex")
      });
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h1>Gmail連携が完了しました</h1><p>この画面を閉じ、Salon de Lienサーバーを再起動してください。</p>");
      console.log(`Gmail連携が完了しました: ${profile.emailAddress}`);
      console.log("更新トークンは .env.local に保存しました。サーバーを再起動してください。");
    } catch (error) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Gmail OAuth setup failed");
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });

  server.listen(CALLBACK_PORT, CALLBACK_HOST, () => {
    console.log("次のURLをブラウザで開き、予約受付用Gmailアカウントを許可してください。\n");
    console.log(authUrl.toString());
    console.log(`\nGoogle CloudのOAuthリダイレクトURIには ${REDIRECT_URI} を登録してください。`);
  });
}
