import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')

server = replaceOnce(
  server,
  `  const requested = url.searchParams.get('threadId')
    const thread = requested ? threads.find(t => t.id === requested) : threads[0]`,
  `  const requested = url.searchParams.get('threadId')
    // Listing conversations must not mark the first thread as read. A thread is
    // read only when its id is explicitly opened by the customer or staff member.
    const thread = requested ? threads.find(t => t.id === requested) : null`,
  'explicit chat open',
)

server = replaceOnce(
  server,
  `  await prisma.$executeRawUnsafe('ALTER TABLE "StaffNotificationState" ADD COLUMN IF NOT EXISTS "eventsReadAt" TIMESTAMP(3)')`,
  `  await prisma.$executeRawUnsafe('ALTER TABLE "StaffNotificationState" ADD COLUMN IF NOT EXISTS "eventsReadAt" TIMESTAMP(3)')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffNotificationRead" ("userId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"notificationType" TEXT NOT NULL,"notificationId" TEXT NOT NULL,"readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY ("userId","notificationType","notificationId"))')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffNotificationRead_org_user_idx" ON "StaffNotificationRead"("organizationId","userId","readAt" DESC)')`,
  'notification read schema',
)

const functionStart = server.indexOf('async function staffNotifications(req, res, options = {}) {')
const functionEnd = server.indexOf('\n\n\nasync function handleWithChatLink', functionStart)
if (functionStart < 0 || functionEnd < 0) throw new Error('staffNotifications function not found')
const notificationImplementation = `async function markStaffNotificationRead(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '不正な送信元です。' })
  await ensureLienEnhancementTables()
  const data = await body(req)
  const notificationType = String(data.type || '')
  const notificationId = String(data.id || '')
  if (!['appointment', 'event'].includes(notificationType) || !notificationId || notificationId.length > 200) {
    return json(res, 400, { error: 'お知らせを特定できません。' })
  }
  const exists = notificationType === 'appointment'
    ? await prisma.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', notificationId, session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT "id" FROM "StaffSystemNotification" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', notificationId, session.organizationId)
  if (!exists.length) return json(res, 404, { error: 'お知らせが見つかりません。' })
  await prisma.$executeRawUnsafe('INSERT INTO "StaffNotificationRead" ("userId","organizationId","notificationType","notificationId","readAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) ON CONFLICT ("userId","notificationType","notificationId") DO UPDATE SET "readAt"=CURRENT_TIMESTAMP,"organizationId"=EXCLUDED."organizationId"', session.userId, session.organizationId, notificationType, notificationId)
  return json(res, 200, { success: true })
}

async function staffNotifications(req, res, options = {}) {
  const history = Boolean(options.history)
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  await syncStaffSystemNotifications(session.organizationId)
  const appointments = history
    ? await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\\'\\') NOT LIKE \\'ses:%\\' ORDER BY a."createdAt" DESC LIMIT 100', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\\'\\') NOT LIKE \\'ses:%\\' AND NOT EXISTS (SELECT 1 FROM "StaffNotificationRead" r WHERE r."userId"=$2 AND r."notificationType"=\\'appointment\\' AND r."notificationId"=a."id") ORDER BY a."createdAt" DESC LIMIT 30', session.organizationId, session.userId)
  const messages = history
    ? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",t."staffLastReadAt",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\\'customer\\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)
    : []
  const events = history
    ? await prisma.$queryRawUnsafe('SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND NOT (n."type"=\\'new_registration\\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\\'store_inflow\\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 150', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND NOT EXISTS (SELECT 1 FROM "StaffNotificationRead" r WHERE r."userId"=$2 AND r."notificationType"=\\'event\\' AND r."notificationId"=n."id") AND NOT (n."type"=\\'new_registration\\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\\'store_inflow\\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 50', session.organizationId, session.userId)
  const readRows = history ? await prisma.$queryRawUnsafe('SELECT "notificationType","notificationId" FROM "StaffNotificationRead" WHERE "userId"=$1 AND "organizationId"=$2', session.userId, session.organizationId) : []
  const readKeys = new Set(readRows.map(item => item.notificationType + ':' + item.notificationId))
  const messageCount = await unreadChatCount(req, 'staff')
  const appointmentItems = appointments.map(item => ({ ...item, isUnread: !readKeys.has('appointment:' + item.id) }))
  const messageItems = messages.map(item => ({ ...item, isUnread: !item.staffLastReadAt || new Date(item.createdAt).getTime() > new Date(item.staffLastReadAt).getTime() }))
  const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))
  return json(res, 200, {
    count: history ? appointmentItems.filter(item => item.isUnread).length + messageCount + eventItems.filter(item => item.isUnread).length : appointments.length + messageCount + events.length,
    appointmentCount: history ? appointmentItems.filter(item => item.isUnread).length : appointments.length,
    messageCount,
    eventCount: history ? eventItems.filter(item => item.isUnread).length : events.length,
    appointments: appointmentItems,
    messages: messageItems,
    events: eventItems,
  })
}`
server = server.slice(0, functionStart) + notificationImplementation + server.slice(functionEnd)

