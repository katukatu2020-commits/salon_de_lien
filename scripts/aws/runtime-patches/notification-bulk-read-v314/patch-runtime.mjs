import fs from 'node:fs'

const serverFile = '/app/server.js'
const adminFile = '/app/commercial-admin-v101.js'

const replaceBetween = (source, start, end, replacement, label) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0 || endIndex < 0) throw new Error(`unable to locate ${label}`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let server = fs.readFileSync(serverFile, 'utf8')
server = replaceBetween(
  server,
  'async function markStaffNotificationRead(req, res) {',
  '\n\nasync function staffNotifications',
  `async function markStaffNotificationRead(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '不正な送信元です。' })
  await ensureLienEnhancementTables()
  const data = await body(req)
  const submitted = Array.isArray(data.notifications) ? data.notifications : [{ type: data.type, id: data.id }]
  if (!submitted.length || submitted.length > 100) return json(res, 400, { error: '1件以上100件以下の通知を選択してください。' })

  const notifications = []
  const seen = new Set()
  for (const candidate of submitted) {
    const type = String(candidate?.type || '')
    const id = String(candidate?.id || '')
    if (!['appointment', 'event', 'message'].includes(type) || !id || id.length > 200) {
      return json(res, 400, { error: '既読にする通知を特定できません。' })
    }
    const key = type + ':' + id
    if (!seen.has(key)) { seen.add(key); notifications.push({ type, id }) }
  }

  const validated = []
  for (const notification of notifications) {
    if (notification.type === 'appointment') {
      const rows = await prisma.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', notification.id, session.organizationId)
      if (!rows.length) return json(res, 404, { error: '選択した予約通知が見つかりません。' })
      validated.push(notification)
      continue
    }
    if (notification.type === 'event') {
      const rows = await prisma.$queryRawUnsafe('SELECT "id" FROM "StaffSystemNotification" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', notification.id, session.organizationId)
      if (!rows.length) return json(res, 404, { error: '選択したシステム通知が見つかりません。' })
      validated.push(notification)
      continue
    }
    const rows = await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",t."id" AS "threadId" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE m."id"=$1 AND t."organizationId"=$2 AND m."senderType"=\\'customer\\' LIMIT 1', notification.id, session.organizationId)
    if (!rows.length) return json(res, 404, { error: '選択したメッセージ通知が見つかりません。' })
    validated.push({ ...notification, threadId: rows[0].threadId, createdAt: rows[0].createdAt })
  }

  await prisma.$transaction(async tx => {
    for (const notification of validated) {
      if (notification.type === 'message') {
        await tx.$executeRawUnsafe('UPDATE "ChatThread" SET "staffLastReadAt"=CASE WHEN "staffLastReadAt" IS NULL OR "staffLastReadAt"<$1 THEN $1 ELSE "staffLastReadAt" END WHERE "id"=$2 AND "organizationId"=$3', notification.createdAt, notification.threadId, session.organizationId)
      } else {
        await tx.$executeRawUnsafe('INSERT INTO "StaffNotificationRead" ("userId","organizationId","notificationType","notificationId","readAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) ON CONFLICT ("userId","notificationType","notificationId") DO UPDATE SET "readAt"=CURRENT_TIMESTAMP,"organizationId"=EXCLUDED."organizationId"', session.userId, session.organizationId, notification.type, notification.id)
      }
    }
  })
  return json(res, 200, { success: true, marked: validated.length })
}`,
  'staff notification read handler',
)
fs.writeFileSync(serverFile, server)

let admin = fs.readFileSync(adminFile, 'utf8')
const messageReadId = "readType: 'message', readId: item.threadId"
if ((admin.split(messageReadId).length - 1) !== 1) throw new Error('expected one message read id mapping')
admin = admin.replace(messageReadId, "readType: 'message', readId: item.id")

const styleAnchor = '      .ca-notification-history-count{color:var(--ca-muted,#7c7168);font-size:12px;font-weight:700;white-space:nowrap}.ca-notification-history-list{display:grid;gap:10px}'
if (!admin.includes(styleAnchor)) throw new Error('notification history style anchor missing')
admin = admin.replace(styleAnchor, `      .ca-notification-history-count{color:var(--ca-muted,#7c7168);font-size:12px;font-weight:700;white-space:nowrap}
      .ca-notification-history-selection{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:-2px 0 14px;border:1px solid var(--ca-line,#e8ded2);border-radius:16px;background:var(--ca-paper,#fff);padding:10px 12px}.ca-notification-history-select-all{display:inline-flex;align-items:center;gap:9px;color:var(--ca-ink,#2f2a25);font-size:12px;font-weight:800;cursor:pointer}.ca-notification-history-selection-actions{display:flex;align-items:center;gap:10px}.ca-notification-history-selected{min-width:72px;color:var(--ca-muted,#7c7168);font-size:11px;font-weight:700;text-align:right}.ca-notification-history-bulk{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:7px;border:1px solid var(--ca-primary,#8f4f42);border-radius:999px;background:var(--ca-primary,#8f4f42);padding:0 15px;color:#fff;font:800 12px inherit;cursor:pointer}.ca-notification-history-bulk svg{width:16px;height:16px}.ca-notification-history-bulk:disabled{border-color:var(--ca-line,#e8ded2);background:var(--ca-soft,#f6efe6);color:var(--ca-muted,#7c7168);cursor:not-allowed;opacity:.72}
      .ca-notification-history-list{display:grid;gap:10px}.ca-notification-history-row{display:grid;grid-template-columns:28px minmax(0,1fr);align-items:stretch;gap:8px}.ca-notification-history-check{display:grid;width:28px;place-items:center;cursor:pointer}.ca-notification-history-check input,.ca-notification-history-select-all input{width:18px;height:18px;margin:0;accent-color:var(--ca-primary,#8f4f42);cursor:pointer}.ca-notification-history-check input:disabled{cursor:not-allowed;opacity:.28}`)

const mobileAnchor = '      @media(max-width:700px){.ca-notification-history{padding:0 0 30px}.ca-notification-history-hero{align-items:flex-start;flex-direction:column;padding:21px 18px;border-radius:20px}.ca-notification-history-back{width:100%}.ca-notification-history-toolbar{align-items:flex-start;flex-direction:column}.ca-notification-history-item{grid-template-columns:42px minmax(0,1fr) 16px;gap:11px;min-height:92px;padding:15px 13px}.ca-notification-history-symbol{width:42px;height:42px}.ca-notification-history-count{padding-left:4px}}'
if (!admin.includes(mobileAnchor)) throw new Error('notification history mobile style anchor missing')
admin = admin.replace(mobileAnchor, '      @media(max-width:700px){.ca-notification-history{padding:0 0 30px}.ca-notification-history-hero{align-items:flex-start;flex-direction:column;padding:21px 18px;border-radius:20px}.ca-notification-history-back{width:100%}.ca-notification-history-toolbar{align-items:flex-start;flex-direction:column}.ca-notification-history-selection{align-items:stretch;flex-direction:column}.ca-notification-history-selection-actions{justify-content:space-between}.ca-notification-history-selected{text-align:left}.ca-notification-history-bulk{flex:1}.ca-notification-history-row{grid-template-columns:24px minmax(0,1fr);gap:5px}.ca-notification-history-check{width:24px}.ca-notification-history-item{grid-template-columns:42px minmax(0,1fr) 16px;gap:11px;min-height:92px;padding:15px 13px}.ca-notification-history-symbol{width:42px;height:42px}.ca-notification-history-count{padding-left:4px}}')

admin = replaceBetween(
  admin,
  '  function renderNotificationHistory(root, payload) {',
  '\n\n  function isNotificationHistoryPage()',
  `  function renderNotificationHistory(root, payload) {
    const items = notificationHistoryItems(payload)
    let filter = 'all'
    const selected = new Set()
    const list = root.querySelector('[data-ca-notification-history-list]')
    const count = root.querySelector('[data-ca-notification-history-count]')
    const selectAll = root.querySelector('[data-ca-notification-select-all]')
    const selectedLabel = root.querySelector('[data-ca-notification-selected]')
    const bulkButton = root.querySelector('[data-ca-notification-bulk-read]')

    const visibleItems = () => filter === 'all' ? items : filter === 'unread' ? items.filter(item => item.isUnread) : items.filter(item => item.type === filter)
    const syncSelection = visible => {
      const unreadVisible = visible.filter(item => item.isUnread)
      const visibleSelected = unreadVisible.filter(item => selected.has(item.id)).length
      selectAll.disabled = unreadVisible.length === 0
      selectAll.checked = unreadVisible.length > 0 && visibleSelected === unreadVisible.length
      selectAll.indeterminate = visibleSelected > 0 && visibleSelected < unreadVisible.length
      selectedLabel.textContent = selected.size ? selected.size + '件選択中' : '未選択'
      bulkButton.disabled = selected.size === 0
    }
    const render = () => {
      const visible = visibleItems()
      count.textContent = visible.length + '件'
      list.innerHTML = visible.length ? visible.map(item => '<article class="ca-notification-history-row"><label class="ca-notification-history-check" title="' + (item.isUnread ? '既読にする通知として選択' : '既読済み') + '"><input type="checkbox" aria-label="' + esc(item.title) + 'を選択" data-ca-notification-select="' + esc(item.id) + '" ' + (item.isUnread ? '' : 'disabled') + ' ' + (selected.has(item.id) ? 'checked' : '') + '></label><a class="ca-notification-history-item ' + esc(item.type) + ' ' + (item.isUnread ? 'is-unread' : 'is-read') + '" href="' + esc(item.href) + '" data-ca-notification-read-type="' + esc(item.readType || '') + '" data-ca-notification-read-id="' + esc(item.readId || '') + '" data-ca-notification-unread="' + (item.isUnread ? '1' : '0') + '"><span class="ca-notification-history-symbol">' + icon(item.type === 'message' ? 'message' : item.type === 'appointment' ? 'calendar' : item.type === 'store_inflow' ? 'store' : item.type === 'new_registration' ? 'user' : 'bell') + '</span><span class="ca-notification-history-copy"><span class="ca-notification-history-meta">' + (item.isUnread ? '<span class="ca-notification-history-unread">未読</span>' : '') + '<span class="ca-notification-history-kind">' + (item.type === 'message' ? 'メッセージ' : item.type === 'appointment' ? '予約' : item.type === 'new_registration' ? '新規登録' : item.type === 'store_inflow' ? '流入' : item.type === 'duplicate_candidate' ? '要確認' : item.type === 'reservation_import' ? '自動取込' : 'システム') + '</span><time datetime="' + esc(item.time || '') + '">' + esc(notificationTime(item.time)) + '</time></span><strong>' + esc(item.title) + '</strong><p>' + esc(item.body) + '</p></span><span class="ca-notification-history-arrow">' + icon('chevronRight') + '</span></a></article>').join('') : '<div class="ca-notification-history-empty"><div><span class="symbol">' + icon('bell') + '</span><strong>表示するお知らせはありません</strong><p>新しい予約やメッセージが届くと、ここに残ります。</p></div></div>'
      syncSelection(visible)
    }
    root.querySelectorAll('[data-ca-notification-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.caNotificationFilter || 'all'; root.querySelectorAll('[data-ca-notification-filter]').forEach(candidate => candidate.setAttribute('aria-selected', String(candidate === button))); render() }))
    root.addEventListener('change', event => {
      const checkbox = event.target.closest?.('[data-ca-notification-select]')
      if (checkbox) {
        if (checkbox.checked) selected.add(checkbox.dataset.caNotificationSelect)
        else selected.delete(checkbox.dataset.caNotificationSelect)
        syncSelection(visibleItems())
        return
      }
      if (event.target === selectAll) {
        visibleItems().filter(item => item.isUnread).forEach(item => event.target.checked ? selected.add(item.id) : selected.delete(item.id))
        render()
      }
    })
    bulkButton.addEventListener('click', async () => {
      const targets = items.filter(item => item.isUnread && selected.has(item.id))
      if (!targets.length) return
      bulkButton.disabled = true
      bulkButton.setAttribute('aria-busy', 'true')
      selectedLabel.textContent = '既読にしています…'
      try {
        const response = await fetch('/api/lien-staff-notifications', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifications: targets.map(item => ({ type: item.readType, id: item.readId })) }) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || '選択した通知を既読にできませんでした。')
        targets.forEach(item => { item.isUnread = false })
        selected.clear()
        render()
        selectedLabel.textContent = String(result.marked || targets.length) + '件を既読にしました'
        refreshNotifications(true)
      } catch (error) {
        selectedLabel.textContent = error.message || '既読処理に失敗しました'
        bulkButton.disabled = false
      } finally {
        bulkButton.removeAttribute('aria-busy')
      }
    })
    render()
  }`,
  'notification history renderer',
)

const toolbarEnd = '</div><span class="ca-notification-history-count" data-ca-notification-history-count>読込中</span></div><div class="ca-notification-history-list"'
if (!admin.includes(toolbarEnd)) throw new Error('notification history markup anchor missing')
admin = admin.replace(toolbarEnd, '</div><span class="ca-notification-history-count" data-ca-notification-history-count>読込中</span></div><div class="ca-notification-history-selection"><label class="ca-notification-history-select-all"><input type="checkbox" data-ca-notification-select-all>表示中の未読をすべて選択</label><div class="ca-notification-history-selection-actions"><span class="ca-notification-history-selected" data-ca-notification-selected aria-live="polite">未選択</span><button class="ca-notification-history-bulk" type="button" data-ca-notification-bulk-read disabled>${icon(\'check\')}選択した通知を既読にする</button></div></div><div class="ca-notification-history-list"')

fs.writeFileSync(adminFile, admin)
