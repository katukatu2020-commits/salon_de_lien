(() => {
  if (window.__lienUiWorkflowsV294) return
  window.__lienUiWorkflowsV294 = true

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]))
  const normalized = value => String(value || '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLowerCase()
  const chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>'

  async function jsonRequest(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(options || {}),
      headers: options?.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options?.headers,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '通信を完了できませんでした。')
    return payload
  }

  function chatStyles() {
    if (document.getElementById('lien-customer-chat-v294-styles')) return
    const style = document.createElement('style')
    style.id = 'lien-customer-chat-v294-styles'
    style.textContent = `
      .lien-chat-v294-portal{position:fixed;z-index:25;overflow:auto;background:#fffaf6;overscroll-behavior:contain}.lien-chat-v294{max-width:1180px;margin:0 auto;padding:18px 18px 44px;color:#2f2a25}
      .lien-chat-v294__hero{padding:4px 2px 22px;border-bottom:1px solid #eadfd5}.lien-chat-v294__eyebrow{margin:0 0 8px;color:#c94f70;font-size:13px;font-weight:800}.lien-chat-v294__hero h1{margin:0;font-family:inherit;font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:0;line-height:1.35}.lien-chat-v294__hero p:last-child{margin:10px 0 0;color:#77665d;font-size:14px;line-height:1.8}
      .lien-chat-v294__grid{display:grid;grid-template-columns:minmax(250px,330px) minmax(0,1fr);min-height:560px;margin-top:20px;border:1px solid #eadfd5;border-radius:24px;background:#fff;box-shadow:0 14px 34px rgba(65,45,37,.06);overflow:hidden}
      .lien-chat-v294 .lien-chat-v294__sidebar{display:block!important;border-right:1px solid #eadfd5;background:#fffdfa;padding:18px}.lien-chat-v294__sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.lien-chat-v294__sidebar-head strong{font-size:15px}.lien-chat-v294__sidebar-head span{color:#8b7c73;font-size:11px}
      .lien-chat-v294__staff{display:grid;gap:8px}.lien-chat-v294__staff-button{display:grid;width:100%;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid transparent;border-radius:17px;background:transparent;padding:10px;text-align:left;color:#2f2a25;cursor:pointer;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}.lien-chat-v294__staff-button:hover{background:#f8f0eb}.lien-chat-v294__staff-button[aria-selected="true"]{border-color:#d8a3b0;background:#fff3f6;box-shadow:0 5px 16px rgba(126,71,82,.08)}
      .lien-chat-v294__avatar{position:relative;display:grid;width:48px;height:48px;place-items:center;overflow:hidden;border:1px solid #ead8cf;border-radius:50%;background:#f2e3dc;color:#8f4f42;font-weight:800}.lien-chat-v294__avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#f2e3dc}.lien-chat-v294__staff-copy{min-width:0}.lien-chat-v294__staff-copy strong{display:block;overflow:hidden;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.lien-chat-v294__staff-copy small{display:block;margin-top:3px;color:#887970;font-size:11px}.lien-chat-v294__unread{display:grid;min-width:22px;height:22px;place-items:center;border-radius:999px;background:#c94f70;padding:0 6px;color:white;font-size:10px;font-weight:800}
      .lien-chat-v294__conversation{display:flex;min-width:0;flex-direction:column;background:#fff}.lien-chat-v294__conversation-head{display:flex;min-height:76px;align-items:center;gap:12px;border-bottom:1px solid #eadfd5;padding:13px 20px}.lien-chat-v294__conversation-head strong{font-size:15px}.lien-chat-v294__conversation-head small{display:block;margin-top:3px;color:#887970;font-size:11px}
      .lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px}.lien-chat-v294__date{display:flex;width:100%;align-items:center;justify-content:center;padding:4px 0}.lien-chat-v294__date span{border-radius:999px;background:#b8afa7;padding:4px 12px;color:#fff;font-size:11px;font-weight:600;line-height:1.4}.lien-chat-v294__message-row{display:flex;max-width:min(82%,620px);align-self:flex-start;align-items:flex-end;gap:8px;flex-direction:row}.lien-chat-v294__message-row.mine{align-self:flex-end;flex-direction:row-reverse}.lien-chat-v294__message{border-radius:17px 17px 17px 5px;background:#f3ede7;padding:11px 14px;color:#2f2a25;font-size:13px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.lien-chat-v294__message-row.mine .lien-chat-v294__message{border-radius:17px 17px 5px 17px;background:#8f4f42;color:#fff}.lien-chat-v294__message-meta{display:flex;flex:0 0 auto;flex-direction:column;align-items:flex-start;padding-bottom:2px;color:#8b7c73;font-size:10px;line-height:1.35;white-space:nowrap}.lien-chat-v294__message-row.mine .lien-chat-v294__message-meta{align-items:flex-end}.lien-chat-v294__message-read{font-size:9px}
      .lien-chat-v294__empty{display:grid;min-height:380px;flex:1;place-items:center;padding:34px;text-align:center}.lien-chat-v294__empty-icon{display:grid;width:58px;height:58px;margin:0 auto 14px;place-items:center;border-radius:20px;background:#fff0f4;color:#c94f70}.lien-chat-v294__empty-icon svg{width:27px;height:27px}.lien-chat-v294__empty strong{display:block;font-size:16px}.lien-chat-v294__empty p{max-width:430px;margin:7px auto 0;color:#8b7c73;font-size:13px;line-height:1.75}
      .lien-chat-v294__composer{display:flex;align-items:flex-end;gap:9px;border-top:1px solid #eadfd5;padding:14px 18px}.lien-chat-v294__composer textarea{min-height:50px;max-height:150px;flex:1;resize:vertical;border:1px solid #dfd1c7;border-radius:16px;background:#fffdfa;padding:13px 15px;color:#2f2a25;font:inherit;font-size:13px;line-height:1.6;outline:none}.lien-chat-v294__composer textarea:focus{border-color:#a9685b;box-shadow:0 0 0 4px rgba(217,174,164,.24)}.lien-chat-v294__send{display:grid;width:50px;height:50px;place-items:center;border:0;border-radius:16px;background:#8f4f42;color:#fff;cursor:pointer}.lien-chat-v294__send:disabled{cursor:not-allowed;opacity:.48}.lien-chat-v294__send svg{width:20px;height:20px}.lien-chat-v294__error{min-height:18px;margin:0;padding:0 20px 13px;color:#a02f28;font-size:11px}
      @media(max-width:720px){.lien-chat-v294{padding:10px 12px 118px}.lien-chat-v294__hero{padding:4px 4px 16px}.lien-chat-v294__grid{grid-template-columns:1fr;min-height:0;border-radius:20px}.lien-chat-v294 .lien-chat-v294__sidebar{display:block!important;border-right:0;border-bottom:1px solid #eadfd5;padding:14px}.lien-chat-v294__staff{display:flex;gap:8px;overflow:auto;padding-bottom:2px;scrollbar-width:none}.lien-chat-v294__staff-button{min-width:210px}.lien-chat-v294__messages,.lien-chat-v294__empty{min-height:330px}.lien-chat-v294__composer{padding:12px}.lien-chat-v294__conversation-head{padding:12px 14px}}
      @media(max-width:720px){.lien-chat-v294__grid{display:block}.lien-chat-v294__sidebar{border:0!important;padding:14px!important}.lien-chat-v294__staff{display:grid!important;overflow:visible!important}.lien-chat-v294__staff-button{min-width:0!important}.lien-chat-v294__conversation{display:none!important}.lien-chat-v294.is-conversation .lien-chat-v294__sidebar{display:none!important}.lien-chat-v294.is-conversation .lien-chat-v294__conversation{display:flex!important}.lien-chat-v294__back{display:grid!important}}.lien-chat-v294__back{display:none;width:40px;height:40px;flex:0 0 40px;place-items:center;border:1px solid #e3d5cc;border-radius:50%;background:#fffdfa;color:#6f5c52;cursor:pointer}.lien-chat-v294__back svg{width:20px;height:20px}@media(prefers-reduced-motion:reduce){.lien-chat-v294__staff-button{transition:none}}
    `
    document.head.appendChild(style)
  }

  function cleanupCustomerChatPortal() {
    document.querySelectorAll('[data-lien-customer-chat-portal]').forEach(portal => {
      portal.dispatchEvent(new Event('lien:customer-chat-cleanup'))
      portal.remove()
    })
    document.querySelectorAll('main[data-lien-customer-chat-source]').forEach(main => {
      main.style.visibility = main.dataset.lienPreviousVisibility || ''
      main.style.pointerEvents = main.dataset.lienPreviousPointerEvents || ''
      delete main.dataset.lienPreviousVisibility
      delete main.dataset.lienPreviousPointerEvents
      delete main.dataset.lienCustomerChatSource
      delete main.dataset.lienCustomerChatV294
    })
  }

  function syncCustomerChatPortal(portal, main) {
    if (!portal.isConnected || !main.isConnected) return
    const rect = main.getBoundingClientRect()
    portal.style.left = Math.max(0, rect.left) + 'px'
    portal.style.top = Math.max(0, rect.top) + 'px'
    portal.style.width = Math.max(1, rect.width) + 'px'
    portal.style.height = Math.max(1, window.innerHeight - Math.max(0, rect.top)) + 'px'
  }

  function initCustomerChat() {
    if (location.pathname !== '/u/chat') return
    const main = document.querySelector('main')
    if (!main || document.querySelector('[data-lien-customer-chat-portal]')) return
    main.dataset.lienCustomerChatV294 = 'ready'
    chatStyles()
    const portal = document.createElement('div')
    portal.className = 'lien-chat-v294-portal'
    portal.dataset.lienCustomerChatPortal = '1'
    portal.innerHTML = '<section class="lien-chat-v294" aria-label="チャット相談"><header class="lien-chat-v294__hero"><p class="lien-chat-v294__eyebrow">Salon talk</p><h1>チャット相談</h1><p>サロンスタッフへ気軽に相談できます。</p></header><div class="lien-chat-v294__grid"><section class="lien-chat-v294__sidebar" aria-label="相談するスタッフ"><div class="lien-chat-v294__sidebar-head"><strong>スタッフ</strong><span data-chat-staff-count>読込中</span></div><div class="lien-chat-v294__staff" data-chat-staff-list aria-label="相談するスタッフ"></div></section><section class="lien-chat-v294__conversation"><div data-chat-conversation><div class="lien-chat-v294__empty"><div><span class="lien-chat-v294__empty-icon">' + chatIcon + '</span><strong>会話を選択してください</strong><p>左側のスタッフを選ぶと相談内容を確認できます。</p></div></div></div><p class="lien-chat-v294__error" data-chat-error aria-live="polite"></p></section></div></section>'
    main.dataset.lienCustomerChatSource = '1'
    main.dataset.lienPreviousVisibility = main.style.visibility || ''
    main.dataset.lienPreviousPointerEvents = main.style.pointerEvents || ''
    main.style.visibility = 'hidden'
    main.style.pointerEvents = 'none'
    document.body.appendChild(portal)
    const sync = () => syncCustomerChatPortal(portal, main)
    sync()
    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(main)
    addEventListener('resize', sync, { passive: true })
    portal.addEventListener('lien:customer-chat-cleanup', () => {
      resizeObserver.disconnect()
      removeEventListener('resize', sync)
    }, { once: true })

    const staffList = portal.querySelector('[data-chat-staff-list]')
    const staffCount = portal.querySelector('[data-chat-staff-count]')
    const conversation = portal.querySelector('[data-chat-conversation]')
    const error = portal.querySelector('[data-chat-error]')
    const chatRoot = portal.querySelector('.lien-chat-v294')
    const state = {
      threads: [],
      directory: [],
      activeKey: null,
      activeThreadId: null,
      sending: false,
    }

    const staffIdentity = staff => normalized(staff.key || staff.name)
    const threadFor = staff => state.threads.find(thread => String(thread.staffKey || '') === String(staff.key || '') || normalized(thread.staffName) === normalized(staff.name))
    const avatar = staff => `<span class="lien-chat-v294__avatar"><span>${esc(String(staff.name || 'ス').trim().slice(0, 1))}</span><img src="${esc(staff.avatarUrl || `/api/lien-staff-avatar?staffKey=${encodeURIComponent(staff.key || '')}`)}" alt="${esc(staff.name)}のプロフィール画像"></span>`

    function wireAvatarFallbacks(root) {
      root.querySelectorAll('.lien-chat-v294__avatar img').forEach(image => image.addEventListener('error', () => image.remove(), { once: true }))
    }

    function renderStaff() {
      staffCount.textContent = `${state.directory.length}名`
      staffList.innerHTML = state.directory.map(staff => {
        const thread = threadFor(staff)
        return `<button type="button" class="lien-chat-v294__staff-button" data-staff-key="${esc(staff.key)}" aria-selected="${String(state.activeKey === staff.key)}">${avatar(staff)}<span class="lien-chat-v294__staff-copy"><strong>${esc(staff.name)}</strong><small>${thread ? 'トーク履歴あり' : '新しい相談'}</small></span>${Number(thread?.unreadCount || 0) ? `<span class="lien-chat-v294__unread">${Number(thread.unreadCount)}</span>` : ''}</button>`
      }).join('') || '<div class="lien-chat-v294__empty"><div><strong>相談できるスタッフがいません</strong><p>店舗へお問い合わせください。</p></div></div>'
      wireAvatarFallbacks(staffList)
      staffList.querySelectorAll('[data-staff-key]').forEach(button => button.addEventListener('click', () => selectStaff(button.dataset.staffKey)))
    }

    function composer(staff, threadId) {
      return `<div class="lien-chat-v294__composer"><textarea data-chat-body maxlength="2000" rows="2" placeholder="${esc(staff.name)}さんへ相談内容を入力"></textarea><button type="button" class="lien-chat-v294__send" data-chat-send aria-label="メッセージを送信"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div>`
    }

    function chatDate(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    function chatDateKey(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function chatDateLabel(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function chatTimeLabel(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function renderChatMessage(message, index, messages, thread) {
      const mine = message.senderType === 'customer'
      const previous = index > 0 ? messages[index - 1] : null
      const currentDateKey = chatDateKey(message.createdAt)
      const showDate = index === 0 || currentDateKey !== chatDateKey(previous?.createdAt)
      const dateSeparator = showDate && currentDateKey
        ? `<div class="lien-chat-v294__date" role="separator" aria-label="${esc(chatDateLabel(message.createdAt))}"><span>${esc(chatDateLabel(message.createdAt))}</span></div>`
        : ''
      const staffReadAt = chatDate(thread?.staffLastReadAt)
      const messageAt = chatDate(message.createdAt)
      const isRead = mine && staffReadAt && messageAt && messageAt <= staffReadAt
      const readLabel = isRead ? '<span class="lien-chat-v294__message-read">既読</span>' : ''
      return `${dateSeparator}<div class="lien-chat-v294__message-row ${mine ? 'mine' : ''}" data-sender="${mine ? 'customer' : 'staff'}"><div class="lien-chat-v294__message">${esc(message.body)}</div><time class="lien-chat-v294__message-meta" datetime="${esc(message.createdAt || '')}">${readLabel}<span>${esc(chatTimeLabel(message.createdAt))}</span></time></div>`
    }

    function renderConversation(staff, payload) {
      const thread = payload?.thread || null
      const messages = Array.isArray(payload?.messages) ? payload.messages : []
      state.activeThreadId = thread?.id || null
      const messageArea = messages.length
        ? `<div class="lien-chat-v294__messages" data-chat-messages>${messages.map((message, index, list) => renderChatMessage(message, index, list, thread)).join('')}</div>`
        : `<div class="lien-chat-v294__empty"><div><span class="lien-chat-v294__empty-icon">${chatIcon}</span><strong>トークを始めましょう</strong><p>${esc(staff.name)}さんへ、髪のお悩みや次回予約について気軽に相談できます。</p></div></div>`
      conversation.innerHTML = `<header class="lien-chat-v294__conversation-head"><button type="button" class="lien-chat-v294__back" data-chat-back aria-label="スタッフ一覧へ戻る"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>${avatar(staff)}<div><strong>${esc(staff.name)}</strong><small>${esc(staff.roleLabel || 'スタイリスト')}</small></div></header>${messageArea}${composer(staff, thread?.id || '')}`
      wireAvatarFallbacks(conversation)
      conversation.querySelector('[data-chat-back]')?.addEventListener('click', () => {
        chatRoot?.classList.remove('is-conversation')
        staffList.querySelector(`[data-staff-key="${CSS.escape(String(state.activeKey || ''))}"]`)?.focus()
      })
      const box = conversation.querySelector('[data-chat-messages]')
      if (box) box.scrollTop = box.scrollHeight
      conversation.querySelector('[data-chat-send]')?.addEventListener('click', sendMessage)
      conversation.querySelector('[data-chat-body]')?.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessage() }
      })
    }

    async function selectStaff(key) {
      const staff = state.directory.find(item => String(item.key) === String(key))
      if (!staff) return
      state.activeKey = staff.key
      chatRoot?.classList.add('is-conversation')
      error.textContent = ''
      renderStaff()
      const thread = threadFor(staff)
      if (!thread) { renderConversation(staff, null); return }
      try {
        const payload = await jsonRequest(`/api/lien-chat?audience=customer&threadId=${encodeURIComponent(thread.id)}`)
        state.threads = Array.isArray(payload.threads) ? payload.threads : state.threads
        renderConversation(staff, payload)
        renderStaff()
      } catch (requestError) {
        error.textContent = requestError.message
      }
    }

    async function sendMessage() {
      if (state.sending || !state.activeKey) return
      const staff = state.directory.find(item => item.key === state.activeKey)
      const textarea = conversation.querySelector('[data-chat-body]')
      const body = String(textarea?.value || '').trim()
      if (!staff || !body) return
      state.sending = true
      const button = conversation.querySelector('[data-chat-send]')
      if (button) button.disabled = true
      error.textContent = ''
      try {
        const action = state.activeThreadId ? { action: 'send', threadId: state.activeThreadId, body } : { action: 'create', staffKey: staff.key, body }
        await jsonRequest('/api/lien-chat?audience=customer', { method: 'POST', body: JSON.stringify(action) })
        if (textarea) textarea.value = ''
        await loadDirectory(staff.key)
      } catch (requestError) {
        error.textContent = requestError.message
      } finally {
        state.sending = false
        if (button) button.disabled = false
      }
    }

    async function loadDirectory(reselectKey = null) {
      try {
        const payload = await jsonRequest('/api/lien-chat?audience=customer')
        state.threads = Array.isArray(payload.threads) ? payload.threads : []
        const candidates = Array.isArray(payload.directory) && payload.directory.length
          ? payload.directory
          : state.threads.map(thread => ({ key: thread.staffKey, name: thread.staffName })).concat(Array.isArray(payload.staff) ? payload.staff : [])
        const seen = new Set()
        state.directory = candidates.filter(staff => {
          const identity = staffIdentity(staff)
          if (!identity || seen.has(identity)) return false
          seen.add(identity)
          return true
        })
        renderStaff()
        const key = reselectKey || state.activeKey
        if (key) await selectStaff(key)
      } catch (requestError) {
        error.textContent = requestError.message
        staffCount.textContent = '取得失敗'
      }
    }

    loadDirectory()
    window.setInterval(() => {
      if (location.pathname === '/u/chat' && state.activeKey && !state.sending) loadDirectory(state.activeKey)
    }, 15000)
  }

  function removeStoreCodeFromProductDialogs() {
    const isProductPage = location.pathname === '/admin/products'
    const isEmbeddedSettings = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') === '1'
    if (!isProductPage && !isEmbeddedSettings) return
    const documents = [document]
    document.querySelectorAll('iframe').forEach(frame => {
      try { if (frame.contentDocument) documents.push(frame.contentDocument) } catch {}
    })
    documents.forEach(doc => {
      doc.querySelectorAll('[data-store-code],[data-organization-code]').forEach(node => { node.hidden = true })
      doc.querySelectorAll('h1,h2,h3,h4,strong,label,p,dt').forEach(label => {
        const text = label.textContent?.trim()
        if (text !== '店舗識別コード' && text !== '店舗登録用QRコード') return
        if (isEmbeddedSettings && /^H[1-4]$/.test(label.tagName)) {
          const protectedSettings = /消費税率|在庫設定|ポイント設定|抽選設定|クーポン設定/
          let container = label
          while (container.parentElement && !['BODY', 'MAIN', 'FORM'].includes(container.parentElement.tagName)) {
            if (protectedSettings.test(container.parentElement.textContent || '')) break
            container = container.parentElement
          }
          if (container !== label) {
            container.hidden = true
            return
          }
          const previous = label.previousElementSibling
          if (text === '店舗登録用QRコード' && previous?.tagName === 'IMG') previous.hidden = true
          let sibling = label.nextElementSibling
          let remaining = text === '店舗登録用QRコード' ? 2 : 3
          while (sibling && remaining > 0 && !/^H[1-4]$/.test(sibling.tagName)) {
            const next = sibling.nextElementSibling
            sibling.hidden = true
            sibling = next
            remaining -= 1
          }
          label.hidden = true
          return
        }
        let container = label.closest('section,article,[class*="card"],[class*="setting"]')
        if (!container || ['BODY', 'MAIN', 'FORM'].includes(container.tagName)) container = label.parentElement
        if (container && !['BODY', 'MAIN', 'FORM'].includes(container.tagName)) container.hidden = true
      })
    })
  }

  function syncCustomerNavigationState() {
    const currentPath = location.pathname
    if (!currentPath.startsWith('/u/')) return

    document.querySelectorAll('nav[aria-label="お客様アプリメニュー"]').forEach(nav => {
      const links = Array.from(nav.querySelectorAll('a[data-customer-navigation="document"]'))
      const desired = links.find(link => {
        const href = new URL(link.href, location.href).pathname
        return currentPath === href || currentPath.startsWith(href + '/')
      })
      if (!desired) return

      const previous = links.find(link => link.getAttribute('aria-current') === 'page')
      if (previous && previous !== desired) {
        const previousClassName = previous.className
        previous.className = desired.className
        desired.className = previousClassName
      }
      links.forEach(link => {
        if (link === desired) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      })
    })
  }

  function removeSmsPanelFallback() {
    const panel = document.querySelector('[aria-label="SMS認証・同意状況"]')
    if (panel) panel.hidden = true
  }

  const boot = () => {
    if (location.pathname !== '/u/chat') cleanupCustomerChatPortal()
    removeSmsPanelFallback()
    syncCustomerNavigationState()
    initCustomerChat()
    removeStoreCodeFromProductDialogs()
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]')
    if (!link || !document.querySelector('[data-lien-customer-chat-portal]')) return
    const next = new URL(link.href, location.href)
    if (next.pathname !== '/u/chat') cleanupCustomerChatPortal()
  }, true)
  boot()
  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.setInterval(boot, 1000)
})()