server = replaceOnce(
  server,
  `      if (url.pathname === '/api/lien-staff-notifications') return await staffNotifications(req, res, { markRead: url.searchParams.get('read') === '1', history: url.searchParams.get('history') === '1' })`,
  `      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'POST') return await markStaffNotificationRead(req, res)
      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'GET') return await staffNotifications(req, res, { history: url.searchParams.get('history') === '1' })`,
  'notification routes',
)
fs.writeFileSync(serverPath, server)

const adminPath = '/app/commercial-admin-v101.js'
let admin = fs.readFileSync(adminPath, 'utf8')
admin = replaceOnce(
  admin,
  `    const appointmentUnread = state.notificationAppointmentsRead ? 0 : Number(payload?.staff?.appointmentCount || 0)
    const count = Math.max(0, appointmentUnread + Number(payload?.staff?.messageCount || 0) + Number(payload?.staff?.eventCount || 0) + systemUnread)`,
  `    const count = Math.max(0, Number(payload?.staff?.count || 0) + systemUnread)`,
  'canonical notification badge count',
)
admin = replaceOnce(
  admin,
  `    const appointments = (Array.isArray(payload?.appointments) ? payload.appointments : []).map(item => ({ id: \`appointment:\${item.id}\`, type: 'appointment', title: \`\${item.customerName || 'お客様'}様の予約\`, body: \`\${item.menu || 'メニュー相談'}\${item.status ? \` / \${item.status}\` : ''}\`, time: item.createdAt, href: \`/admin/appointments/\${encodeURIComponent(item.id)}\`, isUnread: Boolean(item.isUnread) }))
    const messages = (Array.isArray(payload?.messages) ? payload.messages : []).map(item => ({ id: \`message:\${item.id}\`, type: 'message', title: \`\${item.customerName || 'お客様'}様からメッセージ\`, body: item.body || 'メッセージを確認してください。', time: item.createdAt, href: \`/admin/customers/messages?chat=1&threadId=\${encodeURIComponent(item.threadId || '')}\`, isUnread: Boolean(item.isUnread) }))
    const events = (Array.isArray(payload?.events) ? payload.events : []).map(item => ({ id: \`event:\${item.id}\`, type: item.type || 'system', title: item.title || 'お知らせ', body: item.body || '', time: item.createdAt, href: item.href || '/admin/appointments?notificationHistory=1', isUnread: Boolean(item.isUnread) }))`,
  `    const appointments = (Array.isArray(payload?.appointments) ? payload.appointments : []).map(item => ({ id: \`appointment:\${item.id}\`, readType: 'appointment', readId: item.id, type: 'appointment', title: \`\${item.customerName || 'お客様'}様の予約\`, body: \`\${item.menu || 'メニュー相談'}\${item.status ? \` / \${item.status}\` : ''}\`, time: item.createdAt, href: \`/admin/appointments/\${encodeURIComponent(item.id)}\`, isUnread: Boolean(item.isUnread) }))
    const messages = (Array.isArray(payload?.messages) ? payload.messages : []).map(item => ({ id: \`message:\${item.id}\`, readType: 'message', readId: item.threadId, type: 'message', title: \`\${item.customerName || 'お客様'}様からメッセージ\`, body: item.body || 'メッセージを確認してください。', time: item.createdAt, href: \`/admin/customers/messages?chat=1&threadId=\${encodeURIComponent(item.threadId || '')}\`, isUnread: Boolean(item.isUnread) }))
    const events = (Array.isArray(payload?.events) ? payload.events : []).map(item => ({ id: \`event:\${item.id}\`, readType: 'event', readId: item.id, type: item.type || 'system', title: item.title || 'お知らせ', body: item.body || '', time: item.createdAt, href: item.href || '/admin/appointments?notificationHistory=1', isUnread: Boolean(item.isUnread) }))`,
  'notification item identities',
)
admin = replaceOnce(
  admin,
  `list.innerHTML = visible.length ? visible.map(item => \`<a class="ca-notification-history-item \${esc(item.type)} \${item.isUnread ? 'is-unread' : 'is-read'}" href="\${esc(item.href)}">`,
  `list.innerHTML = visible.length ? visible.map(item => \`<a class="ca-notification-history-item \${esc(item.type)} \${item.isUnread ? 'is-unread' : 'is-read'}" href="\${esc(item.href)}" data-ca-notification-read-type="\${esc(item.readType || '')}" data-ca-notification-read-id="\${esc(item.readId || '')}" data-ca-notification-unread="\${item.isUnread ? '1' : '0'}">`,
  'notification history data attributes',
)
admin = replaceOnce(
  admin,
  `    document.documentElement.dataset.caNotificationHistoryNavigation = '1'
    document.addEventListener('click', event => {`,
  `    document.documentElement.dataset.caNotificationHistoryNavigation = '1'
    document.addEventListener('click', async event => {`,
  'async notification navigation',
)
admin = replaceOnce(
  admin,
  `      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(target.href)`,
  `      event.preventDefault()
      event.stopImmediatePropagation()
      const readType = anchor.dataset.caNotificationReadType || ''
      const readId = anchor.dataset.caNotificationReadId || ''
      const shouldMark = anchor.dataset.caNotificationUnread === '1' && ['appointment', 'event'].includes(readType) && readId
      if (shouldMark) {
        try {
          await fetch('/api/lien-staff-notifications', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: readType, id: readId }), keepalive: true })
        } catch {}
      }
      window.location.assign(target.href)`,
  'mark notification on explicit open',
)
admin = replaceOnce(
  admin,
  `    fetch('/api/lien-staff-notifications?history=1&read=1', { credentials: 'same-origin', cache: 'no-store' })`,
  `    fetch('/api/lien-staff-notifications?history=1', { credentials: 'same-origin', cache: 'no-store' })`,
  'do not mark notification list as read',
)
fs.writeFileSync(adminPath, admin)

