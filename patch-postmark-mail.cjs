const fs = require("node:fs");

function replaceSection(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker was not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker was not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function writeChanged(filePath, transform) {
  const source = fs.readFileSync(filePath, "utf8");
  const updated = transform(source);
  if (updated === source) throw new Error(`${filePath}: no change was applied`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`Patched ${filePath}`);
}

const postmarkRuntime = String.raw`function postmarkMailConfig() {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim()
  const from = String(process.env.POSTMARK_FROM_EMAIL || '').trim()
  const fromName = String(process.env.POSTMARK_FROM_NAME || 'Salon de Lien').trim()
  const replyTo = String(process.env.POSTMARK_REPLY_TO || '').trim()
  const transactionalStream = String(process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound').trim()
  if (!token || !from) {
    throw Object.assign(new Error('Postmark mail sender is not configured'), { code: 'POSTMARK_NOT_CONFIGURED' })
  }
  return { token, from, fromName, replyTo, transactionalStream }
}

async function sendPostmarkTextMail(input) {
  const config = postmarkMailConfig()
  const payload = {
    From: config.fromName + ' <' + config.from + '>',
    To: String(input.to || '').trim(),
    Subject: String(input.subject || ''),
    TextBody: String(input.body || ''),
    MessageStream: String(input.messageStream || config.transactionalStream),
    TrackOpens: false,
    TrackLinks: 'None',
  }
  if (config.replyTo) payload.ReplyTo = config.replyTo
  if (input.tag) payload.Tag = String(input.tag).slice(0, 1000)
  if (input.metadata && typeof input.metadata === 'object') payload.Metadata = input.metadata
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.token,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  })
  const result = await response.json().catch(function () { return {} })
  if (!response.ok || Number(result.ErrorCode || 0) !== 0) {
    throw Object.assign(new Error('Postmark mail delivery failed'), {
      code: 'POSTMARK_SEND_FAILED',
      statusCode: response.status,
      postmarkErrorCode: Number(result.ErrorCode || 0),
    })
  }
  return { messageId: result.MessageID || null, submittedAt: result.SubmittedAt || null }
}

async function sendRegistrationVerificationMail(input) {
  const subject = 'Salon de Lien 店舗登録用メールアドレス確認'
  const body = [
    'Salon de Lienの店舗登録を開始するには、以下のリンクを開いてください。',
    '',
    input.verificationUrl,
    '',
    'このリンクの有効期限は' + input.expiresMinutes + '分で、一度だけ使用できます。',
    'このメールに心当たりがない場合は、リンクを開かず削除してください。',
  ].join('\n')
  return sendPostmarkTextMail({
    to: input.to,
    subject,
    body,
    tag: 'store-registration',
    metadata: { mailType: 'STORE_REGISTRATION_VERIFICATION' },
  })
}

`;

writeChanged("/app/billing.js", (source) =>
  replaceSection(
    source,
    "function encodedMailHeader(value) {",
    "function safeJson(res, status, value) {",
    postmarkRuntime,
    "billing registration mail"
  )
);

const compiledPostmarkSender = String.raw`async function C(e) {
        let token = String(process.env.POSTMARK_SERVER_TOKEN || "").trim(),
          from = String(process.env.POSTMARK_FROM_EMAIL || "").trim(),
          fromName = String(process.env.POSTMARK_FROM_NAME || "Salon de Lien").trim(),
          replyTo = String(process.env.POSTMARK_REPLY_TO || "").trim(),
          stream = String(e.messageStream || process.env.POSTMARK_TRANSACTIONAL_STREAM || "outbound").trim();
        if (!token || !from) throw Error("メール配信設定が完了していません。");
        let payload = {
          From: fromName + " <" + from + ">",
          To: String(e.to || "").trim(),
          Subject: String(e.subject || ""),
          TextBody: String(e.body || ""),
          MessageStream: stream,
        };
        if (stream !== String(process.env.POSTMARK_BROADCAST_STREAM || "broadcast").trim()) {
          payload.TrackOpens = false;
          payload.TrackLinks = "None";
        }
        if (replyTo) payload.ReplyTo = replyTo;
        if (e.tag) payload.Tag = String(e.tag).slice(0, 1000);
        let response = await fetch("https://api.postmarkapp.com/email", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Postmark-Server-Token": token,
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
          }),
          result = await response.json().catch(() => ({}));
        if (!response.ok || Number(result.ErrorCode || 0) !== 0)
          throw Error("メール配信に失敗しました (Postmark HTTP " + response.status + ", code " + Number(result.ErrorCode || 0) + ")");
        return { messageId: result.MessageID || null, submittedAt: result.SubmittedAt || null };
      }
      `;

writeChanged("/app/.next/server/chunks/9845.js", (source) => {
  let updated = replaceSection(
    source,
    "async function C(e) {",
    "async function I(e) {",
    compiledPostmarkSender,
    "customer broadcast mail"
  );
  const broadcastCall = /C\(\{\s*to:\s*a\.appUsers\[0\]\.email,\s*subject:\s*r,\s*body:\s*e\s*\}\)/;
  if (!broadcastCall.test(updated)) throw new Error("customer broadcast call was not found");
  updated = updated.replace(
    broadcastCall,
    'C({ to: a.appUsers[0].email, subject: r, body: e, messageStream: process.env.POSTMARK_BROADCAST_STREAM || "broadcast", tag: "customer-broadcast" })'
  );
  return updated;
});

const routeMailModule = String.raw`6183:(e,t,r)=>{
  async function s(e){
    let token=String(process.env.POSTMARK_SERVER_TOKEN||"").trim(),
      from=String(process.env.POSTMARK_FROM_EMAIL||"").trim(),
      fromName=String(process.env.POSTMARK_FROM_NAME||"Salon de Lien").trim(),
      replyTo=String(process.env.POSTMARK_REPLY_TO||"").trim(),
      stream=String(process.env.POSTMARK_TRANSACTIONAL_STREAM||"outbound").trim();
    if(!token||!from)throw Error("Postmarkの送信設定が完了していません。");
    let payload={From:fromName+" <"+from+">",To:String(e.to||"").trim(),Subject:String(e.subject||""),TextBody:String(e.body||""),MessageStream:stream,TrackOpens:false,TrackLinks:"None"};
    if(replyTo)payload.ReplyTo=replyTo;
    let response=await fetch("https://api.postmarkapp.com/email",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json","X-Postmark-Server-Token":token},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(20000)}),result=await response.json().catch(()=>({}));
    if(!response.ok||Number(result.ErrorCode||0)!==0)throw Error("Postmark send error (HTTP "+response.status+", code "+Number(result.ErrorCode||0)+")");
    return{messageId:result.MessageID||null,submittedAt:result.SubmittedAt||null}
  }
  async function a(e){
    let t=e.loginId?"ログインID: "+e.loginId+"\r\n\r\n":"",r=[e.audienceLabel+"のログイン情報再設定を受け付けました。","",t.trimEnd(),"次のURLを開き、"+e.expiresInMinutes+"分以内に新しいパスワードを設定してください。",e.resetUrl,"","このメールに心当たりがない場合は、何もせず破棄してください。","このURLは一度使用すると無効になります。","","Salon de Lien"].filter(Boolean).join("\r\n");
    await s({to:e.to,subject:"Salon de Lien ログイン情報の再設定",body:r})
  }
  r.d(t,{c:()=>s,f:()=>a})
},13538:`;

for (const routePath of [
  "/app/.next/server/app/api/auth/password-reset/request/route.js",
  "/app/.next/server/app/api/customer-auth/registration-link/request/route.js",
]) {
  writeChanged(routePath, (source) => {
    const modulePattern = /6183\s*:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*13538\s*:/;
    const matches = source.match(new RegExp(modulePattern.source, "g")) || [];
    if (matches.length !== 1) throw new Error(`${routePath}: expected one mail module, found ${matches.length}`);
    const withPostmarkModule = source.replace(modulePattern, routeMailModule);
    const providerPattern = /provider\s*:\s*["']gmail["']/g;
    const providerMatches = withPostmarkModule.match(providerPattern) || [];
    if (providerMatches.length !== 1) {
      throw new Error(`${routePath}: expected one Gmail provider label, found ${providerMatches.length}`);
    }
    return withPostmarkModule.replace(providerPattern, 'provider:"postmark"');
  });
}

writeChanged("/app/public-site.js", (source) => {
  const updated = source
    .replaceAll("AWS SESで予約メールを提供する場合", "Postmarkで予約メールを提供する場合")
    .replaceAll("予約メールをAWS SESで提供する場合", "予約メールをPostmarkで提供する場合");
  if (!updated.includes("Postmark")) throw new Error("public site Postmark disclosure was not applied");
  return updated;
});

const mailFiles = [
  "/app/billing.js",
  "/app/.next/server/chunks/9845.js",
  "/app/.next/server/app/api/auth/password-reset/request/route.js",
  "/app/.next/server/app/api/customer-auth/registration-link/request/route.js",
];
for (const filePath of mailFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes("gmail.googleapis.com/gmail/v1/users/me/messages/send")) {
    throw new Error(`${filePath}: Gmail outbound endpoint remains`);
  }
  if (!source.includes("api.postmarkapp.com/email")) {
    throw new Error(`${filePath}: Postmark endpoint is missing`);
  }
}

console.log("All outbound email paths now use Postmark.");