;(() => {
  if (window.__lienCustomerAppointmentCancelV362) return
  window.__lienCustomerAppointmentCancelV362 = true

  const style = document.createElement('style')
  style.textContent = `
    .lien-cancel-v362__home-link{display:inline-flex;min-height:40px;align-items:center;gap:5px;margin-top:12px;border:1px solid #8eb59a;border-radius:999px;background:#fff;padding:0 16px;color:#315c3c;font-size:12px;font-weight:700;text-decoration:none;transition:.18s ease}
    .lien-cancel-v362__home-link:hover{background:#f7fff8}
    .lien-cancel-v362__detail-button{display:flex;min-height:40px;width:100%;align-items:center;justify-content:space-between;gap:10px;margin-top:9px;border:1px solid #dacdc3;border-radius:999px;background:#fff;padding:0 14px;color:#74483f;font-size:12px;font-weight:700;cursor:pointer}
    .lien-cancel-v362__chevron{width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:.18s ease}
    .lien-cancel-v362__detail-button[aria-expanded="true"] .lien-cancel-v362__chevron{transform:rotate(225deg)}
    .lien-cancel-v362__detail{margin-top:12px;border-top:1px solid #dfd4ca;padding-top:12px}
    .lien-cancel-v362__detail[hidden]{display:none}
    .lien-cancel-v362__detail dl{display:grid;grid-template-columns:76px minmax(0,1fr);gap:7px 10px;margin:0;font-size:12px;line-height:1.6}
    .lien-cancel-v362__detail dt{color:#8b8178}.lien-cancel-v362__detail dd{margin:0;color:#433832;font-weight:600}
    .lien-cancel-v362__warning{display:flex;gap:7px;margin:12px 0 0;border:1px solid #efcbc6;border-radius:12px;background:#fff7f5;padding:10px;color:#795047;font-size:11px;line-height:1.7}
    .lien-cancel-v362__cancel{display:flex;min-height:44px;width:100%;align-items:center;justify-content:center;margin-top:10px;border:1px solid #d56b61;border-radius:999px;background:#fff;color:#ad4038;font-size:13px;font-weight:700;cursor:pointer;transition:.18s ease}
    .lien-cancel-v362__cancel:hover{background:#fff0ed}.lien-cancel-v362__cancel:disabled{cursor:wait;opacity:.55}
    .lien-cancel-v362__feedback{margin:10px 0 0;border-radius:12px;padding:9px 10px;font-size:12px;font-weight:700;line-height:1.6}
    .lien-cancel-v362__feedback.success{border:1px solid #b9d9c0;background:#edf7ef;color:#315c3c}.lien-cancel-v362__feedback.error{background:#fff0ef;color:#973b34}
    @media (max-width:639px){.lien-cancel-v362__detail dl{grid-template-columns:68px minmax(0,1fr)}}
  `
  document.head.appendChild(style)

  const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))

  function enhanceHome() {
    if (location.pathname !== '/u/home') return
    const section = document.querySelector('[data-customer-next-appointment-id]')
    if (!section || section.querySelector('[data-lien-cancel-home-link]')) return
    const appointmentId = section.getAttribute('data-customer-next-appointment-id')
    if (!appointmentId) return
    const link = document.createElement('a')
    link.dataset.lienCancelHomeLink = '1'
    link.className = 'lien-cancel-v362__home-link'
    link.href = `/u/appointments?detail=${encodeURIComponent(appointmentId)}#current-reservations`
    link.textContent = '予約の詳細を見る  ›'
    const target = section.querySelector('.min-w-0') || section.querySelector('div > div') || section
    target.appendChild(link)
  }

  function feedback(section, message, tone) {
    let node = section.querySelector('[data-lien-cancel-feedback]')
    if (!node) {
      node = document.createElement('p')
      node.dataset.lienCancelFeedback = '1'
      section.querySelector('h2')?.insertAdjacentElement('afterend', node)
    }
    node.className = `lien-cancel-v362__feedback ${tone}`
    node.textContent = message
  }

  function cardDetails(card) {
    const paragraphs = card.querySelectorAll(':scope > p')
    return {
      date: paragraphs[0]?.textContent?.trim() || '日時未設定',
      content: paragraphs[1]?.textContent?.trim() || 'メニュー未設定 / フリー',
    }
  }

  function enhanceAppointments() {
    if (location.pathname !== '/u/appointments') return
    const requestedId = new URLSearchParams(location.search).get('detail')
    document.querySelectorAll('[data-customer-appointment-id]').forEach(card => {
      if (card.dataset.lienCancelEnhanced === '1') return
      const appointmentId = card.getAttribute('data-customer-appointment-id')
      if (!appointmentId) return
      card.dataset.lienCancelEnhanced = '1'
      const section = card.closest('section')
      if (section && !section.id) section.id = 'current-reservations'
      const details = cardDetails(card)
      const parts = details.content.split('/').map(value => value.trim())
      const detailId = `lien-cancel-detail-${appointmentId}`
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'lien-cancel-v362__detail-button'
      button.setAttribute('aria-expanded', 'false')
      button.setAttribute('aria-controls', detailId)
      button.innerHTML = '<span>予約の詳細</span><span class="lien-cancel-v362__chevron" aria-hidden="true"></span>'
      const detail = document.createElement('div')
      detail.id = detailId
      detail.className = 'lien-cancel-v362__detail'
      detail.hidden = true
      detail.innerHTML = `
        <dl><dt>予約日時</dt><dd>${esc(details.date)}</dd><dt>メニュー</dt><dd>${esc(parts[0] || 'メニュー未設定')}</dd><dt>担当</dt><dd>${esc(parts[1] || 'フリー')}</dd></dl>
        <p class="lien-cancel-v362__warning">予約をキャンセルすると元に戻せません。内容をご確認のうえ操作してください。</p>
        <button type="button" class="lien-cancel-v362__cancel">予約をキャンセルする</button>
        <p class="lien-cancel-v362__feedback error" data-lien-cancel-card-error hidden></p>`
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true'
        button.setAttribute('aria-expanded', String(!expanded))
        detail.hidden = expanded
      })
      const cancelButton = detail.querySelector('.lien-cancel-v362__cancel')
      const errorNode = detail.querySelector('[data-lien-cancel-card-error]')
      cancelButton.addEventListener('click', async () => {
        if (!window.confirm(`${details.date}の予約をキャンセルしますか？`)) return
        cancelButton.disabled = true
        cancelButton.textContent = 'キャンセルしています…'
        errorNode.hidden = true
        try {
          const response = await fetch('/api/lien-customer-appointment-cancel', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId })
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || !payload.success) throw new Error(payload.error || '予約をキャンセルできませんでした。')
          card.remove()
          if (section) feedback(section, '予約をキャンセルしました。店舗にも通知しました。', 'success')
        } catch (error) {
          errorNode.textContent = error instanceof Error ? error.message : '予約をキャンセルできませんでした。'
          errorNode.hidden = false
          cancelButton.disabled = false
          cancelButton.textContent = '予約をキャンセルする'
        }
      })
      card.append(button, detail)
      if (requestedId === appointmentId) {
        button.setAttribute('aria-expanded', 'true')
        detail.hidden = false
        window.requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      }
    })
  }

  const boot = () => { enhanceHome(); enhanceAppointments() }
  boot()
  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()


