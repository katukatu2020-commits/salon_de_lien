import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const source=path.dirname(fileURLToPath(import.meta.url))
function replace(file,before,after,count=1) {
  const target=path.join(root,file), content=fs.readFileSync(target,'utf8')
  if(content.split(before).length-1!==count) throw new Error(`Unexpected parent anchor ${file}: ${before.slice(0,150)}`)
  fs.writeFileSync(target,content.replaceAll(before,after))
}
for(const file of ['dealer-sales-team-v671.js','dealer-sales-team-v671-client.js','dealer-sales-team-v671-nav.js','dealer-sales-team-v671.css']) fs.copyFileSync(path.join(source,file),path.join(root,file))
fs.copyFileSync(path.join(source,'schema.sql'),path.join(root,'dealer-sales-team-v671.sql'))
const w='wholesale-ordering-v543.js'
const navAssets='<link rel="stylesheet" href="/dealer-sales-team-v671.css?v=671-1"><script src="/dealer-sales-team-v671-nav.js?v=671-1" defer></script>'
replace(w,'href="/dealer-monthly-calendar-v658.css?v=658-release1"></head>','href="/dealer-monthly-calendar-v658.css?v=658-release1">'+navAssets+'</head>')
replace(w,'  const authAttempts = new Map()',`  const authAttempts = new Map()
  const salesTeamV671 = require('./dealer-sales-team-v671.js').createDealerSalesTeam({ prisma, crypto, helpers: { verifyPassword: verifyDealerPassword, hashPassword: dealerPasswordHash, session: dealerSession, portal: dealerPortalPage, sameOrigin: validSameOrigin, readPayload, json, html, redirect, expiredCookie: expiredSessionCookie, allowAttempt: allowAuthAttempt } })`)
replace(w,'    })().catch(error => {\n      schemaPromise = null','      await salesTeamV671.ensureSchema()\n    })().catch(error => {\n      schemaPromise = null')
replace(w,'    return { ...payload, ...rows[0] }','    return salesTeamV671.extendSession(rows[0], payload)')
replace(w,'    loginId: dealer.loginId,\n    authVersion:', '    loginId: dealer.loginId,\n    staffUserId: dealer.staffUserId || null,\n    staffAuthVersion: dealer.staffAuthVersion || null,\n    authVersion:')
replace(w,"    const isWholesaleRoute = pathname.startsWith('/api/admin/wholesale')", "    if (pathname.startsWith('/dealer-sales-team-v671')) return salesTeamV671.handle(req, res, url)\n    const isWholesaleRoute = pathname.startsWith('/api/admin/wholesale')")
replace(w,'    await ensureSchema()\n\n    if (pathname', '    await ensureSchema()\n    if (await salesTeamV671.handle(req, res, url)) return true\n\n    if (pathname')
replace(w,`        const rows = await prisma.$queryRawUnsafe('SELECT "id","name","loginId","email","passwordHash","authVersion" FROM "WholesaleDealer" WHERE "active"=TRUE AND LOWER("loginId")=LOWER($1) LIMIT 1', loginId)
        if (!rows[0] || !verifyDealerPassword(crypto, password, rows[0].passwordHash)) { redirect(res, '/dealer/login?error=invalid'); return true }
        res.setHeader('Set-Cookie', sessionCookie(req, signedDealerSession(crypto, rows[0])))
        redirect(res, '/dealer/orders'); return true`, `        if (!allowAuthAttempt(req, 'login', loginId)) { redirect(res, '/dealer/login?error=invalid'); return true }
        const dealer = await salesTeamV671.authenticate(loginId, password)
        if (!dealer) { redirect(res, '/dealer/login?error=invalid'); return true }
        authAttempts.delete(clientAddress(req) + ':login:' + loginId)
        res.setHeader('Set-Cookie', sessionCookie(req, signedDealerSession(crypto, dealer)))
        redirect(res, dealer.staffUserId && dealer.mustChangePassword ? '/dealer/password-change' : '/dealer/orders'); return true`)
