type PasswordResetMailInput = {
  to: string;
  audienceLabel: string;
  loginId?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
};

type GmailTextMailInput = {
  to: string;
  subject: string;
  body: string;
};

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function encodeSubject(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

async function gmailAccessToken() {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuthの送信設定が完了していません。");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Gmail OAuth token error (${response.status}, ${payload.error ?? "unknown"})`);
  }
  return payload.access_token;
}

export async function sendGmailTextMail(input: GmailTextMailInput) {
  const from = process.env.GMAIL_RESERVATION_EMAIL?.trim();
  if (!from) throw new Error("GMAIL_RESERVATION_EMAILが設定されていません。");
  const senderName = process.env.PASSWORD_RESET_MAIL_FROM_NAME?.trim() || "Salon de Lien";
  const accessToken = await gmailAccessToken();
  const raw = [
    `From: ${encodeSubject(senderName)} <${from}>`,
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: base64Url(raw) }),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Gmail send error (${response.status})`);
  }
}

export async function sendPasswordResetMail(input: PasswordResetMailInput) {
  const loginLine = input.loginId ? `ログインID: ${input.loginId}\r\n\r\n` : "";
  const body = [
    `${input.audienceLabel}のログイン情報再設定を受け付けました。`,
    "",
    loginLine.trimEnd(),
    `次のURLを開き、${input.expiresInMinutes}分以内に新しいパスワードを設定してください。`,
    input.resetUrl,
    "",
    "このメールに心当たりがない場合は、何もせず破棄してください。",
    "このURLは一度使用すると無効になります。",
    "",
    "Salon de Lien"
  ].filter(Boolean).join("\r\n");

  await sendGmailTextMail({
    to: input.to,
    subject: "Salon de Lien ログイン情報の再設定",
    body
  });
}