;(() => {
  if (window.__lienCustomerBookingCouponV366) return
  window.__lienCustomerBookingCouponV366 = true

  const style = document.createElement('style')
  style.textContent = `.lien-booking-v366__status{margin:0 0 16px;border:1px solid #e4d7ce;border-radius:16px;padding:13px 16px;background:#fff9f5;color:#6f544b;font-size:13px;font-weight:700;line-height:1.7}.lien-booking-v366__status--success{border-color:#b9d9c0;background:#edf7ef;color:#315c3c}.lien-booking-v366__status--coupon{border-color:#e4c772;background:#fff9e8;color:#6f5215}.lien-booking-v366__status--error{border-color:#efb9b2;background:#fff3f1;color:#9f3d34}.coupon-booked{display:block;margin-top:11px;border-radius:5px;background:#eee7e2;padding:10px;color:#685b54;font-size:11px;font-weight:700}`
  document.head.appendChild(style)

  function statusCard(text, tone) {
    const card = document.createElement('div')
    card.className = `lien-booking-v366__status lien-booking-v366__status--${tone}`
    card.setAttribute('role', 'status')
    card.textContent = text
    return card
  }

  function insertBookingStatus(card) {
    const root = document.querySelector('main') || document.querySelector('[class*="grid gap-6"]') || document.body
    const target = root.querySelector('[class*="grid gap-6"]') || root
    target.insertBefore(card, target.firstChild)
  }

  async function enhanceBookingPage() {
    if (location.pathname !== '/u/appointments') return
    const pageKey = `${location.pathname}${location.search}`
    if (document.documentElement.dataset.lienBookingCouponPage === pageKey) return
    document.documentElement.dataset.lienBookingCouponPage = pageKey
    const params = new URLSearchParams(location.search)
    const selectedCouponId = params.get('coupon') || ''
    const repeat = params.get('repeat')
    window.__lienSelectedCouponV366 = null
    if (!repeat && !selectedCouponId) return
    const query = new URLSearchParams()
    if (repeat) query.set('repeat', repeat)
    if (selectedCouponId) query.set('coupon', selectedCouponId)
    const response = await fetch(`/api/lien-customer-booking-context?${query}`, { credentials: 'same-origin', cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '予約情報を取得できませんでした。')

    if (repeat) {
      if (!data.previous) {
        insertBookingStatus(statusCard('前回の予約がありません。メニューと担当者を選んで予約してください。', 'notice'))
      } else {
        const select = [...document.querySelectorAll('select')].find(element => [...element.options].some(option => option.value === data.previous.menuKey))
        if (select && data.previous.menuKey) {
          select.value = data.previous.menuKey
          select.dispatchEvent(new Event('change', { bubbles: true }))
        }
        const staffButton = [...document.querySelectorAll('button')].find(button => {
          const text = button.textContent.replace(/\s/g, '')
          return text === String(data.previous.staffName || '').replace(/\s/g, '') || (data.previous.staffKey === 'free' && /指名なし/.test(text))
        })
        if (staffButton) staffButton.click()
        insertBookingStatus(statusCard(`前回の会計済み予約（${data.previous.menu || 'メニュー'}／${data.previous.staffName || '指名なし'}）を選択しました。日時を選んでください。`, 'success'))
      }
    }

    if (selectedCouponId) {
      if (!data.coupon) {
        insertBookingStatus(statusCard('このクーポンは期限切れ、使用済み、または利用できません。', 'error'))
      } else if (data.coupon.appointmentId) {
        insertBookingStatus(statusCard('このクーポンはすでに別の予約に設定されています。会計完了後に使用済みになります。', 'notice'))
      } else {
        window.__lienSelectedCouponV366 = data.coupon
        insertBookingStatus(statusCard(`${data.coupon.discountRate}%OFFクーポン（${data.coupon.couponCode}）を予約にセットしました。利用確定は会計完了時です。`, 'coupon'))
      }
    }
  }

  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    let nextInit = init
    if (location.pathname === '/u/appointments' && url.endsWith('/api/customer/appointments') && String(init.method || 'GET').toUpperCase() === 'POST' && window.__lienSelectedCouponV366) {
      try {
        const body = JSON.parse(String(init.body || '{}'))
        body.couponIssueId = window.__lienSelectedCouponV366.id
        nextInit = { ...init, body: JSON.stringify(body) }
      } catch {}
    }
    const response = await nativeFetch(input, nextInit)
    if (location.pathname === '/u/appointments' && url.endsWith('/api/customer/appointments') && String(init.method || 'GET').toUpperCase() === 'POST' && response.ok && window.__lienSelectedCouponV366) {
      try {
        const payload = await response.clone().json()
        const appointmentId = payload?.appointment?.id
        if (appointmentId) {
          const linked = await nativeFetch('/api/lien-customer-booking-coupon', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId, couponIssueId: window.__lienSelectedCouponV366.id }),
          })
          const linkedBody = await linked.json()
          if (!linked.ok) window.alert(`予約は受け付けましたが、クーポンを設定できませんでした。店舗へクーポンコードをお伝えください。\n${linkedBody.error || ''}`)
        }
      } catch (error) { console.error('[booking-coupon-v366]', error) }
    }
    return response
  }

  async function enhanceAdminCheckout() {
    const match = location.pathname.match(/^\/admin\/appointments\/([^/]+)$/)
    if (!match) return
    const pageKey = `${location.pathname}${location.search}`
    if (document.documentElement.dataset.lienAdminCouponPage === pageKey) return
    document.documentElement.dataset.lienAdminCouponPage = pageKey
    const response = await nativeFetch(`/api/lien-admin-appointment-coupon?appointmentId=${encodeURIComponent(match[1])}`, { credentials: 'same-origin', cache: 'no-store' })
    const coupon = await response.json()
    if (!response.ok || !coupon.couponIssueId) return
    const hidden = document.querySelector('input[name="couponSelection"]')
    if (!hidden) return
    const selection = `couponIssue:${coupon.couponIssueId}`
    hidden.value = selection
    const form = hidden.closest('form')
    if (form) form.addEventListener('submit', () => { hidden.value = selection }, true)
    const pickerButton = [...form.querySelectorAll('button')].find(button => button.textContent.trim() === 'クーポン')
    if (pickerButton) {
      pickerButton.click()
      await new Promise(resolve => window.setTimeout(resolve, 80))
      const option = [...document.querySelectorAll('button')].find(button => {
        const text = button.textContent.replace(/\s/g, '')
        return text.includes(String(coupon.couponCode).replace(/\s/g, '')) || text.includes(`限定クーポン${coupon.discountRate}%OFF`)
      })
      if (option) option.click()
    }
    const banner = statusCard(`予約時クーポン：${coupon.discountRate}%OFF（${coupon.couponCode}）。会計確定時に使用済みとなります。`, 'coupon')
    const target = form?.querySelector('[class*="rounded"]') || form
    if (target) target.parentElement.insertBefore(banner, target)
  }

  const run = () => {
    enhanceBookingPage().catch(error => insertBookingStatus(statusCard(error.message || '予約情報を取得できませんでした。', 'error')))
    enhanceAdminCheckout().catch(error => console.error('[admin-booking-coupon-v366]', error))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  let rerunTimer = 0
  new MutationObserver(() => {
    clearTimeout(rerunTimer)
    rerunTimer = window.setTimeout(run, 80)
  }).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', () => window.setTimeout(run, 0))
})()

