import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] || '/app'
const touched = []

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8')
}

function write(name, source) {
  fs.writeFileSync(path.join(root, name), source, 'utf8')
  touched.push(name)
}

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle)
  if (first < 0) throw new Error(`Missing patch target: ${label}`)
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Ambiguous patch target: ${label}`)
  return source.slice(0, first) + replacement + source.slice(first + needle.length)
}

function replaceBetween(source, start, end, replacement, label) {
  const from = source.indexOf(start)
  if (from < 0) throw new Error(`Missing start marker: ${label}`)
  const to = source.indexOf(end, from + start.length)
  if (to < 0) throw new Error(`Missing end marker: ${label}`)
  return source.slice(0, from) + replacement.trim() + '\n\n' + source.slice(to)
}

function code(...functions) {
  return functions.map(fn => fn.toString()).join('\n\n')
}

function customerShell({ title, active = '', unread = 0, back = '', body }) {
  const left = `<a class="icon-button customer-store-icon" href="/u/home" aria-label="ホーム"><img src="/api/lien-store-icon" alt="" onerror="this.onerror=null;this.src='/brand/salon-customer-service-mark.svg'"></a>`
  const pageBack = back ? `<a class="customer-page-back" href="${back}">${customerIcon('arrow')}<span>戻る</span></a>` : ''
  const badge = unread ? `<span class="customer-notification-badge" aria-hidden="true">${Math.min(99, Number(unread) || 0)}</span>` : ''
  const bell = `<a class="icon-button customer-notification-link" href="/u/news" aria-label="お知らせ${unread ? ` ${unread}件` : ''}">${customerIcon('bell')}${badge}</a>`
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fffdfb"><title>${htmlEscape(title)} | Salon de Lien</title><link rel="stylesheet" href="/customer-native-shell-v92.css"></head><body><div class="app"><header class="topbar">${left}<a class="brand" href="/u/home"><span class="brand-script">Salon de Lien</span><span class="brand-sub">Beauty Membership</span></a>${bell}</header><main class="content">${pageBack}${body}</main>${customerBottomNav(active)}</div><script src="/customer-experience-v278.js" defer></script></body></html>`
}

async function syncStaffSystemNotifications(organizationId) {
  const recentCustomers = await prisma.$queryRawUnsafe('SELECT "id","name","gender","createdAt" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "createdAt">NOW()-INTERVAL \'7 days\' ORDER BY "createdAt" DESC LIMIT 50', organizationId)
  for (const customer of recentCustomers) {
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\'new_registration\',\'新しいお客様が登録されました\',$3,$4,\'customer\',$5,\'customer_registration\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, `${customer.name || 'お客様'}様の顧客情報を確認してください。`, `/admin/customers/${encodeURIComponent(customer.id)}`, customer.id)
  }
  const duplicates = await prisma.$queryRawUnsafe(`SELECT LOWER(REGEXP_REPLACE(BTRIM("name"),'[\\s　]+','','g')) AS "normalizedName",COALESCE("gender",'') AS "gender",COUNT(*)::int AS "count",MIN("id") AS "firstId",STRING_AGG("id",',' ORDER BY "createdAt") AS "customerIds",MIN("name") AS "displayName" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL GROUP BY 1,2 HAVING COUNT(*)>1 LIMIT 40`, organizationId)
  for (const duplicate of duplicates) {
    const entityId = crypto.createHash('sha256').update(`${duplicate.normalizedName}:${duplicate.gender}`).digest('hex').slice(0, 32)
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\'duplicate_candidate\',\'同一人物の可能性がある顧客が見つかりました\',$3,$4,\'customer_group\',$5,\'duplicate_detection\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, `${duplicate.displayName || '同名のお客様'}様が${duplicate.count}件登録されています。内容を確認し、統合が必要か判断してください。`, `/admin/customers/${encodeURIComponent(duplicate.firstId)}`, entityId)
  }
}

