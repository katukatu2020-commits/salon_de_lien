'use strict'

const fs = require('fs')
const path = require('path')
const icons = require('./admin-chat-icons-v589')
const ROUTE = '/admin/customers/messages/chat'
const PAGE_SIZE = 25
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const first = value => String(Array.isArray(value) ? value[0] || '' : value || '')

function parameters(input = {}) {
  const value = key => first(input instanceof URLSearchParams ? input.get(key) : input[key])
  const page = Number(value('page'))
  return {
    q:value('q').normalize('NFKC').trim().slice(0, 100),
    unread:['1','true'].includes(value('unread')),
    staff:value('staff').slice(0, 150),
    page:Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1,
    threadId:value('threadId').slice(0, 200),
    customerId:value('customerId').slice(0, 200),
  }
}

function urlFor(input, changes = {}) {
  const p = { ...input, ...changes }
  const search = new URLSearchParams()
  if (p.q) search.set('q', p.q)
  if (p.unread) search.set('unread', '1')
  if (p.staff) search.set('staff', p.staff)
  if (p.page > 1) search.set('page', String(p.page))
  if (p.threadId) search.set('threadId', p.threadId)
  else if (p.customerId) search.set('customerId', p.customerId)
  return ROUTE + (search.size ? '?' + search.toString() : '')
}

const joins = `FROM "ChatThread" t
  JOIN "Customer" c ON c."id"=t."customerId" AND c."organizationId"=t."organizationId"
  LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=t."organizationId"
  LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey"`
const visible = `t."organizationId"=$1 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL`
const unread = `EXISTS (SELECT 1 FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"='customer' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt"))`
const identity = `c."name" AS "registeredName",COALESCE(NULLIF(r."realName",''),c."name") AS "customerName",c."phone",COALESCE(NULLIF(s."staffName",''),t."staffName") AS "staffName"`
const normalName = column => `regexp_replace(lower(normalize(COALESCE(${column},''), NFKC)), '[[:space:]　]+', '', 'g')`

function searchWhere(params) {
  const compact = params.q.replace(/[\s　]/g, '').toLocaleLowerCase('ja-JP')
  const literal = compact.replace(/[\\%_]/g, '\\$&')
  const phone = /^[+()\d\s-]+$/.test(params.q) ? params.q.replace(/\D/g, '') : ''
  return {
    sql:`${visible} AND ($2='' OR ${normalName('c."name"')} LIKE $2 ESCAPE E'\\\\' OR ${normalName('r."realName"')} LIKE $2 ESCAPE E'\\\\'
      OR ($3<>'' AND regexp_replace(normalize(COALESCE(c."phone",''), NFKC), '[^0-9]', '', 'g') LIKE '%'||$3||'%'))
      AND ($4='' OR t."staffKey"=$4)`,
    values:[literal ? '%' + literal + '%' : '', phone, params.staff],
  }
}

async function loadInbox(db, organizationId, input) {
  if (!organizationId) throw new Error('An organization is required')
  const params = parameters(input)
  const where = searchWhere(params)
  const values = [organizationId, ...where.values]
  const [statsRows, staff] = await Promise.all([
    db.$queryRawUnsafe(`SELECT COUNT(*)::int AS "allCount",COUNT(*) FILTER (WHERE ${unread})::int AS "unreadCount" ${joins} WHERE ${where.sql}`, ...values),
    db.$queryRawUnsafe(`SELECT t."staffKey" AS "key",MAX(COALESCE(NULLIF(s."staffName",''),t."staffName")) AS "name" ${joins} WHERE ${visible} GROUP BY t."staffKey" ORDER BY "name",t."staffKey"`, organizationId),
  ])
  const stats = statsRows[0] || { allCount:0, unreadCount:0 }
  const total = params.unread ? stats.unreadCount : stats.allCount
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  params.page = Math.min(params.page, pages)
  // Fetch message previews/counts only for the current page, not every thread.
  const rows = await db.$queryRawUnsafe(`WITH page AS (
    SELECT t."id",t."customerId",t."staffKey",t."updatedAt",t."staffLastReadAt",${identity}
    ${joins} WHERE ${where.sql}${params.unread ? ' AND ' + unread : ''}
    ORDER BY t."updatedAt" DESC,t."id" DESC LIMIT $5 OFFSET $6
  ) SELECT p.*,latest."body" AS "latestBody",latest."createdAt" AS "latestAt",
    (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=p."id" AND m."senderType"='customer' AND (p."staffLastReadAt" IS NULL OR m."createdAt">p."staffLastReadAt")) AS "unreadCount"
    FROM page p LEFT JOIN LATERAL (SELECT m."body",m."createdAt" FROM "ChatMessage" m WHERE m."threadId"=p."id" ORDER BY m."createdAt" DESC,m."id" DESC LIMIT 1) latest ON TRUE
    ORDER BY p."updatedAt" DESC,p."id" DESC`, ...values, PAGE_SIZE, (params.page - 1) * PAGE_SIZE)
  return { params, rows, total, pages, stats, staff }
}

