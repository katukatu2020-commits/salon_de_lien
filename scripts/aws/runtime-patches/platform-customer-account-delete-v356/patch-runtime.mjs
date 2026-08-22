import fs from 'node:fs'

const file = '/app/platform-operator.js'
let source = fs.readFileSync(file, 'utf8')

function replaceOnce(before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${label}: expected 1 match, found ${matches}`)
  source = source.replace(before, after)
}

replaceOnce(
  `function customerRecordPage(row) {\n  const withdrawn = Boolean(row.deletedAt)\n  const storeHidden = Boolean(row.storeHiddenAt)\n  const item = function`,
  `function customerRecordPage(row, errorCode = '') {\n  const withdrawn = Boolean(row.deletedAt)\n  const storeHidden = Boolean(row.storeHiddenAt)\n  const item = function`,
  'customer record state parameter',
)

replaceOnce(
  `  const item = function (label, value) { return '<div class="listRow"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value == null || value === '' ? '—' : value) + '</strong></div>' }\n  const body = '<main class="main"><section class="hero">`,
  `  const item = function (label, value) { return '<div class="listRow"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value == null || value === '' ? '—' : value) + '</strong></div>' }\n  const deleteError = errorCode === 'confirmation' ? '<section class="notice" style="margin-top:20px;border-color:#e4a7a7;background:#fff1f1;color:#7f1d1d">確認用の氏名が一致しません。表示されている顧客名を正確に入力してください。</section>' : errorCode === 'account' ? '<section class="notice" style="margin-top:20px">削除対象となる有効な顧客ログインアカウントがありません。</section>' : ''\n  const deleteAction = withdrawn ? '<section class="card" style="margin-top:20px"><h2>アカウント削除済み</h2><p>ログインは停止されています。予約・会計・施術履歴は運営者確認用として保持されています。</p></section>' : row.appUserActive ? '<section class="card" style="margin-top:20px;border-color:#e4a7a7"><div class="cardIntro"><div><p class="eyebrow">DANGER ZONE</p><h2>顧客アカウントを削除</h2><p>顧客ログインを停止し、店舗・顧客画面から非表示にします。予約・会計・施術履歴は削除せず、運営者サイトに保持します。</p></div></div><form method="post" action="/api/platform/customers/' + encodeURIComponent(row.id) + '/delete-account"><div class="field"><label for="deleteConfirmation">確認のため顧客名「' + escapeHtml(row.name) + '」を入力</label><input id="deleteConfirmation" name="confirmation" autocomplete="off" required></div><button class="primary" style="background:#9f3f3f" type="submit">アカウントを削除する</button></form></section>' : '<section class="card" style="margin-top:20px"><h2>ログインアカウント未発行</h2><p>この顧客には削除対象となる有効なログインアカウントがありません。</p></section>'\n  const body = '<main class="main"><section class="hero">`,
  'customer account deletion action card',
)

replaceOnce(
  `    '<aside class="card"><h2>履歴集計</h2><div class="list">' + item('予約', formatNumber(row.appointmentCount) + '件') + item('来店', formatNumber(row.visitCount) + '件') + item('会計', formatNumber(row.saleCount) + '件') + item('累計売上', formatYen(row.totalRevenue)) + item('最終会計', formatDate(row.lastPaidAt, true)) + item('ログイン状態', row.appUserActive ? '有効' : '無効') + '</div></aside></section><p style="margin-top:22px"><a class="readonly" href="/platform/customers">顧客台帳へ戻る</a></p></main>'`,
  `    '<aside class="card"><h2>履歴集計</h2><div class="list">' + item('予約', formatNumber(row.appointmentCount) + '件') + item('来店', formatNumber(row.visitCount) + '件') + item('会計', formatNumber(row.saleCount) + '件') + item('累計売上', formatYen(row.totalRevenue)) + item('最終会計', formatDate(row.lastPaidAt, true)) + item('ログイン状態', row.appUserActive ? '有効' : '無効') + '</div></aside></section>' + deleteError + deleteAction + '<p style="margin-top:22px"><a class="readonly" href="/platform/customers">顧客台帳へ戻る</a></p></main>'`,
  'customer account deletion action placement',
)

replaceOnce(
  `    if (/^\\/platform\\/customers\\/[^/]+$/.test(url.pathname)) {`,
  `    if (/^\\/api\\/platform\\/customers\\/[^/]+\\/delete-account$/.test(url.pathname)) {\n      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }\n      const operator = session(req)\n      if (!operator) { redirect(res, '/platform/login', 302); return true }\n      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }\n      const prefix = '/api/platform/customers/'\n      const suffix = '/delete-account'\n      const customerId = decodeURIComponent(url.pathname.slice(prefix.length, -suffix.length)).slice(0, 160)\n      const body = new URLSearchParams(await readBody(req))\n      const confirmation = String(body.get('confirmation') || '').trim()\n+      const targets = await prisma.$queryRawUnsafe('SELECT c."id",c."name",c."organizationId",c."deletedAt",u."id" AS "appUserId",u."loginId",u."email",COALESCE(u."active",FALSE) AS "appUserActive" FROM "Customer" c LEFT JOIN LATERAL (SELECT x."id",x."loginId",x."email",x."active" FROM "AppUser" x WHERE x."customerId"=c."id" AND x."role"=\\'CUSTOMER\\' ORDER BY x."createdAt" DESC LIMIT 1) u ON true WHERE c."id"=$1 LIMIT 1', customerId)\n      const target = targets[0]\n      if (!target) { html(res, 404, pageShell('顧客が見つかりません', '<main class="loginMain"><section class="loginCard"><h1>顧客が見つかりません</h1></section></main>', true)); return true }\n      if (confirmation !== String(target.name || '').trim()) { redirect(res, '/platform/customers/' + encodeURIComponent(customerId) + '?error=confirmation', 303); return true }\n      if (!target.appUserId || !target.appUserActive) { redirect(res, '/platform/customers/' + encodeURIComponent(customerId) + '?error=account', 303); return true }\n      await prisma.$transaction(async function (tx) {\n        const locked = await tx.$queryRawUnsafe('SELECT "id","name","organizationId","deletedAt","storeHiddenAt" FROM "Customer" WHERE "id"=$1 FOR UPDATE', customerId)\n        if (!locked[0]) throw new Error('customer_not_found')\n        await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE,"updatedAt"=NOW() WHERE "customerId"=$1 AND "role"=\\'CUSTOMER\\'', customerId)\n        await tx.$executeRawUnsafe('UPDATE "Customer" SET "deletedAt"=COALESCE("deletedAt",NOW()),"storeHiddenAt"=COALESCE("storeHiddenAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1', customerId)\n        await tx.$executeRawUnsafe('UPDATE "CustomerPortalAccess" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1', customerId)\n        await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "customerId"=$1', customerId)\n        const detail = JSON.stringify({ customerName: target.name, loginId: target.loginId || null, email: target.email || null, previousDeletedAt: locked[0].deletedAt || null, previousStoreHiddenAt: locked[0].storeHiddenAt || null })\n        await tx.$executeRawUnsafe('INSERT INTO "PlatformCustomerAccountAction" ("id","customerId","organizationId","action","operatorEmail","detailJson","createdAt") VALUES ($1,$2,$3,\\'ACCOUNT_SOFT_DELETE\\',$4,$5::jsonb,NOW())', 'pcaa_' + crypto.randomUUID(), customerId, target.organizationId, operator.subject, detail)\n      })\n      console.info('[platform-customer-account] account disabled', { customerId, organizationId: target.organizationId, operator: operator.subject })\n      redirect(res, '/platform/customers/' + encodeURIComponent(customerId), 303)\n      return true\n    }\n    if (/^\\/platform\\/customers\\/[^/]+$/.test(url.pathname)) {`,
  'platform customer account deletion endpoint',
)

source = source.replace('\n+      const targets =', '\n      const targets =')

replaceOnce(
  `      const content = customerRecordPage(row)`,
  `      const content = customerRecordPage(row, String(url.searchParams.get('error') || ''))`,
  'customer record deletion error state',
)

fs.writeFileSync(file, source)
