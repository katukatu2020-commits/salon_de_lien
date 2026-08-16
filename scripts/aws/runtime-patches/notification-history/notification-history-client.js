  function notificationHistoryStyles() {
    if (document.getElementById('ca-notification-history-styles')) return
    const style = document.createElement('style')
    style.id = 'ca-notification-history-styles'
    style.textContent = `
      main.ca-notification-history-mode > :not([data-ca-notification-history-root]){display:none!important}
      .ca-notification-history{max-width:1180px;margin:0 auto;padding:6px 0 44px;color:var(--ca-ink,#2f2a25)}
      .ca-notification-history-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px;padding:28px;border:1px solid var(--ca-line,#e8ded2);border-radius:24px;background:var(--ca-paper,#fff);box-shadow:0 16px 42px rgba(61,43,36,.07)}
      .ca-notification-history-eyebrow{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:var(--ca-rose,#9f4f62);font-size:13px;font-weight:800}.ca-notification-history-eyebrow svg{width:17px;height:17px}
      .ca-notification-history h1{margin:0;color:var(--ca-ink,#2f2a25);font-size:clamp(25px,3vw,36px);letter-spacing:0;line-height:1.3}.ca-notification-history-lead{max-width:680px;margin:9px 0 0;color:var(--ca-muted,#7c7168);font-size:14px;line-height:1.8}
      .ca-notification-history-back{display:inline-flex;min-height:44px;flex:0 0 auto;align-items:center;justify-content:center;gap:7px;border:1px solid var(--ca-line,#e8ded2);border-radius:999px;background:var(--ca-paper,#fff);padding:0 17px;color:var(--ca-ink,#2f2a25);font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 5px 16px rgba(61,43,36,.05)}.ca-notification-history-back svg{width:16px;height:16px}
      .ca-notification-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.ca-notification-history-tabs{display:flex;gap:7px;overflow:auto;padding:2px;scrollbar-width:none}
      .ca-notification-history-tab{min-height:40px;white-space:nowrap;border:1px solid var(--ca-line,#e8ded2);border-radius:999px;background:var(--ca-paper,#fff);padding:0 16px;color:var(--ca-muted,#7c7168);font:700 13px inherit;cursor:pointer}.ca-notification-history-tab[aria-selected="true"]{border-color:var(--ca-primary,#8f4f42);background:var(--ca-primary,#8f4f42);color:#fff}
      .ca-notification-history-count{color:var(--ca-muted,#7c7168);font-size:12px;font-weight:700;white-space:nowrap}.ca-notification-history-list{display:grid;gap:10px}
      .ca-notification-history-item{display:grid;grid-template-columns:46px minmax(0,1fr) 18px;gap:14px;align-items:center;min-height:98px;border:1px solid var(--ca-line,#e8ded2);border-radius:20px;background:var(--ca-paper,#fff);padding:17px 18px;color:var(--ca-ink,#2f2a25);text-decoration:none;box-shadow:0 8px 24px rgba(61,43,36,.045);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.ca-notification-history-item:hover{border-color:var(--ca-primary,#8f4f42);transform:translateY(-1px);box-shadow:0 12px 28px rgba(61,43,36,.08)}
      .ca-notification-history-symbol{display:grid;width:46px;height:46px;place-items:center;border-radius:15px;background:var(--ca-soft,#f6efe6);color:var(--ca-primary,#8f4f42)}.ca-notification-history-item.message .ca-notification-history-symbol{background:var(--lien-sage-soft,#e9f0e8);color:var(--lien-sage,#67836b)}.ca-notification-history-symbol svg,.ca-notification-history-arrow svg{width:20px;height:20px}
      .ca-notification-history-copy{min-width:0}.ca-notification-history-meta{display:flex;align-items:center;gap:9px;margin-bottom:5px;color:var(--ca-muted,#7c7168);font-size:11px;font-weight:700}.ca-notification-history-kind{border-radius:999px;background:var(--ca-soft,#f6efe6);padding:3px 8px;color:var(--ca-primary,#8f4f42)}
      .ca-notification-history-copy strong{display:block;overflow:hidden;color:var(--ca-ink,#2f2a25);font-size:15px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.ca-notification-history-copy p{display:-webkit-box;overflow:hidden;margin:4px 0 0;color:var(--ca-muted,#7c7168);font-size:13px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.ca-notification-history-arrow{color:var(--ca-muted,#7c7168)}
      .ca-notification-history-empty{display:grid;min-height:260px;place-items:center;border:1px dashed var(--ca-line,#e8ded2);border-radius:24px;background:var(--ca-paper,#fff);padding:30px;text-align:center}.ca-notification-history-empty .symbol{display:grid;width:58px;height:58px;margin:0 auto 14px;place-items:center;border-radius:20px;background:var(--ca-soft,#f6efe6);color:var(--ca-primary,#8f4f42)}.ca-notification-history-empty svg{width:25px;height:25px}.ca-notification-history-empty strong{display:block;color:var(--ca-ink,#2f2a25);font-size:16px}.ca-notification-history-empty p{margin:7px 0 0;color:var(--ca-muted,#7c7168);font-size:13px}
      .ca-notification-history-loading{display:grid;gap:10px}.ca-notification-history-skeleton{height:98px;border:1px solid var(--ca-line,#e8ded2);border-radius:20px;background:linear-gradient(90deg,var(--ca-paper,#fff),var(--ca-soft,#f6efe6),var(--ca-paper,#fff));background-size:220% 100%;animation:ca-notification-shimmer 1.3s linear infinite}@keyframes ca-notification-shimmer{to{background-position:-220% 0}}
      @media(max-width:700px){.ca-notification-history{padding:0 0 30px}.ca-notification-history-hero{align-items:flex-start;flex-direction:column;padding:21px 18px;border-radius:20px}.ca-notification-history-back{width:100%}.ca-notification-history-toolbar{align-items:flex-start;flex-direction:column}.ca-notification-history-item{grid-template-columns:42px minmax(0,1fr) 16px;gap:11px;min-height:92px;padding:15px 13px}.ca-notification-history-symbol{width:42px;height:42px}.ca-notification-history-count{padding-left:4px}}
      @media(prefers-reduced-motion:reduce){.ca-notification-history-item,.ca-notification-history-skeleton{animation:none;transition:none}}
    `
    document.head.appendChild(style)
  }

  function notificationHistoryItems(payload) {
    const appointments = (Array.isArray(payload?.appointments) ? payload.appointments : []).map(item => ({ id: `appointment:${item.id}`, type: 'appointment', title: `${item.customerName || 'お客様'}様の予約`, body: `${item.menu || 'メニュー相談'}${item.status ? ` / ${item.status}` : ''}`, time: item.createdAt, href: `/admin/appointments/${encodeURIComponent(item.id)}` }))
    const messages = (Array.isArray(payload?.messages) ? payload.messages : []).map(item => ({ id: `message:${item.id}`, type: 'message', title: `${item.customerName || 'お客様'}様からメッセージ`, body: item.body || 'メッセージを確認してください。', time: item.createdAt, href: `/admin/customers/messages?chat=1&threadId=${encodeURIComponent(item.threadId || '')}` }))
    return appointments.concat(messages).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
  }

  function renderNotificationHistory(root, payload) {
    const items = notificationHistoryItems(payload)
    let filter = 'all'
    const list = root.querySelector('[data-ca-notification-history-list]')
    const count = root.querySelector('[data-ca-notification-history-count]')
    const render = () => {
      const visible = filter === 'all' ? items : items.filter(item => item.type === filter)
      count.textContent = `${visible.length}件`
      list.innerHTML = visible.length ? visible.map(item => `<a class="ca-notification-history-item ${esc(item.type)}" href="${esc(item.href)}"><span class="ca-notification-history-symbol">${icon(item.type === 'message' ? 'message' : 'calendar')}</span><span class="ca-notification-history-copy"><span class="ca-notification-history-meta"><span class="ca-notification-history-kind">${item.type === 'message' ? 'メッセージ' : '予約'}</span><time datetime="${esc(item.time || '')}">${esc(notificationTime(item.time))}</time></span><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></span><span class="ca-notification-history-arrow">${icon('chevronRight')}</span></a>`).join('') : `<div class="ca-notification-history-empty"><div><span class="symbol">${icon('bell')}</span><strong>表示するお知らせはありません</strong><p>新しい予約やメッセージが届くと、ここに残ります。</p></div></div>`
    }
    root.querySelectorAll('[data-ca-notification-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.caNotificationFilter || 'all'; root.querySelectorAll('[data-ca-notification-filter]').forEach(candidate => candidate.setAttribute('aria-selected', String(candidate === button))); render() }))
    render()
  }

  function isNotificationHistoryPage() {
    return location.pathname === '/admin/appointments'
      && new URLSearchParams(location.search).get('notificationHistory') === '1'
  }

  function enableNotificationHistoryHardNavigation() {
    if (document.documentElement.dataset.caNotificationHistoryNavigation === '1') return
    document.documentElement.dataset.caNotificationHistoryNavigation = '1'
    document.addEventListener('click', event => {
      if (!isNotificationHistoryPage() || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const target = new URL(anchor.href, location.href)
      if (target.origin !== location.origin || target.href === location.href) return
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(target.href)
    }, true)
  }

  function enhanceNotificationHistoryPage() {
    if (!isNotificationHistoryPage()) return
    enableNotificationHistoryHardNavigation()
    const documentRoot = document.documentElement
    if (documentRoot.dataset.caNotificationHistoryHydrated !== '1') {
      if (documentRoot.dataset.caNotificationHistoryPending === '1') return
      documentRoot.dataset.caNotificationHistoryPending = '1'
      const renderAfterHydration = () => window.setTimeout(() => {
          documentRoot.dataset.caNotificationHistoryHydrated = '1'
          delete documentRoot.dataset.caNotificationHistoryPending
          enhanceNotificationHistoryPage()
        }, 1200)
      if (document.readyState === 'complete') renderAfterHydration()
      else window.addEventListener('load', renderAfterHydration, { once: true })
      return
    }
    notificationHistoryStyles()
    const main = document.querySelector('main')
    if (!main || main.querySelector('[data-ca-notification-history-root]')) return
    main.classList.add('ca-notification-history-mode')
    const historyMarkup = `<section class="ca-notification-history" data-ca-notification-history-root><header class="ca-notification-history-hero"><div><p class="ca-notification-history-eyebrow">${icon('bell')} Notification history</p><h1>お知らせ履歴</h1><p class="ca-notification-history-lead">新しい予約とお客様からのメッセージを、確認後も履歴として見返せます。</p></div><a class="ca-notification-history-back" href="/admin/appointments">${icon('chevronLeft')}予約カレンダーへ戻る</a></header><div class="ca-notification-history-toolbar"><div class="ca-notification-history-tabs" role="tablist" aria-label="お知らせ種別"><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="true" data-ca-notification-filter="all">すべて</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="appointment">予約</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="message">メッセージ</button></div><span class="ca-notification-history-count" data-ca-notification-history-count>読込中</span></div><div class="ca-notification-history-list" data-ca-notification-history-list aria-live="polite"><div class="ca-notification-history-loading"><div class="ca-notification-history-skeleton"></div><div class="ca-notification-history-skeleton"></div><div class="ca-notification-history-skeleton"></div></div></div></section>`
    main.insertAdjacentHTML('beforeend', historyMarkup)
    fetch('/api/lien-staff-notifications?history=1&read=1', { credentials: 'same-origin', cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error('通知履歴を取得できませんでした。'))).then(payload => { renderNotificationHistory(main.querySelector('[data-ca-notification-history-root]'), payload); refreshNotifications(true) }).catch(error => { const list = main.querySelector('[data-ca-notification-history-list]'); if (list) list.innerHTML = `<div class="ca-notification-history-empty"><div><span class="symbol">${icon('bell')}</span><strong>通知履歴を読み込めませんでした</strong><p>${esc(error.message || '時間をおいて再度お試しください。')}</p></div></div>` })
  }