async function findSelectedThread(db, organizationId, input) {
  if (!organizationId) throw new Error('An organization is required')
  const params = parameters(input)
  if (!params.threadId && !params.customerId) return null
  const rows = await db.$queryRawUnsafe(`SELECT t.*,${identity} ${joins} WHERE ${visible}
    AND ${params.threadId ? 't."id"' : 't."customerId"'}=$2 ORDER BY t."updatedAt" DESC,t."id" DESC LIMIT 1`, organizationId, params.threadId || params.customerId)
  return rows[0] || null
}

async function ensureIndexes(db) {
  await db.$executeRawUnsafe('CREATE INDEX CONCURRENTLY IF NOT EXISTS "ChatThread_inbox_updated_v589" ON "ChatThread" ("organizationId","updatedAt" DESC,"id" DESC)')
  await db.$executeRawUnsafe('CREATE INDEX CONCURRENTLY IF NOT EXISTS "ChatMessage_inbox_latest_v589" ON "ChatMessage" ("threadId","createdAt" DESC,"id" DESC)')
}

function timeLabel(value, now = new Date()) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const dateKey = d => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Tokyo', year:'numeric',month:'2-digit',day:'2-digit' }).format(d)
  const today = dateKey(now), day = dateKey(date)
  return new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', ...(day === today ? {hour:'2-digit',minute:'2-digit'} : today.slice(0,4) === day.slice(0,4) ? {month:'numeric',day:'numeric'} : {year:'2-digit',month:'numeric',day:'numeric'}) }).format(date)
}

function iconButton(icon, label, attributes = '') {
  return `<button class="inbox-icon-button" title="${label}" aria-label="${label}" ${attributes}>${icons[icon]}</button>`
}

function renderResults(data) {
  const { params, rows, total, pages } = data
  const from = total ? (params.page - 1) * PAGE_SIZE + 1 : 0
  const count = `${total.toLocaleString('ja-JP')}件`
  return `<div class="inbox-result-summary" role="status" aria-live="polite"><span>${params.q || params.unread || params.staff ? '検索結果' : 'すべての会話'} <strong>${count}</strong></span><span>更新順</span></div>
    <div class="inbox-scroll" tabindex="0" aria-label="会話一覧"><ul class="inbox-rows">${rows.map(row => {
      const selected = params.threadId === row.id
      const label = `${row.customerName} / 担当 ${row.staffName || '未設定'}${row.unreadCount ? ' / 未読' + row.unreadCount + '件' : ''}`
      return `<li><a class="inbox-row${selected ? ' is-selected' : ''}${row.unreadCount ? ' is-unread' : ''}" href="${escapeHtml(urlFor(params, {threadId:row.id,customerId:''}))}" data-inbox-thread="${escapeHtml(row.id)}" aria-label="${escapeHtml(label)}"${selected ? ' aria-current="page"' : ''}>
        <span class="inbox-row-top"><strong title="${escapeHtml(row.customerName)}">${escapeHtml(row.customerName)}</strong><time${row.latestAt ? ' datetime="' + new Date(row.latestAt).toISOString() + '"' : ''}>${escapeHtml(timeLabel(row.latestAt))}</time></span>
        <span class="inbox-row-detail" title="${escapeHtml([row.registeredName !== row.customerName ? '登録名 '+row.registeredName : '',row.phone,'担当 '+(row.staffName || '未設定')].filter(Boolean).join(' / '))}">${escapeHtml([row.phone || '電話番号未登録','担当 '+(row.staffName || '未設定')].join(' / '))}</span>
        <span class="inbox-row-bottom"><span class="inbox-preview" title="${escapeHtml(row.latestBody || '')}">${escapeHtml(row.latestBody || 'メッセージはありません')}</span>${row.unreadCount ? `<span class="inbox-unread" aria-label="未読${row.unreadCount}件">${row.unreadCount > 99 ? '99+' : row.unreadCount}</span>` : ''}</span>
      </a></li>`
    }).join('')}</ul>${!rows.length ? `<div class="inbox-empty">${icons.search}<strong>${params.q || params.unread || params.staff ? '該当する会話はありません' : '会話はまだありません'}</strong>${params.q || params.unread || params.staff ? '<button type="button" data-inbox-reset>絞り込みを解除</button>' : ''}</div>` : ''}</div>
    <nav class="inbox-pagination" aria-label="会話一覧のページ"><span>${from.toLocaleString('ja-JP')}–${Math.min(params.page * PAGE_SIZE,total).toLocaleString('ja-JP')} / ${count}</span><div>${params.page > 1 ? `<a class="inbox-icon-button" title="前の25件" aria-label="前の25件" data-inbox-page="${params.page - 1}" href="${escapeHtml(urlFor(params,{page:params.page-1}))}">${icons.previous}</a>` : '<span class="inbox-icon-button is-disabled" aria-hidden="true">'+icons.previous+'</span>'}<span class="inbox-page-number">${params.page} / ${pages}</span>${params.page < pages ? `<a class="inbox-icon-button" title="次の25件" aria-label="次の25件" data-inbox-page="${params.page + 1}" href="${escapeHtml(urlFor(params,{page:params.page+1}))}">${icons.next}</a>` : '<span class="inbox-icon-button is-disabled" aria-hidden="true">'+icons.next+'</span>'}</div></nav>`
}

