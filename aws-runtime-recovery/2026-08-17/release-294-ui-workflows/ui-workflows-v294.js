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
      .lien-chat-v294{max-width:1180px;margin:0 auto;padding:18px 18px 44px;color:#2f2a25}
      .lien-chat-v294__hero{padding:4px 2px 22px;border-bottom:1px solid #eadfd5}.lien-chat-v294__eyebrow{margin:0 0 8px;color:#c94f70;font-size:13px;font-weight:800}.lien-chat-v294__hero h1{margin:0;font-family:inherit;font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:0;line-height:1.35}.lien-chat-v294__hero p:last-child{margin:10px 0 0;color:#77665d;font-size:14px;line-height:1.8}
      .lien-chat-v294__grid{display:grid;grid-template-columns:minmax(250px,330px) minmax(0,1fr);min-height:560px;margin-top:20px;border:1px solid #eadfd5;border-radius:24px;background:#fff;box-shadow:0 14px 34px rgba(65,45,37,.06);overflow:hidden}
      .lien-chat-v294__sidebar{border-right:1px solid #eadfd5;background:#fffdfa;padding:18px}.lien-chat-v294__sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.lien-chat-v294__sidebar-head strong{font-size:15px}.lien-chat-v294__sidebar-head span{color:#8b7c73;font-size:11px}
      .lien-chat-v294__staff{display:grid;gap:8px}.lien-chat-v294__staff-button{display:grid;width:100%;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid transparent;border-radius:17px;background:transparent;padding:10px;text-align:left;color:#2f2a25;cursor:pointer;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}.lien-chat-v294__staff-button:hover{background:#f8f0eb}.lien-chat-v294__staff-button[aria-selected="true"]{border-color:#d8a3b0;background:#fff3f6;box-shadow:0 5px 16px rgba(126,71,82,.08)}
      .lien-chat-v294__avatar{position:relative;display:grid;width:48px;height:48px;place-items:center;overflow:hidden;border:1px solid #ead8cf;border-radius:50%;background:#f2e3dc;color:#8f4f42;font-weight:800}.lien-chat-v294__avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#f2e3dc}.lien-chat-v294__staff-copy{min-width:0}.lien-chat-v294__staff-copy strong{display:block;overflow:hidden;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.lien-chat-v294__staff-copy small{display:block;margin-top:3px;color:#887970;font-size:11px}.lien-chat-v294__unread{display:grid;min-width:22px;height:22px;place-items:center;border-radius:999px;background:#c94f70;padding:0 6px;color:white;font-size:10px;font-weight:800}
      .lien-chat-v294__conversation{display:flex;min-width:0;flex-direction:column;background:#fff}.lien-chat-v294__conversation-head{display:flex;min-height:76px;align-items:center;gap:12px;border-bottom:1px solid #eadfd5;padding:13px 20px}.lien-chat-v294__conversation-head strong{font-size:15px}.lien-chat-v294__conversation-head small{display:block;margin-top:3px;color:#887970;font-size:11px}
      .lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:10px;overflow:auto;padding:20px}.lien-chat-v294__message{max-width:min(76%,560px);align-self:flex-start;border-radius:17px 17px 17px 5px;background:#f3ede7;padding:11px 14px;font-size:13px;line-height:1.75;white-space:pre-wrap}.lien-chat-v294__message.mine{align-self:flex-end;border-radius:17px 17px 5px;background:#8f4f42;color:#fff}
      .lien-chat-v294__empty{display:grid;min-height:380px;flex:1;place-items:center;padding:34px;text-align:center}.lien-chat-v294__empty-icon{display:grid;width:58px;height:58px;margin:0 auto 14px;place-items:center;border-radius:20px;background:#fff0f4;color:#c94f70}.lien-chat-v294__empty-icon svg{width:27px;height:27px}.lien-chat-v294__empty strong{display:block;font-size:16px}.lien-chat-v294__empty p{max-width:430px;margin:7px auto 0;color:#8b7c73;font-size:13px;line-height:1.75}
      .lien-chat-v294__composer{display:flex;align-items:flex-end;gap:9px;border-top:1px solid #eadfd5;padding:14px 18px}.lien-chat-v294__composer textarea{min-height:50px;max-height:150px;flex:1;resize:vertical;border:1px solid #dfd1c7;border-radius:16px;background:#fffdfa;padding:13px 15px;color:#2f2a25;font:inherit;font-size:13px;line-height:1.6;outline:none}.lien-chat-v294__composer textarea:focus{border-color:#a9685b;box-shadow:0 0 0 4px rgba(217,174,164,.24)}.lien-chat-v294__send{display:grid;width:50px;height:50px;place-items:center;border:0;border-radius:16px;background:#8f4f42;color:#fff;cursor:pointer}.lien-chat-v294__send:disabled{cursor:not-allowed;opacity:.48}.lien-chat-v294__send svg{width:20px;height:20px}.lien-chat-v294__error{min-height:18px;margin:0;padding:0 20px 13px;color:#a02f28;font-size:11px}
      @media(max-width:720px){.lien-chat-v294{padding:10px 12px 118px}.lien-chat-v294__hero{padding:4px 4px 16px}.lien-chat-v294__grid{grid-template-columns:1fr;min-height:0;border-radius:20px}.lien-chat-v294__sidebar{border-right:0;border-bottom:1px solid #eadfd5;padding:14px}.lien-chat-v294__staff{display:flex;gap:8px;overflow:auto;padding-bottom:2px;scrollbar-width:none}.lien-chat-v294__staff-button{min-width:210px}.lien-chat-v294__messages,.lien-chat-v294__empty{min-height:330px}.lien-chat-v294__composer{padding:12px}.lien-chat-v294__conversation-head{padding:12px 14px}}
      @media(prefers-reduced-motion:reduce){.lien-chat-v294__staff-button{transition:none}}
    `
    document.head.appendChild(style)
  }

  function initCustomerChat() {
    if (location.pathname !== '/u/chat') return
    const main = document.querySelector('main')
    if (!main || main.dataset.lienCustomerChatV294 === 'ready') return
    main.dataset.lienCustomerChatV294 = 'ready'
    chatStyles()
    main.innerHTML = `<section class="lien-chat-v294" aria-label="チャット相談"><header class="lien-chat-v294__hero"><p class="lien-chat-v294__eyebrow">Salon talk</p><h1>チャット相談</h1><p>サロンスタッフへ気軽に相談できます。</p></header><div class="lien-chat-v294__grid"><aside class="lien-chat-v294__sidebar"><div class="lien-chat-v294__sidebar-head"><strong>スタッフ</strong><span data-chat-staff-count>読込中</span></div><div class="lien-chat-v294__staff" data-chat-staff-list aria-label="相談するスタッフ"></div></aside><section class="lien-chat-v294__conversation"><div data-chat-conversation><div class="lien-chat-v294__empty"><div><span class="lien-chat-v294__empty-icon">${chatIcon}</span><strong>会話を選択してください</strong><p>左側のスタッフを選ぶと相談内容を確認できます。</p></div></div></div><p class="lien-chat-v294__error" data-chat-error aria-live="polite"></p></section></div></section>`

    const state = { directory: [], threads: [], activeKey: null, activeThreadId: null, sending: false }
    const staffList = main.querySelector('[data-chat-staff-list]')
    const staffCount = main.querySelector('[data-chat-staff-count]')
    const conversation = main.querySelector('[data-chat-conversation]')
    const error = main.querySelector('[data-chat-error]')

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

    function renderConversation(staff, payload) {
      const thread = payload?.thread || null
      const messages = Array.isArray(payload?.messages) ? payload.messages : []
      state.activeThreadId = thread?.id || null
      const messageArea = messages.length
        ? `<div class="lien-chat-v294__messages" data-chat-messages>${messages.map(message => `<div class="lien-chat-v294__message ${message.senderType === 'customer' ? 'mine' : ''}">${esc(message.body)}</div>`).join('')}</div>`
        : `<div class="lien-chat-v294__empty"><div><span class="lien-chat-v294__empty-icon">${chatIcon}</span><strong>トークを始めましょう</strong><p>${esc(staff.name)}さんへ、髪のお悩みや次回予約について気軽に相談できます。</p></div></div>`
      conversation.innerHTML = `<header class="lien-chat-v294__conversation-head">${avatar(staff)}<div><strong>${esc(staff.name)}</strong><small>${esc(staff.roleLabel || 'スタイリスト')}</small></div></header>${messageArea}${composer(staff, thread?.id || '')}`
      wireAvatarFallbacks(conversation)
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
      doc.querySelectorAll('[data-store-code],[data-organization-code]').forEach(node => node.remove())
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
            container.remove()
            return
          }
          const previous = label.previousElementSibling
          if (text === '店舗登録用QRコード' && previous?.tagName === 'IMG') previous.remove()
          let sibling = label.nextElementSibling
          let remaining = text === '店舗登録用QRコード' ? 2 : 3
          while (sibling && remaining > 0 && !/^H[1-4]$/.test(sibling.tagName)) {
            const next = sibling.nextElementSibling
            sibling.remove()
            sibling = next
            remaining -= 1
          }
          label.remove()
          return
        }
        let container = label.closest('section,article,[class*="card"],[class*="setting"]')
        if (!container || ['BODY', 'MAIN', 'FORM'].includes(container.tagName)) container = label.parentElement
        if (container && !['BODY', 'MAIN', 'FORM'].includes(container.tagName)) container.remove()
      })
    })
  }

  function removeSmsPanelFallback() {
    document.querySelector('[aria-label="SMS認証・同意状況"]')?.remove()
  }

  const boot = () => {
    removeSmsPanelFallback()
    initCustomerChat()
    removeStoreCodeFromProductDialogs()
  }
  boot()
  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.setInterval(boot, 1000)
})()