async function staffNotifications(req, res, options = {}) {
  const markRead = Boolean(options.markRead)
  const history = Boolean(options.history)
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  await syncStaffSystemNotifications(session.organizationId)
  const notificationState = (await prisma.$queryRawUnsafe('SELECT * FROM "StaffNotificationState" WHERE "userId"=$1 LIMIT 1', session.userId))[0]
  const appointmentSince = notificationState?.appointmentsReadAt || new Date(0)
  const eventSince = notificationState?.eventsReadAt || new Date(0)
  const appointments = history
    ? await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' ORDER BY a."createdAt" DESC LIMIT 100', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' AND a."createdAt">$2 ORDER BY a."createdAt" DESC LIMIT 30', session.organizationId, appointmentSince)
  const messages = history
    ? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\'customer\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)
    : []
  const events = history
    ? await prisma.$queryRawUnsafe('SELECT "id","type","title","body","href","source","createdAt" FROM "StaffSystemNotification" WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 150', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT "id","type","title","body","href","source","createdAt" FROM "StaffSystemNotification" WHERE "organizationId"=$1 AND "createdAt">$2 ORDER BY "createdAt" DESC LIMIT 50', session.organizationId, eventSince)
  const messageCount = await unreadChatCount(req, 'staff')
  if (markRead) await prisma.$executeRawUnsafe('INSERT INTO "StaffNotificationState" ("userId","organizationId","appointmentsReadAt","eventsReadAt","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("userId") DO UPDATE SET "appointmentsReadAt"=CURRENT_TIMESTAMP,"eventsReadAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP', session.userId, session.organizationId)
  return json(res, 200, {
    count: history ? appointments.length + messages.length + events.length : appointments.length + messageCount + events.length,
    appointmentCount: appointments.length,
    messageCount,
    eventCount: events.length,
    appointments,
    messages,
    events,
    readAt: notificationState?.appointmentsReadAt || null,
  })
}

function replaceNewsLinks() {
  // The notification bell remains a notification entry. Store registration has its own page.
}

function staffHue(value) {
  let hash = 0
  for (const char of String(value || 'staff')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}

function fallbackAvatar(item, className = 'cx-staff-avatar') {
  const node = document.createElement('span')
  node.className = `${className} cx-staff-avatar-fallback`
  node.textContent = String(item?.name || '人').replace(/[\s　]/g, '').slice(0, 1)
  node.style.setProperty('--cx-staff-hue', String(staffHue(item?.key || item?.name)))
  node.setAttribute('aria-hidden', 'true')
  return node
}

function enrichBooking(directory) {
  if (location.pathname !== '/u/appointments') return
  const byName = name => directory.find(item => item.name.replace(/[\s　]/g, '') === String(name || '').replace(/[\s　]/g, ''))
  document.querySelectorAll('button[aria-pressed]').forEach(button => {
    if (button.querySelector('.cx-staff-avatar')) return
    const item = byName(button.textContent.trim().replace(/^✓\s*/, ''))
    if (!item) return
    const avatar = item.avatarUrl ? document.createElement('img') : fallbackAvatar(item)
    if (item.avatarUrl) { avatar.className = 'cx-staff-avatar'; avatar.src = item.avatarUrl; avatar.alt = '' }
    button.prepend(avatar)
  })
  const item = byName(selectedStaffName())
  if (!item) return
  const nameNode = [...document.querySelectorAll('p')].find(node => node.textContent.trim() === item.name)
  const profileCard = nameNode && nameNode.closest('.grid')
  if (!profileCard) return
  const visual = profileCard.querySelector('span.grid.h-16')
  if (visual && !profileCard.querySelector('.cx-profile-avatar')) {
    const avatar = item.avatarUrl ? document.createElement('img') : fallbackAvatar(item, 'cx-profile-avatar')
    if (item.avatarUrl) { avatar.className = 'cx-profile-avatar'; avatar.src = item.avatarUrl; avatar.alt = `${item.name}のプロフィール画像` }
    visual.replaceWith(avatar)
  }
  const role = nameNode.parentElement && nameNode.parentElement.querySelector('p.text-xs')
  if (role && item.role && role.textContent !== item.role) role.textContent = item.role
  const columns = profileCard.children[1]
  if (columns) {
    const paragraphs = columns.querySelectorAll('p')
    if (paragraphs[0] && item.specialties && paragraphs[0].textContent !== item.specialties) paragraphs[0].textContent = item.specialties
    if (paragraphs[1] && item.introduction && paragraphs[1].textContent !== item.introduction) paragraphs[1].textContent = item.introduction
  }
}

function applyCustomerConsistency() {
  document.documentElement.classList.toggle('cx-community-route', location.pathname === '/u/community')
  if (document.querySelector('#cx-consistency-styles')) return
  const style = document.createElement('style')
  style.id = 'cx-consistency-styles'
  style.textContent = `.customer-store-icon img{width:34px;height:34px;border-radius:50%;object-fit:cover}.customer-notification-link{position:relative}.customer-notification-badge{position:absolute;top:2px;right:1px;display:grid;min-width:17px;height:17px;place-items:center;border:2px solid #fff;border-radius:999px;background:#cf4864;padding:0 3px;color:#fff;font-size:9px;font-weight:800}.cx-staff-avatar-fallback{display:grid!important;place-items:center;background:hsl(var(--cx-staff-hue) 42% 91%)!important;color:hsl(var(--cx-staff-hue) 38% 32%)!important;font-weight:800}.cx-profile-avatar.cx-staff-avatar-fallback{width:64px;height:64px;border-radius:18px}@media(max-width:767px){html.cx-community-route .content{padding-top:10px!important}html.cx-community-route .page-title{margin-bottom:10px!important;padding-block:10px!important}html.cx-community-route main section{margin-top:10px!important}}`
  document.head.appendChild(style)
}

function enforceSquareImageInputs() {
  if (document.documentElement.dataset.cxSquareUploadGuard === '1') return
  document.documentElement.dataset.cxSquareUploadGuard = '1'
  document.addEventListener('change', event => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.[0]) return
    if (location.pathname.includes('/community')) return
    const file = input.files[0]
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      if (image.naturalWidth === image.naturalHeight) { input.setCustomValidity(''); return }
      input.value = ''
      input.setCustomValidity('正方形の画像を選択してください。')
      input.reportValidity()
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }, true)
}

