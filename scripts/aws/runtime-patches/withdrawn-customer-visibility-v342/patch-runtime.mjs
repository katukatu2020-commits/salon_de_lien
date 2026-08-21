import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  // Use a function replacement so SQL placeholders such as `$1` and `$'`
  // are copied literally instead of being interpreted as replace patterns.
  return source.replace(before, () => after);
}

const withdrawalPath = "/app/customer-withdrawal-v309.js";
let withdrawal = fs.readFileSync(withdrawalPath, "utf8");
withdrawal = replaceOnce(
  withdrawal,
  `      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE, "updatedAt"=NOW() WHERE "id"=$1', row.appUserId)`,
  `      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE, "updatedAt"=NOW() WHERE "customerId"=$1', row.customerId)`,
  "deactivate every customer login"
);
withdrawal = replaceOnce(
  withdrawal,
  `    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerWithdrawalRequest_expiresAt_usedAt_idx" ON "CustomerWithdrawalRequest"("expiresAt", "usedAt")')`,
  `    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerWithdrawalRequest_expiresAt_usedAt_idx" ON "CustomerWithdrawalRequest"("expiresAt", "usedAt")')
    // Repair legacy withdrawals that left another customer login active.
    await prisma.$executeRawUnsafe('UPDATE "AppUser" u SET "active"=FALSE, "updatedAt"=NOW() FROM "Customer" c WHERE u."customerId"=c."id" AND c."deletedAt" IS NOT NULL AND u."active"=TRUE')
    await prisma.$executeRawUnsafe('UPDATE "CustomerPortalAccess" p SET "revokedAt"=NOW(), "updatedAt"=NOW() FROM "Customer" c WHERE p."customerId"=c."id" AND c."deletedAt" IS NOT NULL AND p."revokedAt" IS NULL')`,
  "legacy withdrawal repair"
);
fs.writeFileSync(withdrawalPath, withdrawal);

const serverPath = "/app/server.js";
let server = fs.readFileSync(serverPath, "utf8");
server = replaceOnce(
  server,
  `WHERE t."organizationId"=$1 ORDER BY t."updatedAt" DESC', session.organizationId)`,
  `WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY t."updatedAt" DESC', session.organizationId)`,
  "store chat withdrawal filter"
);
fs.writeFileSync(serverPath, server);

const chatPagePath = "/app/.next/server/app/admin/customers/messages/page.js";
let chatPage = fs.readFileSync(chatPagePath, "utf8");
const chatBefore = `WHERE t."organizationId"=$1 ORDER BY t."updatedAt" DESC`;
const chatMatches = chatPage.split(chatBefore).length - 1;
if (chatMatches < 1) throw new Error(`compiled store chat withdrawal filter: no match`);
chatPage = chatPage.split(chatBefore).join(`WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY t."updatedAt" DESC`);
fs.writeFileSync(chatPagePath, chatPage);

const platformPath = "/app/platform-operator.js";
let platform = fs.readFileSync(platformPath, "utf8");

platform = replaceOnce(
  platform,
  `<div class="topRight"><span class="readonly" aria-label="運営者権限">◉ <span>運営者権限</span></span>`,
  `<div class="topRight"><a class="readonly" href="/platform">店舗一覧</a><a class="readonly" href="/platform/customers">顧客台帳</a><span class="readonly" aria-label="運営者権限">◉ <span>運営者権限</span></span>`,
  "platform customer navigation"
);

