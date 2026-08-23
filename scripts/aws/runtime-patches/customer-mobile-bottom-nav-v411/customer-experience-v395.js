(() => {
  if (window.__lienCustomerExperienceV278) return
  window.__lienCustomerExperienceV278 = true

  const css = `
    :root{--customer-nav-height:64px}
    @media(max-width:767px){
      body{padding-bottom:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important;overflow-x:hidden!important}
      .content{padding-bottom:calc(var(--customer-nav-height) + 22px + env(safe-area-inset-bottom))!important}
      .bottom-nav,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"],[data-customer-bottom-nav]{position:fixed!important;z-index:80!important;right:0!important;bottom:0!important;left:0!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;height:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important;min-height:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important;margin:0!important;border:0!important;border-top:1px solid #eadfd4!important;border-radius:0!important;background:rgba(255,253,249,.97)!important;padding:0 0 env(safe-area-inset-bottom)!important;box-shadow:0 -8px 24px rgba(62,42,35,.07)!important;backdrop-filter:blur(14px)!important}
      .bottom-nav,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"]>div,[data-customer-bottom-nav-inner]{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:stretch!important}
      nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"]>div,[data-customer-bottom-nav-inner]{box-sizing:border-box!important;width:100%!important;max-width:none!important;height:var(--customer-nav-height)!important;min-height:var(--customer-nav-height)!important;margin:0!important;padding:0!important}
      .bottom-nav .bottom-link,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"] a,[data-customer-bottom-nav-item]{display:flex!important;box-sizing:border-box!important;width:100%!important;height:var(--customer-nav-height)!important;min-width:0!important;min-height:var(--customer-nav-height)!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;padding:6px 2px!important;box-shadow:none!important;color:#938780!important;font-size:10px!important;font-weight:700!important;line-height:1.15!important;text-align:center!important;text-decoration:none!important;white-space:nowrap!important}
      .bottom-nav .bottom-link svg,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"] a svg,[data-customer-bottom-nav-item] svg{display:block!important;width:20px!important;height:20px!important;min-width:20px!important;min-height:20px!important;flex:0 0 20px!important;margin:0!important}
      .bottom-nav .bottom-link span,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"] a span,[data-customer-bottom-nav-item] span{display:block!important;overflow:hidden!important;max-width:100%!important;margin:0!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      body:has(.customer-premium-topbar):not(#customer-premium-shell) [class~="bg-[#fbf7f0]"]>nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"]{height:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important;min-height:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important;padding:0 0 env(safe-area-inset-bottom)!important;background:rgba(255,253,249,.97)!important}
      body:has(.customer-premium-topbar):not(#customer-premium-shell) [class~="bg-[#fbf7f0]"]>nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"] a{height:var(--customer-nav-height)!important;min-height:var(--customer-nav-height)!important;border-radius:0!important;padding:6px 2px!important;font-size:10px!important;line-height:1.15!important}
      main{scroll-padding-bottom:calc(var(--customer-nav-height) + 24px)!important}
    }
    .cx-staff-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;object-fit:cover;border:1px solid #ead8d1;background:#f6efe6}
    .cx-profile-avatar{width:64px;height:64px;border-radius:16px;object-fit:cover;border:1px solid #ead8d1;background:#f6efe6;box-shadow:0 3px 12px rgba(80,55,45,.1)}
    .cx-nickname-field{display:block;min-width:0}
    .cx-nickname-field .cx-nickname-heading{display:block;margin:0 0 8px;font-size:14px;font-weight:700;color:#382f2a}
    .cx-nickname-field input{display:block;width:100%;min-width:0;max-width:100%;min-height:48px;border:1px solid #d8cbbf;border-radius:12px;background:#fff;padding:0 14px;color:#2f2a25;font:inherit;outline:none;box-sizing:border-box}
    .cx-nickname-field input:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.45)}
    .cx-nickname-field small{display:block;margin-top:6px;font-size:11px;line-height:1.55;color:#8b8178}
    .cx-nickname-status{display:block;min-height:18px;margin-top:5px;font-size:11px;color:#356143}
    form[action="/api/customer/profile"],form[action="/api/customer/profile"] section,form[action="/api/customer/profile"] .grid,form[action="/api/customer/profile"] label{min-width:0;max-width:100%;box-sizing:border-box}
    form[action="/api/customer/profile"] input[type="date"]{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box}
    .cx-chat-thread{display:flex!important;align-items:center!important;gap:11px!important}
    .cx-chat-thread>div{min-width:0!important;flex:1!important}
    .cx-chat-heading{display:flex!important;align-items:center!important;gap:10px!important}
    .cx-chat-profile{display:flex;align-items:center;gap:11px;margin:-2px 0 2px;border:1px solid #eadfd4;border-radius:16px;background:#fffaf7;padding:10px 12px}
    .cx-chat-profile strong{display:block;color:#382f2a;font-size:14px}
    .cx-chat-profile span{display:block;margin-top:2px;color:#7c7168;font-size:11px}
    .cx-customer-nav-link{color:#938780!important}.cx-customer-nav-link:hover{background:#f6efe6!important;color:#5b332c!important}.cx-customer-nav-active{background:transparent!important;color:#d85d79!important;box-shadow:none!important}
    @media(max-width:470px){form[action="/api/customer/profile"] input[type="date"]{inline-size:100%;min-inline-size:0;max-inline-size:100%}}
  `
  const style = document.createElement('style')
  style.dataset.lienCustomerExperience = '395'
  style.textContent = css
  document.head.appendChild(style)

  const request = async (url, options) => {
    const response = await fetch(url, { cache: 'no-store', ...options })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || '通信に失敗しました。')
    return result
  }

  const customerNavIcons = {
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  }

  function customerNavSvg(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${customerNavIcons[name]}</svg>`
  }

  function normalizeBottomNavigation() {
    const definitions = [
      { href: '/u/home', label: 'ホーム', icon: 'home' },
      { href: '/u/appointments', label: '予約', icon: 'calendar' },
      { href: '/u/history', label: '履歴', icon: 'clock' },
      { href: '/u/chat', label: 'チャット相談', icon: 'chat' },
    ]
    document.querySelectorAll('.bottom-nav,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"]').forEach(nav => {
      const host = nav.matches('.bottom-nav') ? nav : (nav.firstElementChild || nav)
      if (!nav.hasAttribute('data-customer-bottom-nav')) nav.setAttribute('data-customer-bottom-nav', '')
      if (host !== nav && !host.hasAttribute('data-customer-bottom-nav-inner')) host.setAttribute('data-customer-bottom-nav-inner', '')
      const current = [...host.querySelectorAll(':scope > a')]
      const alreadyNormalized = current.length === definitions.length && definitions.every((item, index) => current[index]?.getAttribute('href') === item.href)
      const links = alreadyNormalized ? current : definitions.map(item => {
        const link = document.createElement('a')
        link.href = item.href
        return link
      })
      definitions.forEach((item, index) => {
        const link = links[index]
        const className = nav.matches('.bottom-nav') ? 'bottom-link cx-customer-nav-link' : 'cx-customer-nav-link'
        if (link.className !== className && !link.classList.contains('cx-customer-nav-active')) link.className = className
        if (!link.hasAttribute('data-customer-bottom-nav-item')) link.setAttribute('data-customer-bottom-nav-item', '')
        const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/') || (item.href === '/u/chat' && new URLSearchParams(location.search).get('view') === 'chat')
        if (active) {
          link.classList.add('active', 'cx-customer-nav-active')
          if (link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page')
        } else {
          link.classList.remove('active', 'cx-customer-nav-active')
          if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current')
        }
        if (link.dataset.customerNavDefinition !== `${item.icon}:${item.label}`) {
          link.innerHTML = `${customerNavSvg(item.icon)}<span>${item.label}</span>`
          link.dataset.customerNavDefinition = `${item.icon}:${item.label}`
        }
      })
      if (!alreadyNormalized) host.replaceChildren(...links)
    })
  }

function replaceNewsLinks() {
    // The notification bell remains a notification entry. Store registration has its own page.
  }


  async function applyCommunityNickname() {
    const match = /^\/u\/community\/([^/]+)$/.exec(location.pathname)
    if (!match || document.documentElement.dataset.cxCommunityNickname === match[1]) return
    try {
      const result = await request(`/api/lien-community-nickname?postId=${encodeURIComponent(match[1])}`)
      if (!result.nickname) return
      const card = document.querySelector('main article')
      const header = card?.querySelector('header')
      const name = header?.querySelector('span.block.truncate.text-sm.font-semibold')
      const initial = header?.querySelector('span.grid.h-10.w-10')
      if (name) name.textContent = result.nickname
      if (initial) initial.textContent = result.nickname.slice(0, 1)
      document.documentElement.dataset.cxCommunityNickname = match[1]
    } catch {}
  }

  async function addNicknameEditor() {
    if (location.pathname !== '/u/profile' || document.querySelector('input[name="nickname"]')) return
    const profileForm = document.querySelector('form[action="/api/customer/profile"]')
    const nameInput = profileForm?.querySelector('input[name="name"]')
    const basicGrid = nameInput?.closest('.grid')
    if (!profileForm || !basicGrid) return
    const field = document.createElement('label')
    field.className = 'cx-nickname-field'
    field.innerHTML = '<span class="cx-nickname-heading">ニックネーム</span><input name="nickname" maxlength="30" autocomplete="nickname" placeholder="例：ひなた" disabled><small>スタイル共有やコメントなど、公開される場所では本名の代わりに表示されます。</small><output class="cx-nickname-status" aria-live="polite"></output>'
    nameInput.closest('label')?.insertAdjacentElement('afterend', field)
    const input = field.querySelector('input')
    const output = field.querySelector('output')
    try {
      const result = await request('/api/lien-customer-nickname')
      input.value = result.nickname || ''
    } catch (error) {
      output.textContent = error.message
    } finally {
      input.disabled = false
    }
    profileForm.addEventListener('submit', async event => {
      if (profileForm.dataset.cxNicknameSaved === 'true') return
      event.preventDefault()
      const button = event.submitter || profileForm.querySelector('button[type="submit"]')
      button.disabled = true
      output.textContent = '保存しています…'
      try {
        const result = await request('/api/lien-customer-nickname', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: input.value }) })
        input.value = result.nickname
        profileForm.dataset.cxNicknameSaved = 'true'
        HTMLFormElement.prototype.submit.call(profileForm)
      } catch (error) {
        output.textContent = error.message
        button.disabled = false
      }
    })
  }

  let staffDirectory = null
  async function loadStaffDirectory() {
    if (!staffDirectory) staffDirectory = request('/api/lien-staff-directory').then(result => result.staff || []).catch(() => [])
    return staffDirectory
  }

  function selectedStaffName() {
    const selected = [...document.querySelectorAll('button[aria-pressed="true"]')].find(button => button.textContent && !/メニュー/.test(button.textContent))
    return selected ? selected.textContent.trim().replace(/^✓\s*/, '') : ''
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
    node.dataset.cxStaffKey = String(item?.key || item?.name || '')
    return node
  }
  
  function canonicalStaffName(value) {
    return String(value || '')
      .replace(/^[✓✔]\s*/, '')
      .replace(/[\s　]/g, '')
      .replace(/[邊邉]/g, '辺')
      .replace(/[﨑]/g, '崎')
      .replace(/[髙]/g, '高')
      .replace(/[濵濱]/g, '浜')
  }

  function enrichBooking(directory) {
    if (location.pathname !== '/u/appointments') return
    const byName = name => directory.find(item => canonicalStaffName(item.name) === canonicalStaffName(name))
    const avatarCounts = directory.reduce((counts, item) => {
      if (item.avatarUrl) counts.set(item.avatarUrl, (counts.get(item.avatarUrl) || 0) + 1)
      return counts
    }, new Map())
    const avatarFor = (item, className = 'cx-staff-avatar') => {
      if (item.avatarUrl && avatarCounts.get(item.avatarUrl) === 1) {
        const avatar = document.createElement('img')
        avatar.className = className
        avatar.src = item.avatarUrl
        avatar.alt = ''
        avatar.dataset.cxStaffKey = String(item?.key || item?.name || '')
        return avatar
      }
      return fallbackAvatar(item, className)
    }

    document.querySelectorAll('button[aria-pressed]').forEach(button => {
      if (button.querySelector('.cx-staff-avatar')) return
      const label = button.textContent.trim().replace(/^[✓✔]\s*/, '')
      if (!label || label === '指名なし') return
      const item = byName(label) || { key: label, name: label }
      button.prepend(avatarFor(item))
    })

    const selectedName = selectedStaffName()
    if (!selectedName || selectedName === '指名なし') return
    const item = byName(selectedName) || { key: selectedName, name: selectedName }
    const nameNode = [...document.querySelectorAll('p')].find(node => !node.closest('button') && canonicalStaffName(node.textContent) === canonicalStaffName(selectedName))
    const profileCard = nameNode && nameNode.closest('.grid')
    if (!profileCard) return
    const visual = profileCard.querySelector('.cx-profile-avatar') || profileCard.querySelector('span.grid.h-16')
    const expectedStaffKey = String(item.key || item.name || '')
    if (visual && visual.dataset.cxStaffKey !== expectedStaffKey) {
      visual.replaceWith(avatarFor(item, 'cx-profile-avatar'))
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

  function normalizedName(value) {
    return String(value || '').replace(/[\s　]/g, '')
  }

  function staffByName(directory, value) {
    const name = normalizedName(value)
    return directory.find(item => normalizedName(item.name) === name) || null
  }

  function avatarElement(item, className = 'cx-staff-avatar') {
    if (!item?.avatarUrl) return null
    const image = document.createElement('img')
    image.className = className
    image.src = item.avatarUrl
    image.alt = `${item.name}のプロフィール画像`
    image.loading = 'lazy'
    return image
  }

  function syncChatStaffSelector(select, directory) {
    const unique = []
    const seen = new Set()
    directory.forEach(item => {
      const identity = normalizedName(item?.name || item?.key).toLowerCase()
      if (!identity || seen.has(identity)) return
      seen.add(identity)
      unique.push(item)
    })
    directory = unique
    if (!select) return
    const signature = directory.map(item => `${item.key}:${item.name}`).join('|')
    if (select.dataset.cxStaffDirectory === signature) return

    const previousValue = select.value
    const options = directory.map(item => {
      const option = document.createElement('option')
      option.value = item.key
      option.textContent = item.name
      return option
    })

    if (options.length === 0) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = '現在対応できるスタッフがいません'
      options.push(option)
    }

    select.replaceChildren(...options)
    select.disabled = directory.length === 0
    if (directory.some(item => item.key === previousValue)) select.value = previousValue
    else if (directory[0]) select.value = directory[0].key
    select.dataset.cxStaffDirectory = signature

    const submit = select.closest('form')?.querySelector('button[type="submit"],input[type="submit"]')
    if (submit) submit.disabled = directory.length === 0
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function enrichCustomerProfile(directory) {
    if (location.pathname !== '/u/profile') return
    const select = document.querySelector('select[name="assignedStaffSelection"]')
    if (!select) return
    const signature = directory.map(item => `${item.key}:${item.name}`).join('|')
    if (select.dataset.cxStaffDirectory === signature) return

    const previousValue = select.value
    const freeOption = document.createElement('option')
    freeOption.value = 'free'
    freeOption.textContent = 'フリー（指名なし）'
    const staffOptions = directory.map(item => {
      const option = document.createElement('option')
      option.value = item.name
      option.textContent = item.name
      return option
    })
    select.replaceChildren(freeOption, ...staffOptions)
    select.value = directory.some(item => item.name === previousValue) ? previousValue : 'free'
    select.dataset.cxStaffDirectory = signature
  }

  function enrichChat(directory) {
    if (location.pathname !== '/u/chat' && !new URLSearchParams(location.search).get('view')?.includes('chat')) return
    document.querySelectorAll('.customer-chat-thread-list a,#threads .thread').forEach(link => {
      if (link.dataset.cxStaffDecorated === '1') return
      const strong = link.querySelector('strong')
      const item = staffByName(directory, strong?.textContent)
      link.classList.add('cx-chat-thread')
      const image = avatarElement(item) || fallbackAvatar(item || { name: strong?.textContent || '担当' })
      link.prepend(image)
      link.dataset.cxStaffDecorated = '1'
    })
    const heading = document.querySelector('.customer-chat-conversation h2') || document.querySelector('#title')
    if (heading && heading.dataset.cxStaffDecorated !== '1') {
      const item = staffByName(directory, heading.textContent)
      const image = avatarElement(item) || fallbackAvatar(item || { name: heading.textContent || '担当' })
      heading.classList.add('cx-chat-heading')
      heading.prepend(image)
      heading.dataset.cxStaffDecorated = '1'
    }
    const selectNode = document.querySelector('.customer-chat-conversation form select[name="staffKey"]') || document.querySelector('.new select#staff')
    const form = selectNode?.closest('form') || selectNode?.closest('.new')
    const select = selectNode
    const threadNames = new Set([...document.querySelectorAll('.customer-chat-thread-list a strong,#threads .thread strong')].map(node => normalizedName(node.textContent).toLowerCase()))
    const available = directory.filter(item => !threadNames.has(normalizedName(item.name).toLowerCase()))
    syncChatStaffSelector(select, available)
    if (form && select && available.length === 0) {
      form.querySelectorAll('textarea,button[type="submit"],input[type="submit"]').forEach(node => { node.disabled = true })
      if (!form.querySelector('.cx-chat-all-open')) {
        const note = document.createElement('p')
        note.className = 'cx-chat-all-open'
        note.textContent = '相談できるスタッフとのトークはすでに作成されています。左の一覧から会話を選んでください。'
        form.appendChild(note)
      }
    }
    if (form && select && !form.querySelector('.cx-chat-profile')) {
      const preview = document.createElement('div')
      preview.className = 'cx-chat-profile'
      const render = () => {
        const item = directory.find(entry => entry.key === select.value) || staffByName(directory, select.options[select.selectedIndex]?.textContent)
        preview.replaceChildren()
        const image = avatarElement(item)
        if (image) preview.appendChild(image)
        const copy = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = item?.name || select.options[select.selectedIndex]?.textContent || 'スタッフ'
        const role = document.createElement('span')
        role.textContent = item?.role || 'スタイリスト'
        copy.append(title, role)
        preview.appendChild(copy)
      }
      select.insertAdjacentElement('afterend', preview)
      select.addEventListener('change', render)
      render()
    }
  }

  async function setupBookingProfiles() {
    if (location.pathname !== '/u/appointments' && location.pathname !== '/u/chat' && location.pathname !== '/u/profile') return
    const directory = await loadStaffDirectory()
    enrichBooking(directory)
    enrichChat(directory)
    enrichCustomerProfile(directory)
    document.addEventListener('click', event => {
      if (event.target.closest('button[aria-pressed]')) setTimeout(() => { enrichBooking(directory); enrichChat(directory) }, 40)
    })
    const observer = new MutationObserver(() => { enrichBooking(directory); enrichChat(directory); enrichCustomerProfile(directory) })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  function applyCustomerConsistency() {
    document.documentElement.classList.toggle('cx-community-route', location.pathname === '/u/community')
    if (document.querySelector('#cx-consistency-styles')) return
    const style = document.createElement('style')
    style.id = 'cx-consistency-styles'
    style.textContent = `.customer-store-icon img{width:34px;height:34px;border-radius:50%;object-fit:cover}.customer-notification-link{position:relative}.customer-notification-badge{position:absolute;top:2px;right:1px;display:grid;min-width:17px;height:17px;place-items:center;border:2px solid #fff;border-radius:999px;background:#cf4864;padding:0 3px;color:#fff;font-size:9px;font-weight:800}.cx-staff-avatar-fallback{display:grid!important;place-items:center;background:hsl(var(--cx-staff-hue) 42% 91%)!important;color:hsl(var(--cx-staff-hue) 38% 32%)!important;font-weight:800}.cx-chat-thread{display:grid!important;grid-template-columns:44px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;min-height:68px!important;padding:12px 14px!important}.cx-chat-thread>.cx-staff-avatar,.cx-chat-heading>.cx-staff-avatar{width:44px!important;height:44px!important;border-radius:50%!important;object-fit:cover!important}.cx-chat-thread strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cx-chat-heading{display:flex!important;align-items:center!important;gap:12px!important}.cx-chat-profile{display:flex!important;align-items:center!important;gap:12px!important;border:1px solid #eaded6!important;border-radius:16px!important;background:#fffaf7!important;padding:12px!important}.cx-chat-profile>div{display:grid!important;gap:3px!important}.cx-chat-profile span{color:#806f68!important;font-size:12px!important}.cx-chat-all-open{margin:0!important;border:1px solid #d8e6de!important;border-radius:14px!important;background:#f3faf6!important;padding:12px 14px!important;color:#426452!important;font-size:13px!important;line-height:1.7!important}.cx-profile-avatar.cx-staff-avatar-fallback{width:64px;height:64px;border-radius:18px}@media(max-width:767px){html.cx-community-route .content{padding-top:10px!important}html.cx-community-route .page-title{margin-bottom:10px!important;padding-block:10px!important}html.cx-community-route main section{margin-top:10px!important}}`
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


  function ensureMobileCustomerStoreIcon() {
    // The customer layout owns the hamburger navigation.
  }

  function boot() {
    normalizeBottomNavigation()
    applyCustomerConsistency()
    ensureMobileCustomerStoreIcon()
    enforceSquareImageInputs()
    replaceNewsLinks()
    addNicknameEditor()
    applyCommunityNickname()
    setupBookingProfiles()
  }

  const start = () => window.setTimeout(() => {
    boot()
    new MutationObserver(() => { applyCustomerConsistency(); normalizeBottomNavigation(); ensureMobileCustomerStoreIcon(); replaceNewsLinks(); applyCommunityNickname() }).observe(document.documentElement, { childList: true, subtree: true })
  }, 250)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
})()