function enforceAdminSquareImageInputs() {
  if (document.documentElement.dataset.caSquareUploadGuard === '1') return
  document.documentElement.dataset.caSquareUploadGuard = '1'
  document.addEventListener('change', event => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.[0]) return
    if (location.pathname.includes('/community')) return
    const file = input.files[0]
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      if (image.naturalWidth === image.naturalHeight) { input.setCustomValidity(''); return }
      input.value = ''
      input.setCustomValidity('正方形の画像を選択してください。みんなのスタイル投稿だけは縦横比を維持できます。')
      input.reportValidity()
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }, true)
}

async function decodeSquareImage(dataUrl) {
  const image = decodeImage(dataUrl)
  const metadata = await sharp(image.buffer).metadata()
  if (!metadata.width || !metadata.height || metadata.width !== metadata.height) throw new CustomerStoreStaffError('正方形の画像を選択してください。')
  const buffer = await sharp(image.buffer).rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 86 }).toBuffer()
  return { buffer, mime: 'image/webp', extension: 'webp' }
}

async function createSystemNotification(organizationId, type, entityId, title, body, href, source, entityType = null) {
  await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, type, title, body || null, href || null, entityType, entityId, source || null)
}

async function storeIcon(req, res, url) {
  await ensureSchema()
  const { session, audience } = await audienceSession(req)
  const organizationId = String(url.searchParams.get('organizationId') || session.organizationId)
  if (audience === 'staff' && organizationId !== session.organizationId) throw new CustomerStoreStaffError('別店舗の画像は表示できません。', 403)
  if (audience === 'customer' && organizationId !== session.organizationId) {
    const allowed = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
    if (!allowed[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 403)
  }
  const row = (await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', organizationId))[0]
  const value = String(row?.iconImageUrl || '')
  if (!value) {
    res.statusCode = 302; res.setHeader('Location', '/brand/salon-customer-service-mark.svg'); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
  }
  if (value.startsWith('private/')) {
    if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: value }), { expiresIn: 300 })
    res.statusCode = 302; res.setHeader('Location', signed); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
  }
  res.statusCode = 302; res.setHeader('Location', value.startsWith('/') ? value : '/brand/salon-customer-service-mark.svg'); res.setHeader('Cache-Control', 'private, no-store'); res.end()
}

