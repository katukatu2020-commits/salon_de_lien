'use strict'

const crypto = require('node:crypto')
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const normalizeName = value => String(value || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
const id = value => String(value || '').trim().slice(0, 200)
const privileged = actor => actor?.role === 'ADMIN' || actor?.isSharedStoreAccount === true

async function actorFor(db, session) {
  if (!session?.organizationId || !session.userId) return null
  const [user] = await db.$queryRawUnsafe('SELECT "id","displayName","role","isSharedStoreAccount" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=TRUE', session.userId, session.organizationId)
  if (!user || !['ADMIN','STAFF'].includes(user.role)) return null
  const settings = await db.$queryRawUnsafe('SELECT "staffKey","staffName","userId" FROM "StaffBookingSetting" WHERE "organizationId"=$1', session.organizationId)
  // Prefer the stable account association. Names only support unlinked legacy rows.
  const own = settings.filter(s => s.userId === user.id || (!s.userId && normalizeName(s.staffName) && normalizeName(s.staffName) === normalizeName(user.displayName)))
  return {...session, ...user, userId:user.id, chatStaffKeys:own.map(s => s.staffKey)}
}

function canAccessThread(actor, thread) {
  return Boolean(actor && thread && actor.organizationId === thread.organizationId && (privileged(actor) || actor.chatStaffKeys?.includes(thread.staffKey)))
}

async function choices(db, actor) {
  if (!actor) return []
  const rows = await db.$queryRawUnsafe(`SELECT s."staffKey" AS "key",COALESCE(NULLIF(u."displayName",''),s."staffName") AS "name",s."userId"
    FROM "StaffBookingSetting" s LEFT JOIN "AppUser" u ON u."id"=s."userId" AND u."organizationId"=s."organizationId"
    WHERE s."organizationId"=$1 AND s."active"=TRUE AND s."onLeave"=FALSE AND s."staffKey"<>'free'
    AND (u."id" IS NULL OR (u."active"=TRUE AND u."isSharedStoreAccount"=FALSE)) ORDER BY s."createdAt",s."staffKey"`, actor.organizationId)
  return rows.filter(s => privileged(actor) || actor.chatStaffKeys.includes(s.key))
}

async function composer(db, actor, customer) {
  const staff = await choices(db, actor)
  const own = staff.filter(s => actor.chatStaffKeys.includes(s.key))
  const selected = own.length === 1 ? own[0].key : ''
  return `<form action="/api/lien-chat-form" method="post" data-chat-compose-v689 data-chat-customer="${esc(customer.id)}" class="chat-compose-v689">
    <input type="hidden" name="customerId" value="${esc(customer.id)}">
    <label>担当者<select name="staffKey" class="lien-select" required><option value="">担当者を選択</option>${staff.map(s => `<option value="${esc(s.key)}"${s.key === selected ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    ${!staff.length ? '<p role="alert">送信できる担当者が登録されていません。店舗管理者へご確認ください。</p>' : ''}
    <label>メッセージ<textarea class="lien-input" name="body" maxlength="2000" rows="3" required></textarea></label>
    <p data-chat-error-v689 role="alert" hidden></p><button type="submit" class="lien-button-primary"${!staff.length ? ' disabled' : ''}>送信</button></form>`
}

function sameOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase()
  const origin = req.headers.origin
  try {
    if (origin) { const url = new URL(origin); return ['http:','https:'].includes(url.protocol) && url.host.toLowerCase() === host }
    if (req.headers['sec-fetch-site'] === 'cross-site') return false
    if (req.headers.referer) return new URL(req.headers.referer).host.toLowerCase() === host
  } catch { return false }
  return false
}

class ChatError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

async function sendStaff(db, actor, data) {
  if (!actor) throw new ChatError('ログインし直してください。', 401)
  const text = String(data.body || '').trim()
  if (!text || text.length > 2000) throw new ChatError('メッセージは1〜2,000文字で入力してください。')
  const threadId = id(data.threadId), customerId = id(data.customerId), staffKey = id(data.staffKey)
  if (!threadId && !customerId) throw new ChatError('送信先のお客様を選択してください。')
  const targets = !threadId ? await choices(db, actor) : []
  const target = targets.find(s => s.key === staffKey)
  if (!threadId && !target) throw new ChatError('担当者を選択してください。')
  return db.$transaction(async tx => {
    let thread
    if (threadId) {
      const rows = await tx.$queryRawUnsafe(`SELECT t.* FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" AND c."organizationId"=t."organizationId"
        WHERE t."id"=$1 AND t."organizationId"=$2 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL`, threadId, actor.organizationId)
      thread = rows[0]
      if (!canAccessThread(actor, thread)) throw new ChatError('この会話には送信できません。担当者とログイン中のアカウントをご確認ください。', 403)
      if (customerId && customerId !== thread.customerId) throw new ChatError('送信先が変更されています。会話を開き直してください。', 409)
    } else {
      const customers = await tx.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL', customerId, actor.organizationId)
      if (!customers[0]) throw new ChatError('お客様が見つかりません。', 404)
      await tx.$executeRawUnsafe(`INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","staffLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"='open',"updatedAt"=CURRENT_TIMESTAMP`, crypto.randomUUID(), actor.organizationId, customerId, target.key, target.name)
      ;[thread] = await tx.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 AND "organizationId"=$3', customerId, target.key, actor.organizationId)
      if (!canAccessThread(actor, thread)) throw new ChatError('この会話には送信できません。', 403)
    }
    const messageId = crypto.randomUUID()
    await tx.$executeRawUnsafe(`INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,'staff',$3,$4)`, messageId, thread.id, actor.userId, text)
    await tx.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP,"staffLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', thread.id, actor.organizationId)
    return {threadId:thread.id, messageId, redirect:'/admin/customers/messages/chat?threadId='+encodeURIComponent(thread.id)}
  })
}