const operatorPages = String.raw`
function customerRegistryPage(data) {
  const rows = data.rows || []
  const status = data.status || 'all'
  const query = data.query || ''
  const records = rows.length ? rows.map(function (row) {
    const withdrawn = Boolean(row.deletedAt)
    return '<tr><td><div class="storeName">' + escapeHtml(row.name) + '</div><div class="slug">' + escapeHtml(row.id) + '</div></td><td><div class="owner">' + escapeHtml(row.organizationName) + '</div><div class="slug">' + escapeHtml(row.organizationId) + '</div></td><td><div class="owner">' + escapeHtml(row.email || '未登録') + '</div><div class="slug">' + escapeHtml(row.phone || '電話未登録') + '</div></td><td><span class="badge ' + (withdrawn ? 'danger' : 'good') + '">' + (withdrawn ? '退会済み' : '利用中') + '</span></td><td>' + formatDate(row.createdAt, true) + '</td><td>' + formatDate(row.deletedAt, true) + '</td><td class="num">' + formatNumber(row.visitCount) + '</td><td class="num">' + formatYen(row.totalRevenue) + '</td><td><a class="readonly" href="/platform/customers/' + encodeURIComponent(row.id) + '">カルテを見る</a></td></tr>'
  }).join('') : '<tr><td colspan="9" class="empty">条件に合う顧客がいません。</td></tr>'
  const totalPages = Math.max(1, Math.ceil(Number(data.total || 0) / data.pageSize))
  const params = function (page) { const p = new URLSearchParams(); if (query) p.set('q', query); if (status !== 'all') p.set('status', status); p.set('page', String(page)); return '/platform/customers?' + p.toString() }
  const pager = '<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:18px 26px;border-top:1px solid var(--line)">' + (data.page > 1 ? '<a class="readonly" href="' + params(data.page - 1) + '">前へ</a>' : '') + '<span class="readonly">' + data.page + ' / ' + totalPages + 'ページ</span>' + (data.page < totalPages ? '<a class="readonly" href="' + params(data.page + 1) + '">次へ</a>' : '') + '</div>'
  const body = '<main class="main"><section class="hero"><div><p class="eyebrow">CUSTOMER RECORDS / READ ONLY</p><h1>運営者 顧客台帳</h1><p>店舗画面から除外された退会済み顧客も、退会日時を付けて運営者権限で保全・確認します。</p></div><div class="updated">全 ' + formatNumber(data.total) + '件<br><strong>退会済み ' + formatNumber(data.withdrawnCount) + '件</strong></div></section>' +
    '<section class="card" style="margin-top:20px"><form method="get" action="/platform/customers" style="display:grid;grid-template-columns:minmax(220px,1fr) 180px auto;gap:12px;align-items:end"><div class="field" style="margin:0"><label for="q">顧客・店舗・メール・電話で検索</label><input id="q" name="q" value="' + escapeHtml(query) + '"></div><div class="field" style="margin:0"><label for="status">状態</label><select id="status" name="status" style="min-height:50px;border:1px solid #dccac0;border-radius:14px;background:#fff;padding:12px 14px"><option value="all"' + (status === 'all' ? ' selected' : '') + '>すべて</option><option value="active"' + (status === 'active' ? ' selected' : '') + '>利用中</option><option value="withdrawn"' + (status === 'withdrawn' ? ' selected' : '') + '>退会済み</option></select></div><button class="primary" style="width:auto;margin:0;padding:0 28px" type="submit">検索</button></form></section>' +
    '<section class="card tableCard"><div class="tableHead"><div><h2>顧客カルテ一覧</h2><p>この画面は閲覧専用です。退会済みデータの編集・店舗画面への復元はできません。</p></div><span class="readonly">退会記録を保持</span></div><div class="tableWrap"><table class="stores"><thead><tr><th>顧客</th><th>登録店舗</th><th>連絡先</th><th>状態</th><th>登録日時</th><th>退会日時</th><th class="num">来店</th><th class="num">累計売上</th><th>詳細</th></tr></thead><tbody>' + records + '</tbody></table></div>' + pager + '</section></main>'
  return pageShell('運営者 顧客台帳', body, true)
}

function customerRecordPage(row) {
  const withdrawn = Boolean(row.deletedAt)
  const item = function (label, value) { return '<div class="listRow"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value == null || value === '' ? '—' : value) + '</strong></div>' }
  const body = '<main class="main"><section class="hero"><div><p class="eyebrow">CUSTOMER RECORD / READ ONLY</p><h1>' + escapeHtml(row.name) + '</h1><p>' + escapeHtml(row.organizationName) + 'の顧客カルテを、運営者権限で閲覧しています。</p></div><div><span class="badge ' + (withdrawn ? 'danger' : 'good') + '">' + (withdrawn ? '退会済み' : '利用中') + '</span></div></section>' +
    (withdrawn ? '<section class="notice" style="margin-top:20px">この顧客は ' + escapeHtml(formatDate(row.deletedAt, true)) + ' に退会しました。店舗側の顧客一覧・検索・カルテ・チャットには表示されません。履歴は運営者確認用として保持されています。</section>' : '') +
    '<section class="sectionGrid"><article class="card"><div class="cardIntro"><div><h2>登録情報</h2><p>閲覧専用・編集不可</p></div></div><div class="list">' + item('顧客ID', row.id) + item('店舗', row.organizationName) + item('氏名', row.name) + item('性別', row.gender) + item('生年月日', formatDate(row.birthDate)) + item('メールアドレス', row.email) + item('電話番号', row.phone) + item('登録日時', formatDate(row.createdAt, true)) + item('退会日時', formatDate(row.deletedAt, true)) + '</div></article>' +
    '<aside class="card"><h2>履歴集計</h2><div class="list">' + item('予約', formatNumber(row.appointmentCount) + '件') + item('来店', formatNumber(row.visitCount) + '件') + item('会計', formatNumber(row.saleCount) + '件') + item('累計売上', formatYen(row.totalRevenue)) + item('最終会計', formatDate(row.lastPaidAt, true)) + item('ログイン状態', row.appUserActive ? '有効' : '無効') + '</div></aside></section><p style="margin-top:22px"><a class="readonly" href="/platform/customers">顧客台帳へ戻る</a></p></main>'
  return pageShell('顧客カルテ ' + row.name, body, true)
}
`;
platform = replaceOnce(
  platform,
  `function createPlatformOperatorService({ prisma, crypto }) {`,
  operatorPages + `\nfunction createPlatformOperatorService({ prisma, crypto }) {`,
  "platform customer pages"
);