async function updateStoreIcon(req, res) {
  const session = await currentStaff(req)
  if (session.role !== 'ADMIN') throw new CustomerStoreStaffError('オーナーのみ変更できます。', 403)
  if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
  if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
  const data = await readJson(req, 5 * 1024 * 1024)
  const image = await decodeSquareImage(data.imageDataUrl)
  const objectKey = `private/store-icons/${session.organizationId}/${crypto.randomUUID()}.webp`
  const old = await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: image.buffer, ContentType: image.mime, CacheControl: 'private, no-store', ServerSideEncryption: 'AES256' }))
  await prisma.$executeRawUnsafe('UPDATE "Organization" SET "iconImageUrl"=$1,"updatedAt"=NOW() WHERE "id"=$2', objectKey, session.organizationId)
  if (String(old[0]?.iconImageUrl || '').startsWith('private/store-icons/') && old[0].iconImageUrl !== objectKey) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: old[0].iconImageUrl })).catch(() => {})
  return json(res, 200, { ok: true, iconUrl: `/api/lien-store-icon?v=${Date.now()}` })
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) return reject(new Error('3MB以下のJPEG・PNG・WebP画像を選択してください。'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('画像を読み込めませんでした。'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('画像を読み込めませんでした。'))
      image.onload = () => image.naturalWidth === image.naturalHeight ? resolve(reader.result) : reject(new Error('正方形の画像を選択してください。'))
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function ensureStoreMenuLink() {
  const nav = document.querySelector('[data-ca-store-menu] .ca-store-menu-links')
  if (!nav) return
  const candidates = [...nav.querySelectorAll('a[href*="staffManagement=1"], [data-sm-staff-link]')]
  candidates.slice(1).forEach(node => node.remove())
  if (candidates[0]) { candidates[0].dataset.smStaffLink = '1'; return }
  let profile
  try { profile = await storeProfile() } catch { return }
  if (profile.role !== 'ADMIN' || !nav.isConnected) return
  const link = document.createElement('a')
  link.href = '/admin/settings?staffManagement=1'
  link.dataset.smStaffLink = '1'
  link.setAttribute('role', 'menuitem')
  link.innerHTML = `${icon('users')}スタッフ管理<span class="arrow">›</span>`
  const account = nav.querySelector('a[href="/admin/account"]')
  nav.insertBefore(link, account || null)
}

async function ensureStaffPage() {
  const active = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('staffManagement') === '1'
  if (!active) {
    document.documentElement.classList.remove('sm-staff-route')
    document.querySelectorAll('[data-sm-page]').forEach(node => node.remove())
    return
  }
  const main = document.querySelector('main')
  if (!main || main.querySelector('[data-sm-page]')) return
  document.documentElement.classList.add('sm-staff-route')
  const root = document.createElement('div')
  root.className = 'sm-page'
  root.dataset.smPage = '1'
  root.innerHTML = `<header class="sm-page-head"><div><small>STAFF DIRECTORY</small><h1>スタッフ管理</h1><p>スタッフのアカウント、予約受付、休暇、プロフィールを一か所で管理します。</p></div><button type="button" class="sm-button primary" data-sm-add>${icon('plus')}スタッフを追加</button></header><section class="sm-list" data-sm-list><div class="sm-empty">スタッフ情報を読み込んでいます…</div></section>`
  main.appendChild(root)
  root.querySelector('[data-sm-add]').addEventListener('click', () => openCreateDialog(root))
  root.addEventListener('click', async event => {
    const card = event.target.closest('[data-sm-staff]'); if (!card) return
    const staff = (state.directory || []).find(item => item.key === card.dataset.smStaff); if (!staff) return
    if (event.target.closest('[data-sm-edit]')) openEditDialog(root, staff)
    if (event.target.closest('[data-sm-delete]')) {
      if (!confirm(`${staff.name}さんのログインと新規予約受付を停止します。過去の予約履歴は残ります。よろしいですか？`)) return
      try { await request('/api/admin/staff-management', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffKey: staff.key }) }); state.directory = null; close(); await renderStaffPage(root); toast('スタッフを停止しました。') } catch (error) { toast(error.message, true) }
    }
  })
  try { await renderStaffPage(root) } catch (error) { root.querySelector('[data-sm-list]').innerHTML = `<div class="sm-empty">${esc(error.message)}</div>` }
}

function paginateOperationHistory() {
  const active = location.pathname === '/admin/appointments' && new URLSearchParams(location.search).get('tab') === 'history'
  if (!active) {
    document.querySelectorAll('.sm-history-pager').forEach(node => node.remove())
    document.querySelectorAll('[data-sm-history-ready]').forEach(node => delete node.dataset.smHistoryReady)
    return
  }
  const heading = [...document.querySelectorAll('h2')].find(node => node.textContent?.trim() === '操作履歴')
  const section = heading?.closest('section')
  const list = section?.querySelector(':scope > .mt-4.grid')
  if (!section || !list || list.dataset.smHistoryReady === '1') return
  const articles = [...list.querySelectorAll(':scope > article')].filter(article => !/自動取込|予約メール|Gmail API|受信メール/.test(article.textContent || ''))
  ;[...list.querySelectorAll(':scope > article')].filter(article => !articles.includes(article)).forEach(article => { article.hidden = true })
  const perPage = 50
  const total = articles.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const requested = Number(new URLSearchParams(location.search).get('historyPage') || 1)
  const page = Math.min(pages, Math.max(1, Number.isInteger(requested) ? requested : 1))
  const start = (page - 1) * perPage
  const end = Math.min(total, start + perPage)
  articles.forEach((article, index) => { article.hidden = index < start || index >= end })
  const description = heading.parentElement?.querySelector('p')
  if (description) description.textContent = total ? `${total}件中 ${start + 1}〜${end}件を表示しています。スタッフが手動で行った操作だけを記録しています。` : '手動の操作履歴はまだありません。'
  const count = heading.parentElement?.parentElement?.querySelector(':scope > span')
  if (count) count.textContent = `${total}件`
  if (pages > 1) {
    const hrefFor = target => { const url = new URL(location.href); url.searchParams.set('historyPage', String(target)); return url.pathname + url.search }
    const pager = document.createElement('nav'); pager.className = 'sm-history-pager'; pager.setAttribute('aria-label', '操作履歴のページ')
    pager.innerHTML = (page > 1 ? `<a href="${esc(hrefFor(page - 1))}">前へ</a>` : '<span class="disabled" aria-disabled="true">前へ</span>') + Array.from({ length: pages }, (_, index) => index + 1).map(number => number === page ? `<span aria-current="page">${number}</span>` : `<a href="${esc(hrefFor(number))}">${number}</a>`).join('') + (page < pages ? `<a href="${esc(hrefFor(page + 1))}">次へ</a>` : '<span class="disabled" aria-disabled="true">次へ</span>')
    list.insertAdjacentElement('afterend', pager)
  }
  list.dataset.smHistoryReady = '1'
}

