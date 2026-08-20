const fs = require("node:fs");

function writeChanged(filePath, transform) {
  const source = fs.readFileSync(filePath, "utf8");
  const updated = transform(source);
  if (updated === source) throw new Error(`${filePath}: no change was applied`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`Patched ${filePath}`);
}

function replaceOnce(source, before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: expected one match, found ${occurrences}`);
  return source.replace(before, after);
}

writeChanged("/app/billing.js", (source) => {
  let updated = replaceOnce(
    source,
    "    if (error === 'duplicate') errorText = '同じメールアドレスまたは店舗IDが登録されています。'",
    "    if (error === 'duplicate') errorText = '同じメールアドレスまたは店舗IDが登録されています。'\n    if (error === 'registered') errorText = 'このメールアドレスは登録済みです。'",
    "store registration error message"
  );
  updated = replaceOnce(
    updated,
    "      const sent = url.searchParams.get('sent') === '1'",
    "      const sent = url.searchParams.get('sent') === '1'\n      const registered = url.searchParams.get('registered') === '1'",
    "store registration status"
  );
  const formMarkup = "'<form method=\"post\" action=\"/admin/register\"><section class=\"card emailVerificationCard\"><div class=\"sectionHeading\"><span class=\"sectionIcon\">' + uiIcon('mail') + '</span><div><h2>メールアドレスを確認</h2><p>ご本人が受信できるアドレスだけで店舗登録を開始できます。</p></div></div><div class=\"field emailField\"><label for=\"email\">ログイン用メールアドレス</label><input id=\"email\" type=\"email\" name=\"email\" maxlength=\"254\" autocomplete=\"email\" inputmode=\"email\" placeholder=\"owner@example.com\" required><span class=\"fieldHint\">確認リンクの有効期限は' + registrationTokenMinutes() + '分です。アカウントはリンクを開いた後に作成します。</span></div><div class=\"submitBar\"><p class=\"muted small\">入力しただけでは登録されません。確認メールを受信し、リンクを開いてください。</p><button class=\"btn primary\" type=\"submit\"' + (!config.ready ? ' disabled' : '') + '>' + uiIcon('mail') + '確認メールを送信</button></div></section></form>'";
  updated = replaceOnce(
    updated,
    `        : ${formMarkup}`,
    `        : (registered\n          ? '<section class="card emailVerificationCard"><span class="verificationMark">' + uiIcon('store') + '</span><h2>このメールアドレスは登録済みです。</h2><p>店舗管理画面へログインするか、ログイン情報の再設定をご利用ください。</p><div class="actions"><a class="btn primary" href="/admin/login">店舗ログインへ</a><a class="btn secondary" href="/admin/password-reset">ログイン情報を再設定</a></div></section>'\n          : ${formMarkup})`,
    "store registration registered card"
  );
  updated = replaceOnce(
    updated,
    "      const existing = await prisma.$queryRawUnsafe('SELECT \"id\" FROM \"AppUser\" WHERE lower(\"email\")=$1 OR lower(\"loginId\")=$1 LIMIT 1', requestedEmail)\n      if (!existing[0]) {",
    "      const existing = await prisma.$queryRawUnsafe('SELECT \"id\" FROM \"AppUser\" WHERE \"role\" IN (\\'ADMIN\\',\\'STAFF\\',\\'MANUFACTURER\\') AND (lower(\"email\")=$1 OR lower(\"loginId\")=$1) LIMIT 1', requestedEmail)\n      if (existing[0]) return redirect(res, '/admin/register?registered=1')\n      {",
    "store registration audience query"
  );
  return updated;
});

writeChanged("/app/store-profile.js", (source) =>
  replaceOnce(
    source,
    "        id: { not: user.id },\n        OR: [{ email: { equals: email, mode: 'insensitive' } }, { loginId: { equals: email, mode: 'insensitive' } }],",
    "        id: { not: user.id },\n        role: { in: ['ADMIN', 'STAFF', 'MANUFACTURER'] },\n        OR: [{ email: { equals: email, mode: 'insensitive' } }, { loginId: { equals: email, mode: 'insensitive' } }],",
    "store owner email audience query"
  )
);

writeChanged("/app/.next/server/app/api/customer-auth/registration-link/request/route.js", (source) => {
  let updated = replaceOnce(
    source,
    'where: { email: { equals: t, mode: "insensitive" } },',
    'where: { email: { equals: t, mode: "insensitive" }, role: "CUSTOMER" },',
    "customer registration audience query"
  );
  updated = replaceOnce(
    updated,
    'return n();\n          let i = new Date',
    'return (function (e) { let r=(0,l.tm)(e,"/u/register"); r.searchParams.set("registered","1"); let t=s.NextResponse.redirect(r,303); return t.headers.set("Cache-Control","no-store"),t })(e);\n          let i = new Date',
    "customer registration duplicate redirect"
  );
  return updated;
});

writeChanged("/app/.next/server/app/u/register/page.js", (source) => {
  let updated = replaceOnce(
    source,
    'function c({searchParams:e}){let t=e?.sent==="1";',
    'function c({searchParams:e}){let t=e?.sent==="1",R=e?.registered==="1";',
    "customer registration page status"
  );
  updated = replaceOnce(
    updated,
    't?s.jsx("div",{role:"status",className:"mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]",children:"登録用メールを送信しました。受信箱と迷惑メールをご確認ください。リンクは60分間有効です。"}):null,',
    'R?s.jsx("div",{role:"alert",className:"mt-5 rounded-2xl border border-[#efc3c9] bg-[#fff4f5] px-4 py-4 text-sm font-semibold leading-6 text-[#9e4051]",children:"このメールアドレスは登録済みです。"}):t?s.jsx("div",{role:"status",className:"mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]",children:"登録用メールを送信しました。受信箱と迷惑メールをご確認ください。リンクは60分間有効です。"}):null,',
    "customer registration registered alert"
  );
  return updated;
});

writeChanged("/app/.next/server/chunks/2241.js", (source) => {
  let updated = replaceOnce(
    source,
    'appUser.findUnique({where:{loginId:d},select:{id:!0}})',
    'appUser.findFirst({where:{loginId:d,role:"CUSTOMER"},select:{id:!0}})',
    "customer final registration login query"
  );
  updated = replaceOnce(
    updated,
    'appUser.findFirst({where:{email:{equals:m,mode:"insensitive"}},select:{id:!0}})',
    'appUser.findFirst({where:{email:{equals:m,mode:"insensitive"},role:"CUSTOMER"},select:{id:!0}})',
    "customer final registration email query"
  );
  return updated;
});

writeChanged("/app/.next/server/app/api/auth/login/route.js", (source) =>
  replaceOnce(
    source,
    'appUser.findFirst({where:{OR:[{email:{equals:f,mode:"insensitive"}},{loginId:{equals:f,mode:"insensitive"}}]},',
    'appUser.findFirst({where:{role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{email:{equals:f,mode:"insensitive"}},{loginId:{equals:f,mode:"insensitive"}}]},',
    "store login audience query"
  )
);

writeChanged("/app/.next/server/app/api/customer-auth/login/route.js", (source) =>
  replaceOnce(
    source,
    'appUser.findUnique({where:{loginId:n},',
    'appUser.findFirst({where:{loginId:n,role:"CUSTOMER"},',
    "customer login audience query"
  )
);

writeChanged("/app/.next/server/app/api/auth/account/route.js", (source) =>
  replaceOnce(
    source,
    'where:{id:{not:p.id},OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},',
    'where:{id:{not:p.id},role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},',
    "store account audience query"
  )
);

writeChanged("/app/.next/server/app/api/customer-auth/account/route.js", (source) =>
  replaceOnce(
    source,
    'where:{id:{not:p.id},OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},',
    'where:{id:{not:p.id},role:"CUSTOMER",OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},',
    "customer account audience query"
  )
);

writeChanged("/app/.next/server/app/api/customer-auth/recovery-email/route.js", (source) =>
  replaceOnce(
    source,
    'where:{email:{equals:n,mode:"insensitive"},NOT:{id:t.userId}},',
    'where:{email:{equals:n,mode:"insensitive"},role:"CUSTOMER",NOT:{id:t.userId}},',
    "customer recovery email audience query"
  )
);

console.log("Registration duplicate handling is now separated by customer/store audience.");
