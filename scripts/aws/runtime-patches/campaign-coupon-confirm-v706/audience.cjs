'use strict'
const crypto = require('node:crypto')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const keys = ['title','body','deliveryMethod','audienceGender','audienceMinAge','audienceMaxAge','couponEnabled','couponTitle','couponDescription','couponTargetMenu','couponDiscountRate','couponValidDays']
function age(customer, now = new Date()) {
  if (customer.birthDate) {
    const birth = new Date(customer.birthDate)
    let years = now.getFullYear() - birth.getFullYear()
    if (new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) > now) years--
    return years
  }
  return customer.birthYear ? now.getFullYear() - customer.birthYear : null
}
function gender(value) { const raw = String(value || '').trim().toLowerCase(); return /女性|female|woman|^f$/.test(raw) ? 'female' : /男性|male|man|^m$/.test(raw) ? 'male' : 'other' }
function criteria(form) {
  const genderValue = String(form.get('audienceGender') || 'all'), method = String(form.get('deliveryMethod') || 'app')
  const optional = key => { const raw = String(form.get(key) || '').trim(); if (!raw) return null; const value = Number(raw); if (!Number.isInteger(value) || value < 0 || value > 120) fail('年齢範囲を確認してください。'); return value }
  const min = optional('audienceMinAge'), max = optional('audienceMaxAge')
  if (!['all','female','male','other'].includes(genderValue) || !['app','email','sms'].includes(method)) fail('配信条件を確認してください。')
  if (min !== null && max !== null && min > max) fail('年齢範囲を確認してください。')
  return { gender: genderValue, method: method === 'sms' ? 'app' : method, min, max, selected: new Set(form.getAll('targetCustomerId').map(String).map(s => s.trim()).filter(Boolean)) }
}
function select(customers, filter, now = new Date()) {
  const matched = customers.filter(customer => {
    if (filter.selected.size) return filter.selected.has(customer.id)
    if (filter.gender !== 'all' && gender(customer.gender) !== filter.gender) return false
    const value = age(customer, now)
    return (filter.min === null || (value !== null && value >= filter.min)) && (filter.max === null || (value !== null && value <= filter.max))
  })
  const recipients = filter.method === 'email' ? matched.filter(customer => String(customer.appUsers[0]?.email || '').trim()) : matched
  return { matched, recipients, skipped: matched.filter(row => !recipients.includes(row)) }
}
async function resolve(prisma, org, form) {
  const filter = criteria(form)
  const customers = await prisma.customer.findMany({ where: { organizationId: org, deletedAt: null, storeHiddenAt: null }, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true, phone: true, gender: true, birthDate: true, birthYear: true, appUsers: { where: { role: 'CUSTOMER', active: true }, orderBy: { id: 'asc' }, select: { email: true }, take: 1 }, phoneIdentity: { select: { phoneE164: true } } } })
  return { ...select(customers, filter), method: filter.method }
}
function digest(session, form, recipients) {
  return crypto.createHash('sha256').update(JSON.stringify([session.organizationId, session.userId, keys.map(key => [key, String(form.get(key) || '')]), [...new Set(form.getAll('targetCustomerId').map(String))].sort(), recipients.map(row => [row.id, row.name, row.phone || '', row.appUsers?.[0]?.email || '']).sort((a,b) => a[0].localeCompare(b[0]))])).digest('hex')
}
function secret() { const value = process.env.ADMIN_AUTH_SECRET; if (!value) fail('配信の確認機能を利用できません。', 503); return value }
function issue(session, form, recipients, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ expires: now + 600000, nonce: crypto.randomUUID(), digest: digest(session, form, recipients) })).toString('base64url')
  return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url')
}
function verify(session, form, recipients, token = form.get('broadcastConfirmationV706'), now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2000) fail('配信対象をもう一度確認してください。', 409)
  if (token.split('.').length !== 2) fail('配信対象をもう一度確認してください。', 409)
  const [body, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', secret()).update(body || '').digest('base64url')
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail('配信対象をもう一度確認してください。', 409)
  let data
  try { data = JSON.parse(Buffer.from(body, 'base64url').toString()) } catch { fail('配信対象をもう一度確認してください。', 409) }
  if (!data || !Number.isFinite(data.expires) || data.expires < now || data.expires > now + 600000 || !/^[a-f0-9-]{36}$/.test(data.nonce) || data.digest !== digest(session, form, recipients)) fail('配信内容または対象者が変更されました。もう一度一覧を確認してください。', 409)
  return 'broadcast-confirm-' + data.nonce
}
function createService({ prisma, sessionProvider, json }) {
  async function handle(req, res, url) {
    if (url.pathname !== '/api/admin/broadcast-preview') return false
    try {
      const session = await sessionProvider(req)
      if (!session?.organizationId || !['ADMIN','STAFF'].includes(session.role)) fail('ログインしてください。', 401)
      if (req.method !== 'POST') fail('Method not allowed', 405)
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim(), protocol = String(req.headers['cloudfront-forwarded-proto'] || req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
      if (req.headers.origin !== protocol + '://' + host) fail('不正なリクエストです。', 403)
      let raw = ''
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 262144) fail('対象者が多すぎます。条件を絞ってください。', 413) }
      let input
      try { input = JSON.parse(raw) } catch { fail('入力を確認してください。') }
      if (!Array.isArray(input?.entries) || input.entries.length > 10000 || !input.entries.every(row => Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string'))) fail('入力を確認してください。')
      const form = new URLSearchParams(input.entries), result = await resolve(prisma, session.organizationId, form)
      if (input.token) { verify(session, form, result.recipients, input.token); json(res, 200, { ok: true }); return true }
      const describe = row => ({ id: row.id, name: row.name, phone: String(row.phone || '').replace(/\D/g, '').slice(-4), email: result.method === 'email' ? String(row.appUsers[0]?.email || '').replace(/^(.).*(@.+)$/, '$1***$2') : '' })
      json(res, 200, { recipients: result.recipients.map(describe), skipped: result.skipped.map(describe), method: result.method, token: issue(session, form, result.recipients) })
    } catch (error) { json(res, error.status || 500, { error: error.status ? error.message : '配信対象を取得できませんでした。再度お試しください。' }) }
    return true
  }
  return { handle }
}
module.exports = { criteria, select, resolve, digest, issue, verify, createService }