const operatorLoaders = String.raw`
  async function loadCustomerRegistry(url) {
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 100)
    const requestedStatus = String(url.searchParams.get('status') || 'all')
    const status = ['all','active','withdrawn'].includes(requestedStatus) ? requestedStatus : 'all'
    const pageSize = 50
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1))
    const clauses = []
    const params = []
    if (status === 'active') clauses.push('c."deletedAt" IS NULL')
    if (status === 'withdrawn') clauses.push('c."deletedAt" IS NOT NULL')
    if (query) {
      params.push('%' + query + '%')
      clauses.push('(c."name" ILIKE $' + params.length + ' OR COALESCE(c."phone",\'\') ILIKE $' + params.length + ' OR o."name" ILIKE $' + params.length + ' OR COALESCE(u."email",\'\') ILIKE $' + params.length + ')')
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''
    const countRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count",COUNT(*) FILTER (WHERE c."deletedAt" IS NOT NULL)::int AS "withdrawnCount" FROM "Customer" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN LATERAL (SELECT a."email" FROM "AppUser" a WHERE a."customerId"=c."id" ORDER BY a."createdAt" DESC LIMIT 1) u ON true ' + where, ...params)
    const queryParams = params.concat([pageSize, (page - 1) * pageSize])
    const limitPosition = params.length + 1
    const offsetPosition = params.length + 2
    const rows = await prisma.$queryRawUnsafe('SELECT c."id",c."name",c."phone",c."createdAt",c."deletedAt",c."organizationId",o."name" AS "organizationName",u."email",COALESCE(v."count",0)::int AS "visitCount",COALESCE(s."total",0)::bigint AS "totalRevenue" FROM "Customer" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN LATERAL (SELECT a."email" FROM "AppUser" a WHERE a."customerId"=c."id" ORDER BY a."createdAt" DESC LIMIT 1) u ON true LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "Visit" x WHERE x."customerId"=c."id") v ON true LEFT JOIN LATERAL (SELECT COALESCE(SUM(x."amount"),0)::bigint AS "total" FROM "ServiceSale" x WHERE x."customerId"=c."id") s ON true ' + where + ' ORDER BY c."deletedAt" DESC NULLS LAST,c."createdAt" DESC LIMIT $' + limitPosition + ' OFFSET $' + offsetPosition, ...queryParams)
    return { rows, total: Number(countRows[0]?.count || 0), withdrawnCount: Number(countRows[0]?.withdrawnCount || 0), query, status, page, pageSize }
  }

  async function loadCustomerRecord(customerId) {
    const rows = await prisma.$queryRawUnsafe('SELECT c."id",c."name",c."gender",c."birthDate",c."phone",c."createdAt",c."deletedAt",c."organizationId",o."name" AS "organizationName",u."email",COALESCE(u."active",FALSE) AS "appUserActive",COALESCE(a."count",0)::int AS "appointmentCount",COALESCE(v."count",0)::int AS "visitCount",COALESCE(s."count",0)::int AS "saleCount",COALESCE(s."total",0)::bigint AS "totalRevenue",s."lastPaidAt" FROM "Customer" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN LATERAL (SELECT x."email",x."active" FROM "AppUser" x WHERE x."customerId"=c."id" ORDER BY x."createdAt" DESC LIMIT 1) u ON true LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "Appointment" x WHERE x."customerId"=c."id") a ON true LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "Visit" x WHERE x."customerId"=c."id") v ON true LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count",COALESCE(SUM(x."amount"),0)::bigint AS "total",MAX(x."paidAt") AS "lastPaidAt" FROM "ServiceSale" x WHERE x."customerId"=c."id") s ON true WHERE c."id"=$1 LIMIT 1', customerId)
    return rows[0] || null
  }
`;
platform = replaceOnce(
  platform,
  `  async function handle(req, res, url) {`,
  operatorLoaders + `\n  async function handle(req, res, url) {`,
  "platform customer loaders"
);