async function handleStaffForm(req, res, db, session) {
  const wantsJson = String(req.headers.accept || '').includes('application/json')
  try {
    if (!sameOrigin(req)) throw new ChatError('送信元を確認できません。ページを開き直してください。', 403)
    let raw = ''
    for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 20000) throw new ChatError('メッセージが長すぎます。', 413) }
    const form = new URLSearchParams(raw)
    // An explicit form context is required: never silently recover another recipient.
    const result = await sendStaff(db, await actorFor(db, session), Object.fromEntries(form))
    res.setHeader('Cache-Control','private, no-store')
    if (wantsJson) { res.writeHead(201, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(result)) }
    else { res.writeHead(303, {Location:result.redirect}); res.end() }
  } catch (error) {
    const status = error instanceof ChatError ? error.status : 500
    const message = status < 500 ? error.message : '送信できませんでした。時間をおいて再度お試しください。'
    if (status === 500) console.error('[salon-settings-chat-v689] send failed', error.code || error.name)
    res.setHeader('Cache-Control','private, no-store')
    res.writeHead(status, {'Content-Type':wantsJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8'})
    res.end(wantsJson ? JSON.stringify({error:message}) : `<!doctype html><html lang="ja"><meta charset="utf-8"><title>チャット送信エラー</title><main><h1>送信できませんでした</h1><p>${esc(message)}</p><a href="/admin/customers/messages/chat">チャットへ戻る</a></main></html>`)
  }
}

async function readonlySettings(db, session) {
  const [store] = await db.$queryRawUnsafe(`SELECT o."name",p."phone",p."prefecture",p."city",p."addressLine1",p."addressLine2",p."businessHours",p."closedDays",p."businessOpenMinutes",p."businessCloseMinutes",p."closedWeekdays",p."orimiaPublished"
    FROM "Organization" o LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE o."id"=$1`, session.organizationId)
  if (!store) return '<h1>店舗情報が見つかりません。</h1>'
  const time = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
  const hours = store.businessHours || (store.businessOpenMinutes != null && store.businessCloseMinutes != null ? time(store.businessOpenMinutes)+'〜'+time(store.businessCloseMinutes) : '')
  const days = store.closedDays || String(store.closedWeekdays || '').split(',').filter(v => /^[0-6]$/.test(v.trim())).map(v => ['日','月','火','水','木','金','土'][Number(v)]+'曜日').join('・')
  const fields = [['店舗名',store.name],['電話番号',store.phone],['所在地',[store.prefecture,store.city,store.addressLine1,store.addressLine2].filter(Boolean).join(' ')],['営業時間',hours],['定休日',days],['ORIMIAへの掲載',store.orimiaPublished === false ? '非公開' : '公開中']]
  return `<div data-salon-settings-readonly-v689><header><h1>店舗設定</h1><p>店舗情報</p></header><p role="status" class="settings-access-v689">閲覧のみのアカウントです。店舗情報の変更にはオーナーアカウントでのログインが必要です。</p><dl>${fields.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value || '未設定')}</dd></div>`).join('')}</dl><a class="lien-button-secondary" href="/admin/account">アカウント設定</a></div>`
}

module.exports = {actorFor, privileged, canAccessThread, choices, composer, sendStaff, handleStaffForm, sameOrigin, readonlySettings, ChatError, esc}
