import fs from 'node:fs'

const root = process.argv[2] || '/app'

function update(name, transform) {
  const file = `${root}/${name}`
  const before = fs.readFileSync(file, 'utf8')
  const after = transform(before)
  if (after === before) throw new Error(`${name}: patch made no changes`)
  fs.writeFileSync(file, after, 'utf8')
  console.log(`Patched ${name}`)
}

function replaceOnce(source, from, to, label) {
  const index = source.indexOf(from)
  if (index < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(from, index + from.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, index) + to + source.slice(index + from.length)
}

// Account profiles belong to Staff Management. Keep account settings focused on login and theme.
update('admin-staff-experience-v276.js', source => replaceOnce(
  source,
  `  async function ensureAccountProfile() {\n    if (location.pathname !== '/admin/account') return`,
  `  async function ensureAccountProfile() {\n    if (location.pathname === '/admin/account') {\n      document.querySelectorAll('[data-sm-account-profile]').forEach(node => node.remove())\n      return\n    }\n    if (location.pathname !== '/admin/account') return`,
  'disable duplicated account profile editor',
))

// Make manual bookings resolve price and duration from this tenant's registered menu.
update('appointment-operations-v267.js', source => {
  source = replaceOnce(
    source,
    `    const durationMinutes = Number(body.durationMinutes)\n    validateTime(startMinutes, durationMinutes)\n    const menu = cleanText(body.menu, 120, true)\n    const note = cleanText(body.note, 500)\n    const priceText = String(body.estimatedPrice ?? '').trim()\n    const estimatedPrice = priceText === '' ? null : Number(priceText)\n    if (estimatedPrice !== null && (!Number.isInteger(estimatedPrice) || estimatedPrice < 0 || estimatedPrice > 1000000)) throw new RequestError('`,
    `    const requestedDurationMinutes = Number(body.durationMinutes)\n    validateTime(startMinutes, requestedDurationMinutes)\n    const requestedMenu = cleanText(body.menu, 120, true)\n    const note = cleanText(body.note, 500)\n    const priceText = String(body.estimatedPrice ?? '').trim()\n    const submittedPrice = priceText === '' ? null : Number(priceText)\n    if (submittedPrice !== null && (!Number.isInteger(submittedPrice) || submittedPrice < 0 || submittedPrice > 1000000)) throw new RequestError('`,
    'manual booking submitted values',
  )
  source = replaceOnce(
    source,
    `    const result = await prisma.$transaction(async tx => {\n      const customer = await resolveManualCustomer(tx, session.organizationId, body)`,
    `    const result = await prisma.$transaction(async tx => {\n      const menuRows = await tx.$queryRawUnsafe('SELECT "id","name","durationMinutes","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE AND LOWER("name")=LOWER($2) LIMIT 1', session.organizationId, requestedMenu)\n      const registeredMenu = menuRows[0] || null\n      const menu = registeredMenu ? String(registeredMenu.name) : requestedMenu\n      const durationMinutes = registeredMenu ? Number(registeredMenu.durationMinutes) : requestedDurationMinutes\n      const estimatedPrice = registeredMenu ? Number(registeredMenu.priceYen) : submittedPrice\n      validateTime(startMinutes, durationMinutes)\n      const customer = await resolveManualCustomer(tx, session.organizationId, body)`,
    'manual booking authoritative catalog lookup',
  )
  return source
})

// De-duplicate store inflow notifications and chat staff at the API boundary.
update('server.js', source => {
  const loopStart = source.indexOf('  for (const customer of recentCustomers) {', source.indexOf('async function syncStaffSystemNotifications'))
  const loopEnd = source.indexOf('\n  const duplicates =', loopStart)
  if (loopStart < 0 || loopEnd < 0) throw new Error('notification registration loop not found')
  const notificationLoop = `  for (const customer of recentCustomers) {\n    const inflow = await prisma.$queryRawUnsafe('SELECT "id" FROM "StaffSystemNotification" WHERE "organizationId"=$1 AND "type"=\\'store_inflow\\' AND "entityId"=$2 LIMIT 1', organizationId, customer.id)\n    if (inflow.length) continue\n    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\\'new_registration\\',\\'新しいお客様が登録されました\\',$3,$4,\\'customer\\',$5,\\'customer_registration\\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, \`${'${customer.name || \'お客様\'}'}様の顧客情報を確認してください。\`, \`/admin/customers/${'${encodeURIComponent(customer.id)}'}\`, customer.id)\n  }`
  source = source.slice(0, loopStart) + notificationLoop + source.slice(loopEnd)

  const historyQuery = `'SELECT "id","type","title","body","href","source","createdAt" FROM "StaffSystemNotification" WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 150'`
  const historyDeduped = `'SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND NOT (n."type"=\\'new_registration\\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\\'store_inflow\\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 150'`
  source = replaceOnce(source, historyQuery, historyDeduped, 'notification history dedupe')
  const unreadQuery = `'SELECT "id","type","title","body","href","source","createdAt" FROM "StaffSystemNotification" WHERE "organizationId"=$1 AND "createdAt">$2 ORDER BY "createdAt" DESC LIMIT 50'`
  const unreadDeduped = `'SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND n."createdAt">$2 AND NOT (n."type"=\\'new_registration\\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\\'store_inflow\\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 50'`
  source = replaceOnce(source, unreadQuery, unreadDeduped, 'notification unread dedupe')

  source = replaceOnce(
    source,
    `    const requested = url.searchParams.get('threadId')`,
    `    if (audience === 'customer') {\n      const seenStaff = new Set()\n      threads = threads.filter(thread => {\n        const identity = String(thread.staffName || thread.staffKey || '').normalize('NFKC').replace(/[\\s　]+/g, '').toLowerCase()\n        if (!identity || seenStaff.has(identity)) return false\n        seenStaff.add(identity)\n        return true\n      })\n    }\n    const requested = url.searchParams.get('threadId')`,
    'customer chat thread dedupe',
  )
  source = replaceOnce(
    source,
    `    return json(res, 200, { threads, thread: thread || null, messages, staff: organizationStaff })`,
    `    const existingStaffKeys = new Set(threads.map(item => String(item.staffKey || '')))\n    const existingStaffNames = new Set(threads.map(item => String(item.staffName || '').normalize('NFKC').replace(/[\\s　]+/g, '').toLowerCase()))\n    const seenDirectory = new Set()\n    const availableStaff = organizationStaff.filter(item => {\n      const identity = String(item.name || item.key || '').normalize('NFKC').replace(/[\\s　]+/g, '').toLowerCase()\n      if (!identity || seenDirectory.has(identity) || existingStaffKeys.has(String(item.key || '')) || existingStaffNames.has(identity)) return false\n      seenDirectory.add(identity)\n      return true\n    })\n    return json(res, 200, { threads, thread: thread || null, messages, staff: audience === 'customer' ? availableStaff : organizationStaff })`,
    'customer chat available staff',
  )
  return source
})

// Customer chat: avatars, unique rooms and a clear empty state for already-contacted staff.
update('customer-experience-v278.js', source => {
  source = replaceOnce(
    source,
    `  function syncChatStaffSelector(select, directory) {`,
    `  function syncChatStaffSelector(select, directory) {\n    const unique = []\n    const seen = new Set()\n    directory.forEach(item => {\n      const identity = normalizedName(item?.name || item?.key).toLowerCase()\n      if (!identity || seen.has(identity)) return\n      seen.add(identity)\n      unique.push(item)\n    })\n    directory = unique`,
    'chat directory dedupe',
  )
  source = replaceOnce(
    source,
    `      const image = avatarElement(item)\n      if (image) link.prepend(image)`,
    `      const image = avatarElement(item) || fallbackAvatar(item || { name: strong?.textContent || '担当' })\n      link.prepend(image)`,
    'chat thread fallback avatar',
  )
  source = replaceOnce(
    source,
    `      const image = avatarElement(item)\n      heading.classList.add('cx-chat-heading')\n      if (image) heading.prepend(image)`,
    `      const image = avatarElement(item) || fallbackAvatar(item || { name: heading.textContent || '担当' })\n      heading.classList.add('cx-chat-heading')\n      heading.prepend(image)`,
    'chat heading fallback avatar',
  )
  source = replaceOnce(
    source,
    `    syncChatStaffSelector(select, directory)\n    if (form && select && !form.querySelector('.cx-chat-profile')) {`,
    `    const threadNames = new Set([...document.querySelectorAll('.customer-chat-thread-list a strong,#threads .thread strong')].map(node => normalizedName(node.textContent).toLowerCase()))\n    const available = directory.filter(item => !threadNames.has(normalizedName(item.name).toLowerCase()))\n    syncChatStaffSelector(select, available)\n    if (form && select && available.length === 0) {\n      form.querySelectorAll('textarea,button[type="submit"],input[type="submit"]').forEach(node => { node.disabled = true })\n      if (!form.querySelector('.cx-chat-all-open')) {\n        const note = document.createElement('p')\n        note.className = 'cx-chat-all-open'\n        note.textContent = '相談できるスタッフとのトークはすでに作成されています。左の一覧から会話を選んでください。'\n        form.appendChild(note)\n      }\n    }\n    if (form && select && !form.querySelector('.cx-chat-profile')) {`,
    'chat existing thread exclusion',
  )
  source = replaceOnce(
    source,
    `.cx-staff-avatar-fallback{display:grid!important;place-items:center;background:hsl(var(--cx-staff-hue) 42% 91%)!important;color:hsl(var(--cx-staff-hue) 38% 32%)!important;font-weight:800}`,
    `.cx-staff-avatar-fallback{display:grid!important;place-items:center;background:hsl(var(--cx-staff-hue) 42% 91%)!important;color:hsl(var(--cx-staff-hue) 38% 32%)!important;font-weight:800}.cx-chat-thread{display:grid!important;grid-template-columns:44px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;min-height:68px!important;padding:12px 14px!important}.cx-chat-thread>.cx-staff-avatar,.cx-chat-heading>.cx-staff-avatar{width:44px!important;height:44px!important;border-radius:50%!important;object-fit:cover!important}.cx-chat-thread strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cx-chat-heading{display:flex!important;align-items:center!important;gap:12px!important}.cx-chat-profile{display:flex!important;align-items:center!important;gap:12px!important;border:1px solid #eaded6!important;border-radius:16px!important;background:#fffaf7!important;padding:12px!important}.cx-chat-profile>div{display:grid!important;gap:3px!important}.cx-chat-profile span{color:#806f68!important;font-size:12px!important}.cx-chat-all-open{margin:0!important;border:1px solid #d8e6de!important;border-radius:14px!important;background:#f3faf6!important;padding:12px 14px!important;color:#426452!important;font-size:13px!important;line-height:1.7!important}`,
    'chat commercial styles',
  )
  return source
})

// Admin UX: restore distribution settings, remove duplicate account editor,
// bind manual booking to the menu catalog and make store settings self-explanatory.
update('commercial-admin-v101.js', source => {
  source = replaceOnce(
    source,
    `  function settingsContext() {\n    if (location.pathname !== '/admin/products') return null\n    const section = new URLSearchParams(location.search).get('section') || 'products'`,
    `  function settingsContext() {\n    const params = new URLSearchParams(location.search)\n    if (location.pathname === '/admin/customers/messages' && params.get('chat') !== '1') return { panelKey: 'points', label: 'ポイント・抽選・クーポン設定' }\n    if (location.pathname !== '/admin/products') return null\n    const section = params.get('section') || 'products'`,
    'distribution settings context',
  )

  const anchor = `  function enhance() {\n    enforceAdminSquareImageInputs();`
  const helpers = String.raw`  let caManualMenusPromise = null
  function manualMenus() {
    if (!caManualMenusPromise) caManualMenusPromise = fetch('/api/admin/catalog?kind=menus', { credentials: 'same-origin' }).then(async response => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'メニューを取得できませんでした。')
      return (payload.menus || []).filter(menu => menu.active)
    }).catch(error => { caManualMenusPromise = null; throw error })
    return caManualMenusPromise
  }

  async function enhanceManualAppointmentMenu() {
    if (location.pathname !== '/admin/appointments') return
    const dialog = document.querySelector('[aria-labelledby="manual-appointment-title"]')
    if (!dialog || dialog.dataset.caMenuCatalog === 'loading' || dialog.dataset.caMenuCatalog === 'ready') return
    const input = dialog.querySelector('input[name="menu"]')
    if (!input) return
    dialog.dataset.caMenuCatalog = 'loading'
    try {
      const menus = await manualMenus()
      const select = document.createElement('select')
      select.name = 'menu'
      select.required = true
      select.className = input.className
      select.setAttribute('aria-label', 'メニュー')
      select.innerHTML = '<option value="" disabled selected>メニューを選択</option>' + menus.map(menu => '<option value="' + esc(menu.name) + '" data-price="' + Number(menu.priceYen) + '" data-duration="' + Number(menu.durationMinutes) + '">' + esc(menu.name) + '（' + Number(menu.priceYen).toLocaleString('ja-JP') + '円）</option>').join('')
      const price = dialog.querySelector('input[name="estimatedPrice"]')
      const duration = dialog.querySelector('input[name="durationMinutes"]')
      const apply = () => {
        const option = select.selectedOptions[0]
        if (!option?.value) return
        if (price) { price.value = option.dataset.price || ''; price.readOnly = true; price.setAttribute('aria-readonly', 'true') }
        if (duration && option.dataset.duration) duration.value = option.dataset.duration
      }
      select.addEventListener('change', apply)
      input.replaceWith(select)
      dialog.dataset.caMenuCatalog = 'ready'
    } catch (error) {
      dialog.dataset.caMenuCatalog = 'error'
      input.setCustomValidity(error.message)
      input.reportValidity()
    }
  }

  function removeAccountProfileEditors() {
    if (location.pathname !== '/admin/account') return
    document.querySelectorAll('[data-sm-account-profile],form[action="/api/lien-staff-introduction"]').forEach(node => node.remove())
  }

  async function enhanceStoreOperationsDetails() {
    if (location.pathname !== '/admin/settings') return
    const section = document.querySelector('[data-ca-store-settings]')
    if (!section) return
    const iconCard = section.querySelector('.ca-store-icon-card')
    if (iconCard && iconCard.dataset.caIconUx !== 'ready') {
      iconCard.dataset.caIconUx = 'ready'
      const input = iconCard.querySelector('input[type="file"]')
      const preview = iconCard.querySelector('img')
      const feedback = iconCard.querySelector('.ca-feedback')
      const button = iconCard.querySelector('button[type="submit"]')
      const status = document.createElement('span')
      status.className = 'ca-icon-status'
      status.textContent = '現在の店舗アイコン'
      preview.insertAdjacentElement('afterend', status)
      let objectUrl = ''
      input?.addEventListener('change', () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        const file = input.files?.[0]
        if (!file) return
        objectUrl = URL.createObjectURL(file)
        preview.src = objectUrl
        status.textContent = file.name + '（保存前）'
        status.classList.add('is-pending')
      })
      iconCard.addEventListener('submit', () => {
        if (button) { button.dataset.caOriginalLabel = button.textContent; button.textContent = '保存中…' }
        status.textContent = '店舗専用アイコンを保存しています…'
        const observer = new MutationObserver(() => {
          if (!feedback.textContent.trim()) return
          observer.disconnect()
          if (button) button.textContent = button.dataset.caOriginalLabel || '保存'
          status.textContent = feedback.textContent.trim()
          status.classList.toggle('is-success', !feedback.classList.contains('error'))
          status.classList.remove('is-pending')
        })
        observer.observe(feedback, { childList: true, characterData: true, subtree: true })
      }, true)
    }
    if (!section.querySelector('[data-ca-inbound-email]')) {
      const card = document.createElement('section')
      card.className = 'ca-form-card ca-readonly-card'
      card.dataset.caInboundEmail = 'loading'
      card.innerHTML = '<h3>Hotpepper予約受信用メール</h3><p>この店舗専用の受信先を確認しています…</p>'
      ;(iconCard || section.querySelector('.ca-profile-grid'))?.insertAdjacentElement('afterend', card)
      try {
        const response = await fetch('/api/admin/store-profile', { credentials: 'same-origin' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '受信先を取得できませんでした。')
        const address = payload.profile?.setup?.inboundAddress || '未発行'
        const last = payload.profile?.setup?.lastInboundAt
        card.dataset.caInboundEmail = 'ready'
        card.innerHTML = '<div class="ca-readonly-head"><span class="symbol">' + icon('mail') + '</span><div><h3>Hotpepper予約受信用メール</h3><p>Hotpepperの予約通知先へ追加する、この店舗専用アドレスです。店舗側では変更できません。</p></div></div><div class="ca-readonly-value"><code>' + esc(address) + '</code><span>変更不可</span></div>' + (last ? '<small>最終受信 ' + esc(notificationTime(last)) + '</small>' : '')
      } catch (error) {
        card.dataset.caInboundEmail = 'error'
        card.innerHTML = '<h3>Hotpepper予約受信用メール</h3><p class="ca-feedback error">' + esc(error.message) + '</p>'
      }
    }
  }

`
  source = replaceOnce(source, anchor, helpers + anchor, 'commercial operation helpers')
  source = replaceOnce(
    source,
    `    enforceAdminSquareImageInputs(); styles(); applyAdminTheme(savedAdminTheme()); normalizeServiceBrand(); normalizeSidebarControl(); removeCommandPalette(); removeHeaderSearch(); enhanceHeader(); enhanceMenuPage(); enhanceSettingsPage(); enhanceAccountTheme(); enhanceContextSettings(); enhanceNotificationHistoryPage()`,
    `    enforceAdminSquareImageInputs(); styles(); applyAdminTheme(savedAdminTheme()); normalizeServiceBrand(); normalizeSidebarControl(); removeCommandPalette(); removeHeaderSearch(); enhanceHeader(); enhanceMenuPage(); enhanceSettingsPage(); enhanceAccountTheme(); enhanceContextSettings(); enhanceNotificationHistoryPage(); removeAccountProfileEditors(); enhanceManualAppointmentMenu(); enhanceStoreOperationsDetails()`,
    'commercial enhance calls',
  )
  source = replaceOnce(
    source,
    `.ca-profile-grid{grid-template-columns:1.35fr .65fr}.ca-form-card-wide`,
    `.ca-icon-status{display:inline-flex;max-width:220px;align-items:center;border-radius:999px;background:#f4eeea;padding:7px 10px;color:#78665f;font-size:10px;font-weight:800}.ca-icon-status.is-pending{background:#fff3df;color:#855f25}.ca-icon-status.is-success{background:#eaf6ef;color:#356348}.ca-readonly-card{margin:0 24px 20px}.ca-readonly-head{display:flex;gap:11px;align-items:flex-start}.ca-readonly-head .symbol{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border-radius:12px;background:#f7e8e2;color:#a65748}.ca-readonly-head svg{width:17px;height:17px}.ca-readonly-head h3{margin:0}.ca-readonly-head p{margin:5px 0 0!important}.ca-readonly-value{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;border:1px solid #ead9d1;border-radius:13px;background:#fffaf7;padding:0 14px}.ca-readonly-value code{overflow:hidden;color:#40322d;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.ca-readonly-value span{flex:0 0 auto;border-radius:999px;background:#eee7e3;padding:5px 8px;color:#7c6e68;font-size:9px;font-weight:900}.ca-readonly-card>small{display:block;margin-top:8px;color:#8c7d76;font-size:9px}.ca-profile-grid{grid-template-columns:1.35fr .65fr}.ca-form-card-wide`,
    'commercial store detail styles',
  )
  return source
})

console.log('Release 290 commercial operations patch complete.')