function notificationHistoryItems(payload) {
  const appointments = (Array.isArray(payload?.appointments) ? payload.appointments : []).map(item => ({ id: `appointment:${item.id}`, type: 'appointment', title: `${item.customerName || 'お客様'}様の予約`, body: `${item.menu || 'メニュー相談'}${item.status ? ` / ${item.status}` : ''}`, time: item.createdAt, href: `/admin/appointments/${encodeURIComponent(item.id)}` }))
  const messages = (Array.isArray(payload?.messages) ? payload.messages : []).map(item => ({ id: `message:${item.id}`, type: 'message', title: `${item.customerName || 'お客様'}様からメッセージ`, body: item.body || 'メッセージを確認してください。', time: item.createdAt, href: `/admin/customers/messages?chat=1&threadId=${encodeURIComponent(item.threadId || '')}` }))
  const events = (Array.isArray(payload?.events) ? payload.events : []).map(item => ({ id: `event:${item.id}`, type: item.type || 'system', title: item.title || 'お知らせ', body: item.body || '', time: item.createdAt, href: item.href || '/admin/appointments?notificationHistory=1' }))
  return appointments.concat(messages, events).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
}

// ----- server.js -----
{
  const name = 'server.js'
  let source = read(name)
  source = replaceBetween(source, 'function customerShell(', '\nasync function customerAppData', code(customerShell), 'customer shell')
  source = replaceOnce(source, '  await prisma.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "BookingCapacityOverride"', '  await prisma.$executeRawUnsafe(\'ALTER TABLE "StaffNotificationState" ADD COLUMN IF NOT EXISTS "eventsReadAt" TIMESTAMP(3)\')\n  await prisma.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT NOT NULL,"source" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)\')\n  await prisma.$executeRawUnsafe(\'CREATE UNIQUE INDEX IF NOT EXISTS "StaffSystemNotification_org_type_entity_key" ON "StaffSystemNotification"("organizationId","type","entityId")\')\n  await prisma.$executeRawUnsafe(\'CREATE INDEX IF NOT EXISTS "StaffSystemNotification_org_created_idx" ON "StaffSystemNotification"("organizationId","createdAt" DESC)\')\n  await prisma.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "BookingCapacityOverride"', 'staff event schema')
  source = replaceBetween(source, 'async function staffNotifications(', '\nasync function handleWithChatLink', code(syncStaffSystemNotifications, staffNotifications), 'staff notifications')
  source = source.replace(/<div class="status-card"><span class="label">電話番号認証<\/span>[\s\S]*?<\/div><form action="\/api\/lien-sms-consent"/, '<form action="/api/lien-sms-consent"')
  write(name, source)
}

// ----- customer-experience-v278.js -----
{
  const name = 'customer-experience-v278.js'
  let source = read(name)
  source = replaceBetween(source, '  function replaceNewsLinks()', '\n  async function applyCommunityNickname', '  ' + code(replaceNewsLinks).replaceAll('\n', '\n  '), 'notification link preservation')
  source = replaceBetween(source, '  function enrichBooking(', '\n  function normalizedName', '  ' + code(staffHue, fallbackAvatar, enrichBooking).replaceAll('\n', '\n  '), 'booking staff avatars')
  source = replaceOnce(source, '  function boot() {\n    replaceNewsLinks()', '  ' + code(applyCustomerConsistency, enforceSquareImageInputs).replaceAll('\n', '\n  ') + '\n\n  function boot() {\n    applyCustomerConsistency()\n    enforceSquareImageInputs()\n    replaceNewsLinks()', 'customer consistency boot')
  source = replaceOnce(source, 'new MutationObserver(() => { replaceNewsLinks(); applyCommunityNickname() })', 'new MutationObserver(() => { applyCustomerConsistency(); replaceNewsLinks(); applyCommunityNickname() })', 'customer consistency observer')
  write(name, source)
}