const tenantPath = '/app/tenant-setup-client.js'
let tenant = fs.readFileSync(tenantPath, 'utf8')
tenant = replaceOnce(
  tenant,
  `  function alignShiftTimeHeader() {`,
  `  function manualAppointmentLauncher() {
    return Array.from(document.querySelectorAll('button')).find(button => button.textContent.replace(/\\s+/g, ' ').trim() === '電話・店頭予約を登録') || null
  }

  function hideManualAppointmentLauncher() {
    if (!isShiftRoute()) return
    const button = manualAppointmentLauncher()
    if (!button) return
    button.dataset.tsManualAppointmentLauncher = '1'
    button.hidden = true
    button.style.setProperty('display', 'none', 'important')
    button.setAttribute('aria-hidden', 'true')
    button.tabIndex = -1
  }

  function presetManualAppointmentDialog(lane, startMinutes, attempt = 0) {
    const dialog = document.querySelector('[aria-labelledby="manual-appointment-title"]')
    if (!dialog) {
      if (attempt < 12) window.setTimeout(() => presetManualAppointmentDialog(lane, startMinutes, attempt + 1), 25)
      return
    }
    const hour = String(Math.floor(startMinutes / 60)).padStart(2, '0')
    const minute = String(startMinutes % 60).padStart(2, '0')
    const startInput = dialog.querySelector('input[name="startTime"]')
    const staffSelect = dialog.querySelector('select[name="staffName"]')
    if (startInput) {
      startInput.value = hour + ':' + minute
      startInput.dispatchEvent(new Event('input', { bubbles: true }))
      startInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (staffSelect) {
      const exact = Array.from(staffSelect.options).find(option => option.value === lane.dataset.staffName)
      if (exact) staffSelect.value = exact.value
      staffSelect.dispatchEvent(new Event('change', { bubbles: true }))
    }
    dialog.querySelector('select[name="customerId"]')?.focus()
  }

  function openManualAppointmentFromLane(event, lane) {
    if (!isShiftRoute() || event.target.closest('button,a,input,select,textarea,label')) return
    const canvas = lane.closest('.shift-canvas')
    const launcher = manualAppointmentLauncher()
    if (!canvas || !launcher) return
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule?.openMinutes || 600)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule?.closeMinutes || 1140)
    const rect = lane.getBoundingClientRect()
    if (!rect.width || closeMinutes <= openMinutes) return
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const rawMinutes = openMinutes + ratio * (closeMinutes - openMinutes)
    const startMinutes = Math.max(openMinutes, Math.min(closeMinutes - 15, Math.round(rawMinutes / 15) * 15))
    event.preventDefault()
    event.stopPropagation()
    launcher.click()
    presetManualAppointmentDialog(lane, startMinutes)
  }

  function alignShiftTimeHeader() {`,
  'manual appointment shift helpers',
)
tenant = replaceOnce(
  tenant,
  `    normalizeShiftNowMarker()
    enhanceManualReservationDialog()`,
  `    normalizeShiftNowMarker()
    hideManualAppointmentLauncher()
    document.querySelectorAll('.shift-lane').forEach(lane => {
      lane.title = '空いている時間をダブルクリックして電話・店頭予約を登録'
      lane.style.cursor = 'crosshair'
    })
    enhanceManualReservationDialog()`,
  'hide launcher and annotate lanes',
)
tenant = replaceOnce(
  tenant,
  `    document.addEventListener('pointerup', event => {`,
  `    document.addEventListener('dblclick', event => {
      const lane = event.target.closest?.('.shift-lane')
      if (lane) openManualAppointmentFromLane(event, lane)
    }, true)
    document.addEventListener('pointerup', event => {`,
  'shift double click listener',
)
fs.writeFileSync(tenantPath, tenant)
