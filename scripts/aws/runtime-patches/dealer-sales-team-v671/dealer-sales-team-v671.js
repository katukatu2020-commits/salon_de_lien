'use strict'

const fs = require('node:fs')
const path = require('node:path')

function monthRange(value) {
  const key = value || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).format(new Date())
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(key)) throw Object.assign(new Error('対象月を正しく指定してください。'), { status: 400 })
  const [year, month] = key.split('-').map(Number)
  return { key, start: new Date(Date.UTC(year, month - 1, 1, -9)), end: new Date(Date.UTC(year, month, 1, -9)) }
}

function createDealerSalesTeam({ prisma: db, crypto, helpers: h }) {
  const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
  const admin = s => { if (s.role !== 'ADMIN') fail('管理者のみ操作できます。', 403) }
  const number = (v, max = 1000000000000) => {
    if (!/^\d+$/.test(String(v)) || !Number.isSafeInteger(Number(v)) || Number(v) > max) fail('数値を正しく入力してください。')
    return Number(v)
  }
  const text = (v, label, max = 80) => {
    const result = String(v || '').trim()
    if (!result || result.length > max) fail(label + 'を正しく入力してください。')
    return result
  }
  const audit = (tx, s, action, target) => tx.$executeRawUnsafe('INSERT INTO "DealerTeamAudit" ("id","dealerId","actorId","action","targetId") VALUES ($1,$2,$3,$4,$5)', crypto.randomUUID(), s.id, s.memberId || s.id, action, target)
  let schemaPromise
  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(671026)')
      // Split only between complete SQL statements, preserving PL/pgSQL bodies.
      const statements = fs.readFileSync(path.join(__dirname, 'dealer-sales-team-v671.sql'), 'utf8').match(/(?:[^;$]|\$\$[\s\S]*?\$\$|\$(?!\$))+;/g) || []
      for (const statement of statements) await tx.$executeRawUnsafe(statement)
    }, { timeout: 60000 }).catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }
  async function owner(dealer) {
    const existing = (await db.$queryRawUnsafe('SELECT * FROM "DealerSalesMember" WHERE "dealerId"=$1 AND "legacyOwner"', dealer.id))[0]
    if (existing) return existing
    const rows = await db.$queryRawUnsafe(`INSERT INTO "DealerSalesMember" ("id","dealerId","name","role","legacyOwner","mustChangePassword") VALUES ($1,$2,$3,'ADMIN',TRUE,FALSE) ON CONFLICT ("dealerId") WHERE "legacyOwner" DO UPDATE SET "dealerId"=EXCLUDED."dealerId" RETURNING *`, 'dealer-owner:' + dealer.id, dealer.id, dealer.representativeName || dealer.name)
    return rows[0]
  }
  async function extendSession(dealer, payload) {
    await ensureSchema()
    const m = payload.staffUserId
      ? (await db.$queryRawUnsafe('SELECT * FROM "DealerSalesMember" WHERE "id"=$1 AND "dealerId"=$2 AND "active"=TRUE AND "legacyOwner"=FALSE', payload.staffUserId, dealer.id))[0]
      : await owner(dealer)
    if (!m || (payload.staffUserId && Number(m.authVersion) !== Number(payload.staffAuthVersion))) return null
    return { ...payload, ...dealer, role: m.role, memberId: m.id, memberName: m.name, branchId: m.branchId, mustChangePassword: m.mustChangePassword, staffUserId: payload.staffUserId || null }
  }
  async function authenticate(loginId, password) {
    const dealers = await db.$queryRawUnsafe('SELECT * FROM "WholesaleDealer" WHERE "active"=TRUE AND LOWER("loginId")=LOWER($1)', loginId)
    if (dealers[0]) return h.verifyPassword(crypto, password, dealers[0].passwordHash) ? dealers[0] : null
    const rows = await db.$queryRawUnsafe(`SELECT d.*,m."id" AS "staffUserId",m."authVersion" AS "staffAuthVersion",m."passwordHash" AS "memberPasswordHash",m."mustChangePassword" FROM "DealerSalesMember" m JOIN "WholesaleDealer" d ON d."id"=m."dealerId" WHERE LOWER(m."loginId")=LOWER($1) AND m."active" AND d."active" AND NOT m."legacyOwner"`, loginId)
    const row = rows[0]
    return row && h.verifyPassword(crypto, password, row.memberPasswordHash) ? row : null
  }
  async function branch(tx, s, id) {
    if (!id) return null
    const row = (await tx.$queryRawUnsafe('SELECT * FROM "DealerSalesBranch" WHERE "id"=$1 AND "dealerId"=$2 AND "active"', String(id), s.id))[0]
    if (!row) fail('この営業所は選択できません。')
    return row.id
  }
  async function member(tx, s, id, active = true) {
    const row = (await tx.$queryRawUnsafe('SELECT * FROM "DealerSalesMember" WHERE "id"=$1 AND "dealerId"=$2' + (active ? ' AND "active"' : ''), String(id || ''), s.id))[0]
    if (!row) fail('担当者が見つかりません。', 404)
    return row
  }
  async function options(s) {
    const [members, branches, salons] = await Promise.all([
      db.$queryRawUnsafe('SELECT "id","name","role","branchId","active","legacyOwner" FROM "DealerSalesMember" WHERE "dealerId"=$1 ORDER BY "legacyOwner" DESC,"createdAt","id"', s.id),
      db.$queryRawUnsafe('SELECT "id","name","active" FROM "DealerSalesBranch" WHERE "dealerId"=$1 ORDER BY "name","id"', s.id),
      db.$queryRawUnsafe(`SELECT c."id",c."organizationId",o."name",c."status",c."salesMemberId",c."salesBranchId",c."billingClosingDay",c."approvedAt" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" WHERE c."dealerId"=$1 ORDER BY o."name",c."id"`, s.id),
    ])
    return { members, branches, salons, viewer: { role: s.role, memberId: s.memberId, name: s.memberName } }
  }
  async function team(s) {
    admin(s)
    const result = await options(s)
    result.members = await db.$queryRawUnsafe('SELECT m."id",m."name",COALESCE(m."loginId",d."loginId") AS "loginId",m."role",m."branchId",m."active",m."legacyOwner",m."mustChangePassword" FROM "DealerSalesMember" m JOIN "WholesaleDealer" d ON d."id"=m."dealerId" WHERE m."dealerId"=$1 ORDER BY m."legacyOwner" DESC,m."createdAt",m."id"', s.id)
    return result
  }
  async function saveMember(s, p) {
    admin(s)
    return db.$transaction(async tx => {
      const branchId = await branch(tx, s, p.branchId)
      const name = text(p.name, '氏名')
      const role = p.role === 'ADMIN' ? 'ADMIN' : p.role === 'STAFF' ? 'STAFF' : fail('区分を選択してください。')
      if (p.id) {
        const old = await member(tx, s, p.id, false)
        const active = p.active !== false
        if (old.legacyOwner && (!active || role !== 'ADMIN')) fail('代表管理者の停止・権限変更はできません。')
        if (old.id === s.memberId && (!active || role !== 'ADMIN')) fail('自分の停止・権限変更は別の管理者に依頼してください。')
        await tx.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "name"=$1,"role"=$2,"branchId"=$3,"active"=$4,"authVersion"="authVersion"+1 WHERE "id"=$5', name, role, branchId, active, old.id)
        await audit(tx, s, 'MEMBER_UPDATED', old.id)
        return { id: old.id }
      }
      const loginId = text(p.loginId, 'ログインID').toLowerCase()
      if (!/^[a-z0-9][a-z0-9._-]{3,79}$/.test(loginId)) fail('ログインIDは4〜80文字の半角英数字・ピリオド・ハイフン・アンダースコアで入力してください。')
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-login:' || $1,0))", loginId)
      const used = await tx.$queryRawUnsafe('SELECT "id" FROM "WholesaleDealer" WHERE LOWER("loginId")=$1 UNION ALL SELECT "id" FROM "DealerSalesMember" WHERE LOWER("loginId")=$1', loginId)
      if (used.length) fail('このログインIDは使用されています。', 409)
      const password = crypto.randomBytes(15).toString('base64url') + 'A1!'
      const id = crypto.randomUUID()
      await tx.$executeRawUnsafe('INSERT INTO "DealerSalesMember" ("id","dealerId","name","loginId","passwordHash","role","branchId") VALUES ($1,$2,$3,$4,$5,$6,$7)', id, s.id, name, loginId, h.hashPassword(crypto, password), role, branchId)
      await audit(tx, s, 'MEMBER_CREATED', id)
      return { id, loginId, initialPassword: password }
    })
  }
  async function resetPassword(s, p) {
    admin(s)
    return db.$transaction(async tx => {
      const row = await member(tx, s, p.id)
      if (row.legacyOwner) fail('代表管理者はパスワード変更画面をご利用ください。')
      const password = crypto.randomBytes(15).toString('base64url') + 'A1!'
      await tx.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "passwordHash"=$1,"authVersion"="authVersion"+1,"mustChangePassword"=TRUE WHERE "id"=$2', h.hashPassword(crypto, password), row.id)
      await audit(tx, s, 'PASSWORD_RESET', row.id)
      return { loginId: row.loginId, initialPassword: password }
    })
  }
  async function changePassword(s, p) {
    if (!s.staffUserId) fail('パスワード変更画面をご利用ください。')
    const next = String(p.newPassword || '')
    if (next.length < 10 || next.length > 72 || next !== p.newPasswordConfirm || next === p.currentPassword) fail('新しいパスワードを10〜72文字で入力し、確認欄と一致させてください。')
    await db.$transaction(async tx => {
      const m = (await tx.$queryRawUnsafe('SELECT * FROM "DealerSalesMember" WHERE "id"=$1 AND "dealerId"=$2 AND "active" FOR UPDATE', s.staffUserId, s.id))[0]
      if (!m || !h.verifyPassword(crypto, String(p.currentPassword || ''), m.passwordHash)) fail('現在のパスワードが正しくありません。')
      await tx.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "passwordHash"=$1,"authVersion"="authVersion"+1,"mustChangePassword"=FALSE WHERE "id"=$2', h.hashPassword(crypto, next), m.id)
      await audit(tx, s, 'PASSWORD_CHANGED', m.id)
    })
    return { changed: true }
  }
  async function saveBranch(s, p) {
    admin(s)
    const name = text(p.name, '営業所名')
    return db.$transaction(async tx => {
      const id = p.id ? await branch(tx, s, p.id) : crypto.randomUUID()
      const duplicate = await tx.$queryRawUnsafe('SELECT "id" FROM "DealerSalesBranch" WHERE "dealerId"=$1 AND "name"=$2 AND "id"<>$3', s.id, name, id)
      if (duplicate.length) fail('同じ名前の営業所があります。', 409)
      await tx.$executeRawUnsafe('INSERT INTO "DealerSalesBranch" ("id","dealerId","name") VALUES ($1,$2,$3) ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name"', id, s.id, name)
      await audit(tx, s, 'BRANCH_SAVED', id)
      return { id }
    })
  }
  async function assign(s, p) {
    admin(s)
    return db.$transaction(async tx => {
      const c = (await tx.$queryRawUnsafe('SELECT * FROM "WholesaleDealerContract" WHERE "id"=$1 AND "dealerId"=$2 FOR UPDATE', String(p.id), s.id))[0]
      if (!c) fail('契約美容室が見つかりません。', 404)
      const m = await member(tx, s, p.memberId)
      const branchId = await branch(tx, s, p.branchId || m.branchId)
      const closing = number(p.closingDay, 31)
      if (!closing) fail('締日を選択してください。')
      await tx.$executeRawUnsafe('UPDATE "WholesaleDealerContract" SET "salesMemberId"=$1,"salesBranchId"=$2,"billingClosingDay"=$3,"acquisitionMemberId"=COALESCE("acquisitionMemberId",$1),"acquisitionBranchId"=CASE WHEN "acquisitionMemberId" IS NULL THEN $2 ELSE "acquisitionBranchId" END,"updatedAt"=NOW() WHERE "id"=$4', m.id, branchId, closing, c.id)
      // Only unassigned historical orders are attributed on initial setup.
      await tx.$executeRawUnsafe('UPDATE "WholesaleOrder" SET "salesMemberId"=$1,"salesBranchId"=$2,"billingClosingDay"=$3 WHERE "dealerId"=$4 AND "organizationId"=$5 AND "salesMemberId" IS NULL', m.id, branchId, closing, s.id, c.organizationId)
      await audit(tx, s, 'SALON_ASSIGNED', c.id)
      return { id: c.id }
    })
  }
  async function saveGoal(s, p) {
    admin(s)
    const range = monthRange(p.month)
    const m = await member(db, s, p.memberId)
    const sales = number(p.salesTargetYen), acquisition = number(p.acquisitionTarget, 999999)
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('INSERT INTO "DealerSalesGoal" ("memberId","monthKey","salesTargetYen","acquisitionTarget") VALUES ($1,$2,$3,$4) ON CONFLICT ("memberId","monthKey") DO UPDATE SET "salesTargetYen"=$3,"acquisitionTarget"=$4,"updatedAt"=NOW()', m.id, range.key, sales, acquisition)
      await audit(tx, s, 'GOAL_SAVED', m.id + ':' + range.key)
    })
    return { saved: true }
  }
  async function claimContract(s, id) {
    if (!s.memberId) return
    await db.$executeRawUnsafe('UPDATE "WholesaleDealerContract" SET "salesMemberId"=COALESCE("salesMemberId",$1),"salesBranchId"=CASE WHEN "salesMemberId" IS NULL THEN $2 ELSE "salesBranchId" END,"acquisitionMemberId"=COALESCE("acquisitionMemberId",$1),"acquisitionBranchId"=CASE WHEN "acquisitionMemberId" IS NULL THEN $2 ELSE "acquisitionBranchId" END WHERE "id"=$3 AND "dealerId"=$4', s.memberId, s.branchId || null, id, s.id)
  }
  async function report(s, query) {
    const r = monthRange(query.get('month'))
    const params = [s.id, r.start, r.end]
    const filters = [], contractFilters = []
    const add = (value, orderField, contractField = orderField) => {
      if (!value) return
      params.push(value)
      filters.push(`o."${orderField}"=$${params.length}`)
      contractFilters.push(`c."${contractField}"=$${params.length}`)
    }
    add(query.get('salon'), 'organizationId')
    add(s.role === 'ADMIN' ? query.get('member') : s.memberId, 'salesMemberId', 'acquisitionMemberId')
    add(query.get('branch'), 'salesBranchId', 'acquisitionBranchId')
    const closing = query.get('closing')
    if (closing) add(number(closing, 31), 'billingClosingDay')
    const where = filters.length ? ' AND ' + filters.join(' AND ') : ''
    const delivered = `o."status"='DELIVERED' AND o."deliveredAt">=$2 AND o."deliveredAt"<$3`
    const ordered = `o."orderedAt">=$2 AND o."orderedAt"<$3`
    const cte = `WITH filtered AS (SELECT o.*,(${delivered}) AS actual,(${ordered}) AS forecast FROM "WholesaleOrder" o WHERE o."dealerId"=$1 AND o."status"<>'CANCELLED' AND ((${delivered}) OR (${ordered}))${where}) `
    const [summary, categories, salons, progress] = await Promise.all([
      db.$queryRawUnsafe(cte + `SELECT COALESCE(SUM("subtotalYen") FILTER(WHERE actual),0)::float8 AS "actualYen",COALESCE(SUM("subtotalYen") FILTER(WHERE forecast),0)::float8 AS "forecastYen",COUNT(*) FILTER(WHERE actual)::int AS "deliveredCount",COUNT(*) FILTER(WHERE forecast)::int AS "orderCount",COUNT(*) FILTER(WHERE "salesMemberId" IS NULL)::int AS "unassignedCount" FROM filtered`, ...params),
      db.$queryRawUnsafe(cte + `SELECT COALESCE(NULLIF(l."category",''),'未分類') AS category,COALESCE(SUM(l."lineTotal") FILTER(WHERE o.actual),0)::float8 AS "actualYen",COALESCE(SUM(l."lineTotal") FILTER(WHERE o.forecast),0)::float8 AS "forecastYen" FROM filtered o JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" GROUP BY 1 ORDER BY "actualYen" DESC,category`, ...params),
      db.$queryRawUnsafe(cte + `SELECT o."organizationId" AS id,s."name",COALESCE(SUM(o."subtotalYen") FILTER(WHERE actual),0)::float8 AS "actualYen",COALESCE(SUM(o."subtotalYen") FILTER(WHERE forecast),0)::float8 AS "forecastYen",COUNT(*) FILTER(WHERE actual)::int AS "count" FROM filtered o JOIN "Organization" s ON s."id"=o."organizationId" GROUP BY 1,2 ORDER BY "actualYen" DESC,s."name"`, ...params),
      db.$queryRawUnsafe(cte + `,sales AS (SELECT "salesMemberId",COALESCE(SUM("subtotalYen") FILTER(WHERE actual),0)::float8 AS actual,COALESCE(SUM("subtotalYen") FILTER(WHERE forecast),0)::float8 AS forecast FROM filtered GROUP BY 1),acquisitions AS (SELECT c."acquisitionMemberId",COUNT(*)::int AS count FROM "WholesaleDealerContract" c WHERE c."dealerId"=$1 AND c."approvedAt">=$2 AND c."approvedAt"<$3${contractFilters.length ? ' AND ' + contractFilters.join(' AND ') : ''} GROUP BY 1) SELECT m."id",m."name",m."branchId",m."active",COALESCE(g."salesTargetYen",0)::float8 AS "salesTargetYen",COALESCE(g."acquisitionTarget",0)::int AS "acquisitionTarget",COALESCE(s.actual,0)::float8 AS "actualYen",COALESCE(s.forecast,0)::float8 AS "forecastYen",COALESCE(a.count,0)::int AS "acquisitionCount" FROM "DealerSalesMember" m LEFT JOIN sales s ON s."salesMemberId"=m."id" LEFT JOIN acquisitions a ON a."acquisitionMemberId"=m."id" LEFT JOIN "DealerSalesGoal" g ON g."memberId"=m."id" AND g."monthKey"=$${params.length + 1} WHERE m."dealerId"=$1${s.role !== 'ADMIN' ? ' AND m."id"=$' + (params.length + 2) : ''} ORDER BY m."active" DESC,m."name",m."id"`, ...params, r.key, ...(s.role !== 'ADMIN' ? [s.memberId] : [])),
    ])
    const visibleProgress = progress.filter(m => (!query.get('member') || s.role !== 'ADMIN' || m.id === query.get('member')) && (!query.get('branch') || m.branchId === query.get('branch') || m.actualYen || m.forecastYen || m.acquisitionCount))
    return { month: r.key, summary: summary[0], categories, salons, progress: visibleProgress }
  }
  function page(s, view) {
    return h.portal(s, view).replace('/wholesale-ordering-client-v543.js?v=659-product-search-filters1', '/dealer-sales-team-v671-client.js?v=671-1').replace('</head>', '<link rel="stylesheet" href="/password-visibility-v627.css?v=627-release1"></head>')
  }
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/$/, '')
    const asset = { '/dealer-sales-team-v671-client.js': ['dealer-sales-team-v671-client.js','application/javascript'], '/dealer-sales-team-v671-nav.js': ['dealer-sales-team-v671-nav.js','application/javascript'], '/dealer-sales-team-v671.css': ['dealer-sales-team-v671.css','text/css'] }[p]
    if (asset && req.method === 'GET') { res.setHeader('Content-Type', asset[1] + '; charset=utf-8'); res.setHeader('Cache-Control','public,max-age=31536000,immutable'); res.end(fs.readFileSync(path.join(__dirname, asset[0]))); return true }
    if (!p.startsWith('/dealer/') && !p.startsWith('/api/dealer/')) return false
    if (p.startsWith('/api/dealer/auth/') || p === '/dealer/login' || p.startsWith('/dealer/password-reset')) return false
    const s = await h.session(req)
    const view = { '/dealer/sales':'sales', '/dealer/targets':'targets', '/dealer/team':'team' }[p]
    const ownPassword = p === '/dealer/password-change' && s?.staffUserId
    const api = p.startsWith('/api/dealer/team/') || p === '/api/dealer/sales' || p === '/api/dealer/staff-password-change'
    if (!s) {
      if (view || api) { if (api) h.json(res,401,{ok:false,error:'ログインし直してください。'}); else h.redirect(res,'/dealer/login',302); return true }
      return false
    }
    try {
      if (s.mustChangePassword && s.staffUserId && !ownPassword && p !== '/api/dealer/staff-password-change') {
        if (p.startsWith('/api/')) h.json(res,428,{ok:false,error:'初期パスワードを変更してください。',redirect:'/dealer/password-change'}); else h.redirect(res,'/dealer/password-change',302)
        return true
      }
      if (req.method === 'POST' && (p === '/api/dealer/profile' || p === '/api/dealer/calendar/targets')) admin(s)
      if ((view || ownPassword) && req.method === 'GET') { if (view === 'team') admin(s); h.html(res,200,page(s,ownPassword ? 'staff-password' : view)); return true }
      if (!api) return false
      if (req.method === 'GET') {
        const result = p === '/api/dealer/sales' ? await report(s,url.searchParams) : p === '/api/dealer/team/options' ? await options(s) : p === '/api/dealer/team/data' ? await team(s) : fail('ページが見つかりません。',404)
        h.json(res,200,{ok:true,...result}); return true
      }
      if (req.method !== 'POST') fail('この操作は許可されていません。',405)
      if (!h.sameOrigin(req)) fail('送信元を確認できませんでした。',403)
      const payload = await h.readPayload(req)
      let result
      if (p === '/api/dealer/staff-password-change') {
        if (!h.allowAttempt(req,'staff-password',s.staffUserId || s.id)) fail('しばらく待ってからお試しください。',429)
        result = await changePassword(s,payload); res.setHeader('Set-Cookie',h.expiredCookie(req))
      } else {
        const action = { '/api/dealer/team/member':saveMember, '/api/dealer/team/reset-password':resetPassword, '/api/dealer/team/branch':saveBranch, '/api/dealer/team/assignment':assign, '/api/dealer/team/goal':saveGoal }[p]
        if (!action) fail('ページが見つかりません。',404)
        result = await action(s,payload)
      }
      h.json(res,200,{ok:true,...result}); return true
    } catch (error) {
      if (!error.status) console.error('[dealer-sales-team-v671]', { path:p, error:error.message })
      h.json(res,error.status || 500,{ok:false,error:error.status ? error.message : '保存できませんでした。入力内容を確認してもう一度お試しください。'}); return true
    }
  }
  return { ensureSchema, extendSession, authenticate, handle, report, team, saveMember, saveBranch, assign, saveGoal, resetPassword, changePassword, claimContract }
}
module.exports = { createDealerSalesTeam, monthRange }