// ----- customer-store-staff-v276.js -----
{
  const name = 'customer-store-staff-v276.js'
  let source = read(name)
  source = replaceOnce(source, "const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')", "const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')\nconst sharp = require('sharp')", 'sharp import')
  source = replaceOnce(source, '\nfunction signCustomerSession(', '\n' + code(decodeSquareImage) + '\n\nfunction signCustomerSession(', 'square image decoder')
  source = replaceOnce(source, '      await prisma.$executeRawUnsafe(\'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT\')', '      await prisma.$executeRawUnsafe(\'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT\')\n      await prisma.$executeRawUnsafe(\'ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "iconImageUrl" TEXT\')\n      await prisma.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT NOT NULL,"source" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)\')\n      await prisma.$executeRawUnsafe(\'CREATE UNIQUE INDEX IF NOT EXISTS "StaffSystemNotification_org_type_entity_key" ON "StaffSystemNotification"("organizationId","type","entityId")\')', 'store icon and events schema')
  source = replaceOnce(source, '      const image = decodeImage(data.imageDataUrl)', '      const image = await decodeSquareImage(data.imageDataUrl)', 'staff square avatar')
  source = replaceOnce(source, '  async function customerStores(req, res) {\n    const session = await currentCustomer(req)', '  ' + code(createSystemNotification).replaceAll('\n', '\n  ') + '\n\n  async function customerStores(req, res) {\n    const session = await currentCustomer(req)', 'store event helper')
  source = replaceOnce(source, "    let organizationId = String(data.organizationId || '')\n    let customerId = ''", "    let organizationId = String(data.organizationId || '')\n    let customerId = ''\n    let linkedNewStore = false\n    let linkedStoreName = ''\n    let linkedCustomerName = ''", 'store link flags')
  source = replaceOnce(source, '      organizationId = organizations[0].id', '      organizationId = organizations[0].id\n      linkedStoreName = organizations[0].name', 'linked store name')
  source = replaceOnce(source, "        if (!source[0]) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)\n        customerId = crypto.randomUUID()", "        if (!source[0]) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)\n        linkedCustomerName = source[0].name\n        customerId = crypto.randomUUID()", 'linked customer name')
  source = replaceOnce(source, '          await tx.$executeRawUnsafe(\'INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())\', crypto.randomUUID(), session.userId, organizationId, customerId)\n        })', '          await tx.$executeRawUnsafe(\'INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())\', crypto.randomUUID(), session.userId, organizationId, customerId)\n        })\n        linkedNewStore = true', 'new store link flag')
  source = replaceOnce(source, '    const users = await prisma.$queryRawUnsafe', '    if (linkedNewStore) {\n      await createSystemNotification(organizationId, \'store_inflow\', customerId, \'別店舗からお客様が登録されました\', `${linkedStoreName || \'店舗\'}へ${linkedCustomerName || \'お客様\'}様が流入しました。顧客情報をご確認ください。`, `/admin/customers/${encodeURIComponent(customerId)}`, \'customer_store_link\', \'customer\')\n      const linkedCustomer = (await prisma.$queryRawUnsafe(\'SELECT "name","gender" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1\', customerId, organizationId))[0]\n      if (linkedCustomer) {\n        const same = await prisma.$queryRawUnsafe(\'SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "id"<>$2 AND LOWER(REGEXP_REPLACE(BTRIM("name"),\\\'[\\\\s　]+\\\',\\\'\\\',\\\'g\\\'))=LOWER(REGEXP_REPLACE(BTRIM($3),\\\'[\\\\s　]+\\\',\\\'\\\',\\\'g\\\')) AND COALESCE("gender",\\\'\\\')=COALESCE($4,\\\'\\\') LIMIT 1\', organizationId, customerId, linkedCustomer.name, linkedCustomer.gender)\n        if (same[0]) await createSystemNotification(organizationId, \'duplicate_candidate\', `link-${customerId}`, \'同一人物の可能性がある顧客が見つかりました\', `${linkedCustomer.name}様と同名・同性の顧客が登録済みです。統合が必要か確認してください。`, `/admin/customers/${encodeURIComponent(customerId)}`, \'customer_store_link\', \'customer_group\')\n      }\n    }\n    const users = await prisma.$queryRawUnsafe', 'store inflow notifications')
  source = replaceOnce(source, '\n  async function storesPage(', '\n  ' + code(storeIcon, updateStoreIcon).replaceAll('\n', '\n  ') + '\n\n  async function storesPage(', 'store icon endpoints')
  source = replaceOnce(source, '<span class="registered-store-mark">${String(store.name || \'店\').trim().slice(0, 1)}</span>', '<span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" onerror="this.style.display=\'none\';this.parentElement.textContent=\'${String(store.name || \'店\').trim().slice(0, 1)}\'"></span>', 'store list icons')
  source = replaceOnce(source, "'/api/lien-customer-stores', '/u/stores'])", "'/api/lien-customer-stores', '/api/lien-store-icon', '/api/admin/store-icon', '/u/stores'])", 'store icon routes')
  source = replaceOnce(source, "      else if (url.pathname === '/api/lien-customer-stores') await customerStores(req, res)", "      else if (url.pathname === '/api/lien-customer-stores') await customerStores(req, res)\n      else if (url.pathname === '/api/lien-store-icon' && req.method === 'GET') await storeIcon(req, res, url)\n      else if (url.pathname === '/api/admin/store-icon' && req.method === 'POST') await updateStoreIcon(req, res)", 'store icon handlers')
  write(name, source)
}