function renderInbox(data) {
  const { params, stats, staff } = data
  return `<div class="inbox-header"><h2>チャット</h2><a class="inbox-customer-link" href="/admin/customers">顧客一覧${icons.next}</a></div>
    <form class="inbox-search-form" action="${ROUTE}" method="get" role="search" aria-label="顧客チャット検索">
      ${params.threadId ? '<input type="hidden" name="threadId" value="'+escapeHtml(params.threadId)+'">' : params.customerId ? '<input type="hidden" name="customerId" value="'+escapeHtml(params.customerId)+'">' : ''}
      <div class="inbox-search-field"><label class="inbox-sr-only" for="inbox-query">顧客名・電話番号</label><input id="inbox-query" name="q" type="search" value="${escapeHtml(params.q)}" placeholder="顧客名・電話番号で検索" maxlength="100" autocomplete="off">${iconButton('close','検索文字を消去','type="button" data-inbox-clear'+(!params.q ? ' hidden' : ''))}${iconButton('search','検索','type="submit"')}</div>
      <fieldset class="inbox-filters"><legend class="inbox-sr-only">既読・未読</legend><label><input type="radio" name="unread" value="0"${!params.unread ? ' checked' : ''}><span>すべて <b data-inbox-all-count>${stats.allCount}</b></span></label><label><input type="radio" name="unread" value="1"${params.unread ? ' checked' : ''}><span>未読 <b data-inbox-unread-count>${stats.unreadCount}</b></span></label></fieldset>
      <div class="inbox-staff-field"><label for="inbox-staff">担当者</label><select id="inbox-staff" name="staff"><option value="">すべての担当者</option>${staff.map(row => `<option value="${escapeHtml(row.key)}"${params.staff === row.key ? ' selected' : ''}>${escapeHtml(row.name || '未設定')}</option>`).join('')}${params.staff && !staff.some(row=>row.key===params.staff) ? '<option value="'+escapeHtml(params.staff)+'" selected>対象の担当者なし</option>' : ''}</select></div>
    </form><div class="inbox-error" role="alert" hidden></div><div class="inbox-results" data-inbox-results>${renderResults(data)}</div>`
}

function createService({ prisma, staffSession }) {
  return { async handle(req, res, url) {
    const files = {'/admin-chat-search-v589.css':'text/css','/admin-chat-search-client-v589.js':'application/javascript'}
    if (files[url.pathname]) {
      if (!['GET','HEAD'].includes(req.method)) return false
      res.writeHead(200, {'Content-Type':files[url.pathname]+'; charset=utf-8','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'})
      res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname,path.basename(url.pathname))))
      return true
    }
    if (url.pathname !== '/api/admin/chat/inbox') return false
    const send = (status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'});res.end(JSON.stringify(body));return true }
    if (req.method !== 'GET') { res.setHeader('Allow','GET');return send(405,{error:'この操作には対応していません。'}) }
    const session = await staffSession(req)
    if (!session?.organizationId || !['ADMIN','STAFF'].includes(session.role)) return send(401,{error:'ログインし直してください。'})
    try {
      const data = await loadInbox(prisma,session.organizationId,url.searchParams)
      return send(200,{html:renderResults(data),stats:data.stats,params:data.params,total:data.total})
    } catch (error) {
      console.error('[admin-chat-search-v589] inbox query failed', error.code || error.name)
      return send(500,{error:'検索できませんでした。もう一度お試しください。'})
    }
  }}
}

module.exports = { parameters,urlFor,loadInbox,findSelectedThread,ensureIndexes,renderInbox,renderResults,createService,icons,PAGE_SIZE,timeLabel }