const operatorRoutes = String.raw`
    if (url.pathname === '/platform/customers') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }
      if (!session(req)) { redirect(res, '/platform/login', 302); return true }
      try {
        const content = customerRegistryPage(await loadCustomerRegistry(url))
        if (req.method === 'HEAD') { res.statusCode = 200; setSecurityHeaders(res); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(); return true }
        html(res, 200, content)
      } catch (error) {
        console.error('Platform customer registry failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
        html(res, 500, pageShell('運営者 顧客台帳', '<main class="loginMain"><section class="loginCard"><h1>顧客台帳を取得できません</h1></section></main>', true))
      }
      return true
    }
    if (/^\/platform\/customers\/[^/]+$/.test(url.pathname)) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }
      if (!session(req)) { redirect(res, '/platform/login', 302); return true }
      const customerId = decodeURIComponent(url.pathname.slice('/platform/customers/'.length)).slice(0, 160)
      const row = await loadCustomerRecord(customerId)
      if (!row) { html(res, 404, pageShell('顧客が見つかりません', '<main class="loginMain"><section class="loginCard"><h1>顧客が見つかりません</h1></section></main>', true)); return true }
      const content = customerRecordPage(row)
      if (req.method === 'HEAD') { res.statusCode = 200; setSecurityHeaders(res); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(); return true }
      html(res, 200, content)
      return true
    }
`;
const platformRouteMarker = `    if (url.pathname === '/platform') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }`;
const platformRouteIndex = platform.lastIndexOf(platformRouteMarker);
if (platformRouteIndex < 0) throw new Error("platform customer routes: marker missing");
platform = platform.slice(0, platformRouteIndex) + operatorRoutes + "\n" + platform.slice(platformRouteIndex);

platform = replaceOnce(
  platform,
  `          (SELECT COUNT(*)::int FROM "Customer" WHERE "deletedAt" IS NULL) AS "customerCount",`,
  `          (SELECT COUNT(*)::int FROM "Customer" WHERE "deletedAt" IS NULL) AS "customerCount",\n          (SELECT COUNT(*)::int FROM "Customer" WHERE "deletedAt" IS NOT NULL) AS "withdrawnCustomerCount",`,
  "platform withdrawn summary"
);
platform = replaceOnce(
  platform,
  `metricCard('登録顧客総数', formatNumber(summary.customerCount) + '名', '削除済み顧客を除外')`,
  `metricCard('利用中顧客', formatNumber(summary.customerCount) + '名', '退会済み ' + formatNumber(summary.withdrawnCustomerCount) + '名を別管理')`,
  "platform customer metric"
);

fs.writeFileSync(platformPath, platform);
console.log("Withdrawn customer visibility v342 runtime patch applied");