// ----- admin-staff-experience-v276.js -----
{
  const name = 'admin-staff-experience-v276.js'
  let source = read(name)
  source = replaceBetween(source, '  async function ensureStoreMenuLink()', '\n  let storeCodePending', '  ' + code(ensureStoreMenuLink).replaceAll('\n', '\n  '), 'deduplicate staff menu')
  source = replaceBetween(source, '  function fileAsDataUrl(', '\n  async function saveAvatar', '  ' + code(fileAsDataUrl).replaceAll('\n', '\n  '), 'square image client validation')
  source = replaceBetween(source, '  async function ensureStaffPage()', '\n  async function ensureHeaderAvatar', '  ' + code(ensureStaffPage).replaceAll('\n', '\n  '), 'stable staff management route')
  source = replaceBetween(source, '  function paginateOperationHistory()', '\n  function enhance()', '  ' + code(paginateOperationHistory).replaceAll('\n', '\n  '), 'history pagination scope')
  source = replaceOnce(source, "  const schedule = () => { clearTimeout(state.timer); state.timer = setTimeout(enhance, 60) }", `  document.addEventListener('click', event => { const link = event.target.closest?.('a[href*="staffManagement=1"]'); if (!link) return; event.preventDefault(); event.stopImmediatePropagation(); location.assign(link.href) }, true)\n  const schedule = () => { clearTimeout(state.timer); state.timer = setTimeout(enhance, 0) }`, 'staff route navigation and fast date formatting')
  write(name, source)
}

