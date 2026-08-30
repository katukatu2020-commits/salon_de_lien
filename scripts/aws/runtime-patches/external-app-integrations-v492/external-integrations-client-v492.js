'use strict'

;(() => {
  if (window.__lienExternalAppIntegrationsV492) return
  window.__lienExternalAppIntegrationsV492 = true

  const PANEL_ID = 'lien-external-integrations-v492'
  const HOTPEPPER_ID = 'lien-hotpepper-settings-v492'
  const STYLE_ID = 'lien-external-integrations-style-v492'
  let frame = 0

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  const icon = name => {
    const paths = {
      link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.link}</svg>`
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      [data-external-source-hidden-v492]{display:none!important}
      .external-v492-source-grid{grid-template-columns:minmax(0,1fr)!important}
      #${PANEL_ID}{width:min(72rem,100%);min-width:0;margin:0 auto 30px;box-sizing:border-box;color:#2f2a25}
      #${PANEL_ID}[hidden]{display:none!important}
      .external-v492-head{display:flex;align-items:flex-start;gap:15px;padding:8px 4px 20px;border-bottom:1px solid #eadfd6}
      .external-v492-head-mark{display:grid;width:44px;height:44px;flex:none;place-items:center;border:1px solid #e6d7ce;border-radius:12px;background:#fff7f3;color:#9b4f42}
      .external-v492-head-mark svg{width:21px;height:21px}
      .external-v492-head h2{margin:0;font-size:24px;line-height:1.35;letter-spacing:0}
      .external-v492-head p{margin:6px 0 0;color:#776b63;font-size:13px;line-height:1.7}
      .external-v492-stack{display:grid;gap:18px;padding-top:18px}
      .external-v492-line-slot{min-width:0}
      .external-v492-line-slot #lien-line-settings-v436{width:100%!important;min-width:0;margin:0!important;box-sizing:border-box}
      .external-v492-loading{display:flex;min-height:108px;align-items:center;justify-content:center;border:1px solid #e8ded2;border-radius:16px;background:#fff;color:#81746c;font-size:13px;font-weight:700}
      .external-v492-card{min-width:0;border:1px solid #e8ded2;border-radius:20px;background:#fff;padding:22px;box-shadow:0 13px 34px rgba(66,43,35,.07);box-sizing:border-box}
      .external-v492-card *{box-sizing:border-box}
      .external-v492-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
      .external-v492-card-title{display:flex;min-width:0;align-items:flex-start;gap:14px}
      .external-v492-provider{display:grid;width:46px;height:46px;flex:none;place-items:center;border-radius:14px;background:#d94d63;color:#fff;font-size:12px;font-weight:900}
      .external-v492-card h3{margin:0;font-size:20px;line-height:1.4;letter-spacing:0}
      .external-v492-card p{margin:6px 0 0;color:#756a62;font-size:13px;line-height:1.75}
      .external-v492-status{display:inline-flex;min-height:34px;flex:none;align-items:center;gap:6px;border:1px solid #bfdcc7;border-radius:999px;background:#edf8f0;padding:0 13px;color:#2f7045;font-size:11px;font-weight:800;white-space:nowrap}
      .external-v492-status svg{width:14px;height:14px}
      .external-v492-status.off{border-color:#ded1c7;background:#faf7f3;color:#74675f}
      .external-v492-value{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-top:20px;border:1px solid #e7d9cf;border-radius:14px;background:#fbf8f4;padding:12px 12px 12px 15px}
      .external-v492-value code{min-width:0;color:#493d37;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.65;overflow-wrap:anywhere}
      .external-v492-copy{display:grid;width:40px;height:40px;place-items:center;border:1px solid #ded1c7;border-radius:10px;background:#fff;color:#55473f;cursor:pointer}
      .external-v492-copy:hover{border-color:#b77a6d;background:#fff8f4;color:#8f4f42}
      .external-v492-copy:focus-visible{outline:3px solid rgba(143,79,66,.24);outline-offset:2px}
      .external-v492-copy svg{width:18px;height:18px}
      .external-v492-guide{display:grid;gap:8px;margin-top:16px;border-top:1px solid #eee4db;padding-top:16px;color:#6f635b;font-size:12px;line-height:1.7}
      .external-v492-guide strong{color:#3b302b;font-size:12px}
      .external-v492-guide ol{margin:0;padding-left:20px}
      .external-v492-meta{margin-top:12px;color:#81746c;font-size:11px;line-height:1.6}
      .external-v492-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:17px}
      .external-v492-feedback{min-height:18px;margin:0 auto 0 0!important;color:#2f7045!important;font-size:12px!important}
      .external-v492-primary{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:#8f4f42;padding:0 17px;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 9px 23px rgba(143,79,66,.22)}
      .external-v492-primary:disabled{cursor:wait;opacity:.55}
      .external-v492-primary svg{width:16px;height:16px}
      @media(max-width:900px){#${PANEL_ID}{width:calc(100vw - 280px);max-width:calc(100vw - 280px);min-width:0;margin-left:0;margin-right:0;padding:0}}
      @media(max-width:760px){.external-v492-head{padding:8px 0 16px}.external-v492-head h2{font-size:20px}.external-v492-card{padding:18px}.external-v492-card-head{display:block}.external-v492-status{margin-top:12px}.external-v492-value{grid-template-columns:minmax(0,1fr) auto}.external-v492-actions{align-items:stretch;flex-direction:column}.external-v492-feedback{width:100%}.external-v492-primary{width:100%}}
      @media(max-width:560px){body:has(#${PANEL_ID}:not([hidden])) .admin-desktop-sidebar{visibility:hidden!important;pointer-events:none!important;transform:translateX(-100%)!important}body:has(#${PANEL_ID}:not([hidden])) .ts-sidebar-toggle{display:none!important}body:has(#${PANEL_ID}:not([hidden])) .admin-app-shell,body:has(#${PANEL_ID}:not([hidden])) .admin-app-shell>div:has(>.admin-main-content),body:has(#${PANEL_ID}:not([hidden])) .admin-shell-header,body:has(#${PANEL_ID}:not([hidden])) .admin-main-content{width:100vw!important;max-width:100vw!important;min-width:0!important;padding-left:0!important}body:has(#${PANEL_ID}:not([hidden])) .admin-main-content{padding-right:12px!important;padding-left:12px!important}#${PANEL_ID}{width:calc(100vw - 24px)!important;max-width:calc(100vw - 24px)!important;margin-left:0;margin-right:0}}
      @media(prefers-reduced-motion:reduce){.external-v492-copy,.external-v492-primary{transition:none}}
    `
    document.head.appendChild(style)
  }

  async function copyText(value, feedback) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else throw new Error('clipboard unavailable')
    } catch {
      const input = document.createElement('textarea')
      input.value = value
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    feedback.textContent = '受信用メールをコピーしました。'
    window.setTimeout(() => { if (feedback.textContent.includes('コピー')) feedback.textContent = '' }, 2200)
  }

  function renderHotpepper(card, profile) {
    const address = String(profile?.setup?.inboundAddress || '')
    const lastInboundAt = profile?.setup?.lastInboundAt
    card.dataset.state = 'ready'
    card.innerHTML = `
      <div class="external-v492-card-head">
        <div class="external-v492-card-title"><span class="external-v492-provider">HP</span><div><h3>Hotpepper予約受信用メール</h3><p>Hotpepperの予約通知を、この店舗の予約台帳へ取り込むための専用受信先です。</p></div></div>
        <span class="external-v492-status ${address ? '' : 'off'}">${address ? icon('check') + '受信準備済み' : '未発行'}</span>
      </div>
      ${address ? `<div class="external-v492-value"><code>${escapeHtml(address)}</code><button class="external-v492-copy" type="button" title="受信用メールをコピー" aria-label="受信用メールをコピー" data-hotpepper-copy>${icon('copy')}</button></div>` : ''}
      <div class="external-v492-guide"><strong>Hotpepper側で行う設定</strong><ol><li>SALON BOARDの予約通知先へ、この専用メールアドレスを追加します。</li><li>通知先を変更できない場合は、予約通知メールだけをこのアドレスへ自動転送します。</li><li>受信した予約は重複を確認したうえで、予約カレンダーへ反映されます。</li></ol></div>
      ${lastInboundAt ? `<div class="external-v492-meta">最終受信 ${escapeHtml(new Date(lastInboundAt).toLocaleString('ja-JP'))}</div>` : '<div class="external-v492-meta">予約メールの受信を待機しています。</div>'}
      <div class="external-v492-actions"><p class="external-v492-feedback" role="status" aria-live="polite"></p>${address ? '' : `<button class="external-v492-primary" type="button" data-hotpepper-issue>${icon('mail')}専用メールを発行</button>`}</div>
    `
    const feedback = card.querySelector('.external-v492-feedback')
    card.querySelector('[data-hotpepper-copy]')?.addEventListener('click', () => copyText(address, feedback))
    card.querySelector('[data-hotpepper-issue]')?.addEventListener('click', async event => {
      const button = event.currentTarget
      button.disabled = true
      feedback.textContent = '専用メールを発行しています…'
      try {
        const response = await fetch('/api/lien-tenant-setup/inbound/address', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: '{}',
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.inbound?.address) throw new Error(payload.error || '専用メールを発行できませんでした。')
        renderHotpepper(card, { setup: { inboundAddress: payload.inbound.address, lastInboundAt: payload.inbound.lastReceivedAt } })
      } catch (error) {
        button.disabled = false
        feedback.textContent = error.message || '専用メールを発行できませんでした。'
        feedback.style.color = '#9a302a'
      }
    })
  }

  async function loadHotpepper(card, force = false) {
    if (!force && ['loading', 'ready'].includes(card.dataset.state || '')) return
    card.dataset.state = 'loading'
    card.innerHTML = '<div class="external-v492-loading">Hotpepper連携情報を読み込んでいます…</div>'
    try {
      const response = await fetch('/api/admin/store-profile', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '受信用メールを取得できませんでした。')
      renderHotpepper(card, payload.profile)
    } catch (error) {
      card.dataset.state = 'error'
      card.innerHTML = `<div class="external-v492-card-head"><div class="external-v492-card-title"><span class="external-v492-provider">HP</span><div><h3>Hotpepper予約受信用メール</h3><p>${escapeHtml(error.message)}</p></div></div><span class="external-v492-status off">読込エラー</span></div><div class="external-v492-actions"><button class="external-v492-primary" type="button" data-hotpepper-retry>${icon('refresh')}再読み込み</button></div>`
      card.querySelector('[data-hotpepper-retry]')?.addEventListener('click', () => loadHotpepper(card, true))
    }
  }

  function createPanel(main) {
    const panel = document.createElement('section')
    panel.id = PANEL_ID
    panel.dataset.settingsPanel = 'line'
    panel.setAttribute('aria-labelledby', 'external-v492-title')
    panel.innerHTML = `
      <header class="external-v492-head"><span class="external-v492-head-mark">${icon('link')}</span><div><h2 id="external-v492-title">外部アプリ連携</h2><p>LINEからの予約受付と、Hotpepper予約メールの取り込みを店舗ごとに管理します。</p></div></header>
      <div class="external-v492-stack"><div class="external-v492-line-slot"><div class="external-v492-loading">LINE連携情報を読み込んでいます…</div></div><article id="${HOTPEPPER_ID}" class="external-v492-card" data-state="idle"></article></div>
    `
    main.appendChild(panel)
    return panel
  }

  function organize() {
    frame = 0
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('embedded') === '1') return
    const main = document.querySelector('main')
    const root = main?.querySelector(':scope > div')
    const store = root?.querySelector('#store-profile')
    const nav = root?.querySelector(':scope > .lien-settings-tabs-v447')
    if (!main || !root || !store || !nav) return

    ensureStyle()
    const externalButton = nav.querySelector('[data-settings-panel="line"]')
    if (externalButton && externalButton.textContent.trim() !== '外部アプリ連携') externalButton.textContent = '外部アプリ連携'
    externalButton?.setAttribute('aria-label', '外部アプリ連携')

    const sourceInbound = store.querySelector('[data-ca-inbound-email]')
    if (sourceInbound) {
      sourceInbound.hidden = true
      sourceInbound.setAttribute('aria-hidden', 'true')
      sourceInbound.setAttribute('data-external-source-hidden-v492', '')
      sourceInbound.parentElement?.classList.add('external-v492-source-grid')
    }

    const panel = document.getElementById(PANEL_ID) || createPanel(main)
    panel.dataset.settingsPanel = 'line'
    const lineCard = main.querySelector('#lien-line-settings-v436')
    const lineSlot = panel.querySelector('.external-v492-line-slot')
    if (lineCard && lineCard.parentElement !== lineSlot) {
      lineCard.dataset.externalIntegration = 'line'
      lineSlot.replaceChildren(lineCard)
    }
    const hotpepperCard = panel.querySelector(`#${HOTPEPPER_ID}`)
    if (hotpepperCard) loadHotpepper(hotpepperCard)

    const externalSelected = externalButton?.getAttribute('aria-selected') === 'true' || location.hash === '#settings-line'
    if (panel.hidden === externalSelected) panel.hidden = !externalSelected
  }

  function schedule() {
    if (frame) return
    frame = window.requestAnimationFrame(organize)
  }

  function start() {
    schedule()
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-selected'] })
    window.addEventListener('hashchange', schedule)
    window.addEventListener('popstate', schedule)
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-settings-panel="line"],a[href]')) window.setTimeout(schedule, 40)
    }, true)
  }

  const startAfterHydration = () => window.requestAnimationFrame(() => window.requestAnimationFrame(start))
  if (document.readyState === 'complete') startAfterHydration()
  else window.addEventListener('load', startAfterHydration, { once: true })
})()