replace(w,"  const pages = {\n    calendar:", `  const pages = {
    sales: { title: '月次売上', eyebrow: 'MONTHLY SALES', description: 'カテゴリー・請求先別の売上実績と受注見込み' },
    targets: { title: '目標・進捗', eyebrow: 'SALES PERFORMANCE', description: '担当者別の月次売上と新規獲得実績' },
    team: { title: 'スタッフ・営業所', eyebrow: 'TEAM MANAGEMENT', description: 'ログインアカウント・営業所・サロン担当・請求締日' },
    'staff-password': { title: 'パスワード変更', eyebrow: 'ACCOUNT SECURITY', description: '個人アカウントのパスワード' },
    calendar:`)
replace(w,"    ['calendar', '/dealer/calendar', 'calendar', '月次売上'],",`    ['sales', '/dealer/sales', 'calendar', '月次売上'],
    ['targets', '/dealer/targets', 'percent', '目標・進捗'],
    ...(dealer.role !== 'STAFF' ? [['team', '/dealer/team', 'users', 'スタッフ・営業所']] : []),
    ['calendar', '/dealer/calendar', 'calendar', '売上カレンダー'],`)
replace(w,'${escapeHtml(dealer.name)}</span></header><main', '${escapeHtml(dealer.name)} / ${escapeHtml(dealer.memberName || dealer.name)}</span></header><main')
replace(w,'運営から発行された事業者アカウントでログインしてください。','運営または所属先の管理者から発行されたアカウントでログインしてください。')
replace(w,'<span>運営発行ID</span>','<span>ログインID</span>')
replace(w,'placeholder="運営から案内されたID"','placeholder="発行されたログインID"')
replace(w,'    return { organization: { id: organization.id, name: organization.name, publicCode: organization.publicCode }, contract: rows[0] }','    await salesTeamV671.claimContract(session, rows[0].id)\n    return { organization: { id: organization.id, name: organization.name, publicCode: organization.publicCode }, contract: rows[0] }')
replace(w,'    return { approved: true }','    await salesTeamV671.claimContract(session, contractId)\n    return { approved: true }')
replace(w,"if (timestamp.includes('$8')) updateParams.push(session.name)","if (timestamp.includes('$8')) updateParams.push(session.memberName || session.name)")
replace(w,'orderId, target, session.id, session.name, JSON.stringify({ previousStatus:', 'orderId, target, session.memberId || session.id, session.memberName || session.name, JSON.stringify({ previousStatus:')
const approvals='business-account-approvals-v643.js'
replace(approvals,'href="/wholesale-ordering-v543.css?v=653-password-layout1"></head>','href="/wholesale-ordering-v543.css?v=653-password-layout1">'+navAssets+'</head>')
replace(approvals,"  const nav = [\n    ['orders', '/dealer/orders', 'clipboard', '受注管理'],",`  const nav = [
    ['sales', '/dealer/sales', 'percent', '月次売上'],
    ['targets', '/dealer/targets', 'percent', '目標・進捗'],
    ['team', '/dealer/team', 'users', 'スタッフ・営業所'],
    ['calendar', '/dealer/calendar', 'clipboard', '売上カレンダー'],
    ['orders', '/dealer/orders', 'clipboard', '受注管理'],`)
replace(approvals,"    if (!liveSession || !access) return false\n    if (pathname === '/dealer/password-change'", "    if (!liveSession || !access) return false\n    if (session.staffUserId) return false /* dealer-sales-team-v671-member-password */\n    if (pathname === '/dealer/password-change'")
replace('server.js',"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Orimia-Store-Directory', 'v670') /* orimia-store-directory-v670-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Orimia-Store-Directory', 'v670') /* orimia-store-directory-v670-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Sales-Team', 'v671') /* dealer-sales-team-v671-ready */")
console.log('Dealer sales and team v671 runtime patched')