// ----- commercial-admin-v101.js -----
{
  const name = 'commercial-admin-v101.js'
  let source = read(name)
  source = replaceOnce(source, '\n  function enhance() {', '\n  ' + code(enforceAdminSquareImageInputs).replaceAll('\n', '\n  ') + '\n\n  function enhance() {', 'admin square image validation')
  source = replaceOnce(source, '    styles(); applyAdminTheme(savedAdminTheme());', '    enforceAdminSquareImageInputs(); styles(); applyAdminTheme(savedAdminTheme());', 'admin square validation boot')
  source = replaceOnce(source, "    if (location.pathname === '/admin/customers/messages') return { panelKey: 'points', label: 'ポイント・抽選・クーポン設定' }\n", '', 'remove consultation settings button')
  source = replaceOnce(source, '    appointments.forEach(appointment => items.push({', '    const events = Array.isArray(payload?.staff?.events) ? payload.staff.events : []\n    events.forEach(event => items.push({ id: `event:${event.id}`, type: event.type || \'system\', iconName: event.type === \'store_inflow\' ? \'store\' : event.type === \'new_registration\' ? \'user\' : \'bell\', title: event.title || \'お知らせ\', body: event.body || \'\', time: event.createdAt, href: event.href || \'/admin/appointments?notificationHistory=1\' }))\n    appointments.forEach(appointment => items.push({', 'notification events panel')
  source = replaceBetween(source, '  function notificationHistoryItems(', '\n  function renderNotificationHistory', '  ' + code(notificationHistoryItems).replaceAll('\n', '\n  '), 'notification event history')
  source = replaceOnce(source, "item.type === 'message' ? 'message' : 'calendar'", "item.type === 'message' ? 'message' : item.type === 'appointment' ? 'calendar' : item.type === 'store_inflow' ? 'store' : item.type === 'new_registration' ? 'user' : 'bell'", 'notification history event icon')
  source = replaceOnce(source, "${item.type === 'message' ? 'メッセージ' : '予約'}", "${item.type === 'message' ? 'メッセージ' : item.type === 'appointment' ? '予約' : item.type === 'new_registration' ? '新規登録' : item.type === 'store_inflow' ? '流入' : item.type === 'duplicate_candidate' ? '要確認' : item.type === 'reservation_import' ? '自動取込' : 'システム'}", 'notification history event label')
  source = replaceOnce(source, '    const count = Math.max(0, appointmentUnread + Number(payload?.staff?.messageCount || 0) + systemUnread)', '    const count = Math.max(0, appointmentUnread + Number(payload?.staff?.messageCount || 0) + Number(payload?.staff?.eventCount || 0) + systemUnread)', 'notification event badge count')
  source = replaceOnce(source, '<button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="message">メッセージ</button>', '<button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="message">メッセージ</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="new_registration">新規登録</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="store_inflow">流入</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="reservation_import">自動取込</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="duplicate_candidate">要確認</button>', 'notification history tabs')
  source = replaceOnce(source, "      const firstChild = root.firstElementChild\n      if (firstChild) firstChild.insertAdjacentElement('afterend', section); else root.appendChild(section)", "      const firstChild = root.firstElementChild\n      if (firstChild) firstChild.insertAdjacentElement('afterend', section); else root.appendChild(section)\n      if (profile.canEdit) {\n        const iconCard = document.createElement('form')\n        iconCard.className = 'ca-form-card ca-store-icon-card'\n        iconCard.innerHTML = `<h3>店舗アイコン</h3><p>顧客アプリと店舗一覧に表示します。正方形のJPEG・PNG・WebP画像を選択してください。</p><div style=\"display:flex;align-items:center;gap:16px\"><img src=\"/api/lien-store-icon?v=${Date.now()}\" alt=\"現在の店舗アイコン\" style=\"width:72px;height:72px;border:1px solid #eaded9;border-radius:20px;object-fit:cover\"><label class=\"ca-account-link\">画像を選ぶ<input type=\"file\" accept=\"image/jpeg,image/png,image/webp\" hidden required></label><button type=\"submit\" class=\"ca-submit\">${icon('check')}保存</button></div><p class=\"ca-feedback\" role=\"status\"></p>`\n        section.querySelector('.ca-profile-grid')?.insertAdjacentElement('afterend', iconCard)\n        iconCard.addEventListener('submit', async event => {\n          event.preventDefault(); const file = iconCard.querySelector('input[type=file]').files[0]; const feedback = iconCard.querySelector('.ca-feedback'); const button = iconCard.querySelector('button'); if (!file) return\n          try {\n            const imageDataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('画像を読み込めませんでした。')); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('画像を読み込めませんでした。')); image.onload = () => image.naturalWidth === image.naturalHeight ? resolve(reader.result) : reject(new Error('正方形の画像を選択してください。')); image.src = reader.result }; reader.readAsDataURL(file) })\n            button.disabled = true; const response = await fetch('/api/admin/store-icon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ imageDataUrl }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '保存できませんでした。'); iconCard.querySelector('img').src = result.iconUrl; feedback.textContent = '店舗アイコンを保存しました。'; toast('店舗アイコンを保存しました。', 'success')\n          } catch (error) { feedback.textContent = error.message; toast(error.message, 'error') } finally { button.disabled = false }\n        })\n      }", 'store icon settings')
  write(name, source)
}

// ----- inbound-email.js -----
{
  const name = 'inbound-email.js'
  let source = read(name)
  source = replaceOnce(source, '      const appointmentId = await importParsedReservation(organizationId, parsed, payload)', '      const appointmentId = await importParsedReservation(organizationId, parsed, payload)\n      await prisma.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT NOT NULL,"source" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)\')\n      await prisma.$executeRawUnsafe(\'CREATE UNIQUE INDEX IF NOT EXISTS "StaffSystemNotification_org_type_entity_key" ON "StaffSystemNotification"("organizationId","type","entityId")\')\n      await prisma.$executeRawUnsafe(\'INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\\\'reservation_import\\\',\\\'予約メールを取り込みました\\\',$3,$4,\\\'appointment\\\',$5,\\\'inbound_email\\\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING\', crypto.randomUUID(), organizationId, `${parsed.customerName || \'お客様\'}様 / ${parsed.menu || \'メニュー相談\'}`, `/admin/appointments/${encodeURIComponent(appointmentId)}`, reserved.id)', 'reservation import notification')
  write(name, source)
}

console.log(`Patched ${touched.length} runtime files: ${touched.join(', ')}`)
