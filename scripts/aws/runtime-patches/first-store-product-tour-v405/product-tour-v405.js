;(() => {
  'use strict'

  if (window.__lienFirstStoreProductTourV405) return
  window.__lienFirstStoreProductTourV405 = true

  const VERSION = 'v1'
  const PENDING_KEY = 'lien-product-tour-pending'
  const query = new URLSearchParams(location.search)
  const registrationEntry = location.pathname === '/admin/settings' && query.get('registered') === '1'

  if (registrationEntry) {
    try { localStorage.setItem(PENDING_KEY, 'awaiting') } catch {}
  }

  try {
    window.__lienProductTourActive = registrationEntry || Boolean(localStorage.getItem(PENDING_KEY))
  } catch {
    window.__lienProductTourActive = registrationEntry
  }

  const steps = [
    {
      key: 'settings',
      route: '/admin/settings',
      eyebrow: '店舗の土台',
      title: '店舗情報と識別コード',
      description: '店舗アイコン、営業時間、ポイント・クーポン設定を管理します。店舗識別コードは、お客様アプリと店舗を安全につなぐためのコードです。',
      tip: '最初に店舗識別コードを控え、店舗アイコンと営業時間を確認しましょう。',
      icon: 'store',
    },
    {
      key: 'appointments',
      route: '/admin/appointments',
      eyebrow: '毎日の営業',
      title: '予約・シフト・会計',
      description: '日別シフト、予約カレンダー、履歴を確認します。予約を開くと、施術メニュー・商品・ポイントを含む会計へ進めます。',
      tip: '空き時間の確認から会計完了まで、この画面が一日の中心です。',
      icon: 'calendar',
    },
    {
      key: 'customers',
      route: '/admin/customers',
      eyebrow: 'お客様との関係',
      title: '顧客・ポイント・チャット・配信',
      description: '顧客カルテ、来店履歴、保有ポイントを確認します。チャット相談や、条件を絞ったメッセージ配信もここから行えます。',
      tip: 'お客様を選ぶと、履歴と次の接客に必要な情報が一つにまとまります。',
      icon: 'users',
    },
    {
      key: 'products',
      route: '/admin/products',
      eyebrow: '売上と商品体験',
      title: 'メニュー・商品棚・アンケート集計',
      description: '施術メニューの価格と時間、商品の価格と在庫を管理します。購入後アンケートの回答と評価も商品別に確認できます。',
      tip: 'メニューと商品を登録すると、予約・会計・アンケートが自動でつながります。',
      icon: 'box',
    },
    {
      key: 'community',
      route: '/admin/community',
      eyebrow: '仕上がりを資産に',
      title: 'みんなのスタイル',
      description: '施術後写真を、メニューや担当者と一緒に掲載します。お客様からのいいねやコメントを確認できます。',
      tip: '写真は会計完了後の予約から追加でき、来店履歴とも紐づきます。',
      icon: 'image',
    },
    {
      key: 'analytics',
      route: '/admin/owner-analytics',
      eyebrow: '経営を見渡す',
      title: '経営分析',
      description: '売上推移、スタッフ実績、顧客構成、平均来店サイクルを確認します。オーナーだけが閲覧できる画面です。',
      tip: '数字を見るだけでなく、次に改善する項目を決めるために使います。',
      icon: 'chart',
    },
  ]

  const icon = name => {
    const paths = {
      store: '<path d="M3 10h18M5 10v11h14V10M4 3h16l2 7H2l2-7Zm5 18v-6h6v6"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9"/>',
      box: '<path d="m21 8-9 5-9-5 9-5 9 5Z"/><path d="m3 8 9 5v9M21 8v9l-9 5"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 20"/>',
      chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      sparkle: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 22l-.7-2.3L16 18l2.3-.7L19 15Z"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      play: '<path d="m9 18 6-6-6-6"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`
  }

  function addStyles() {
    if (document.getElementById('lien-product-tour-v405-styles')) return
    const style = document.createElement('style')
    style.id = 'lien-product-tour-v405-styles'
    style.textContent = `
      .lpt-highlight{position:relative!important;z-index:80!important;box-shadow:0 0 0 3px rgba(159,85,71,.2),0 10px 30px rgba(83,47,38,.14)!important}
      .lpt-welcome{position:fixed;z-index:100020;inset:0;display:grid;place-items:center;overflow:auto;background:rgba(39,27,22,.58);padding:20px;backdrop-filter:blur(8px)}
      .lpt-welcome-card{width:min(760px,100%);overflow:hidden;border:1px solid #ead8cf;border-radius:26px;background:#fffdfb;box-shadow:0 34px 100px rgba(40,25,19,.3)}
      .lpt-welcome-head{display:grid;grid-template-columns:64px minmax(0,1fr);gap:17px;align-items:center;border-bottom:1px solid #eaded7;background:linear-gradient(135deg,#fff,#fbf3ed);padding:25px 26px 21px}
      .lpt-welcome-mark{display:grid;width:64px;height:64px;place-items:center;border-radius:20px;background:#8f4f42;color:#fff;box-shadow:0 12px 28px rgba(143,79,66,.24)}
      .lpt-welcome-mark svg{width:31px;height:31px}.lpt-welcome-head h2{margin:3px 0 6px;color:#2f2a25;font:700 25px/1.35 system-ui,-apple-system,"Segoe UI","Yu Gothic",sans-serif;letter-spacing:0}.lpt-welcome-head p{margin:0;color:#756a62;font-size:13px;line-height:1.7}.lpt-kicker{color:#8f4f42;font-size:10px;font-weight:800;letter-spacing:.08em}
      .lpt-welcome-body{padding:22px 26px 25px}.lpt-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lpt-map-item{display:flex;min-width:0;align-items:center;gap:10px;border:1px solid #eaded7;border-radius:15px;background:#fff;padding:12px}.lpt-map-icon{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border-radius:11px;background:#f6efe6;color:#8f4f42}.lpt-map-icon svg{width:17px;height:17px}.lpt-map-item span:last-child{min-width:0;color:#3c312c;font-size:11px;font-weight:700;line-height:1.45}
      .lpt-welcome-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:20px}.lpt-duration{color:#7c7168;font-size:11px}.lpt-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:#8f4f42;padding:0 19px;color:#fff;font:700 12px system-ui,-apple-system,"Segoe UI","Yu Gothic",sans-serif;box-shadow:0 9px 22px rgba(143,79,66,.2);cursor:pointer}.lpt-button:hover{background:#7d453a}.lpt-button svg{width:16px;height:16px}.lpt-button.secondary{border:1px solid #e3d5ca;background:#fff;color:#473a34;box-shadow:none}.lpt-text-button{border:0;background:none;padding:9px;color:#7c7168;font:700 11px system-ui,-apple-system,"Segoe UI","Yu Gothic",sans-serif;cursor:pointer}
      .lpt-coach{position:fixed;z-index:100010;right:20px;bottom:20px;width:min(390px,calc(100vw - 32px));overflow:hidden;border:1px solid #dfcec3;border-radius:22px;background:rgba(255,253,251,.98);box-shadow:0 24px 70px rgba(46,29,23,.22);backdrop-filter:blur(14px)}
      .lpt-coach-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border-bottom:1px solid #eee1d9;padding:17px 18px 14px}.lpt-step-label{color:#8f4f42;font-size:10px;font-weight:800;letter-spacing:.07em}.lpt-coach h2{margin:5px 0 0;color:#2f2a25;font:700 18px/1.4 system-ui,-apple-system,"Segoe UI","Yu Gothic",sans-serif;letter-spacing:0}.lpt-minimize{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border:1px solid #e7d9d0;border-radius:50%;background:#fff;color:#77665e;cursor:pointer}.lpt-minimize svg{width:16px;height:16px}.lpt-progress{height:3px;background:#f0e7e1}.lpt-progress span{display:block;height:100%;border-radius:99px;background:#8f4f42;transition:width .2s ease}.lpt-coach-body{padding:16px 18px 18px}.lpt-coach-body p{margin:0;color:#685b54;font-size:12px;line-height:1.75}.lpt-tip{display:flex;gap:9px;margin-top:13px;border-radius:14px;background:#f8f1eb;padding:11px 12px;color:#594b44;font-size:11px;line-height:1.6}.lpt-tip svg{width:16px;height:16px;flex:0 0 16px;margin-top:1px;color:#a35c4d}.lpt-coach-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}.lpt-back{display:inline-flex;min-height:42px;align-items:center;gap:5px;border:0;background:none;padding:0 8px;color:#71645d;font-size:11px;font-weight:700;cursor:pointer}.lpt-back svg{width:15px;height:15px}.lpt-resume{position:fixed;z-index:100005;right:18px;bottom:18px;display:inline-flex;min-height:44px;align-items:center;gap:8px;border:1px solid #dfcec3;border-radius:999px;background:#fffdfb;padding:0 16px 0 10px;color:#713e34;font-size:11px;font-weight:800;box-shadow:0 12px 34px rgba(65,38,30,.16);cursor:pointer}.lpt-resume span{display:grid;width:29px;height:29px;place-items:center;border-radius:50%;background:#f2ded7}.lpt-resume svg{width:15px;height:15px}
      .lpt-complete-mark{display:grid;width:58px;height:58px;place-items:center;margin:0 auto 13px;border-radius:50%;background:#eaf5ec;color:#41634a}.lpt-complete-mark svg{width:27px;height:27px}.lpt-complete-copy{text-align:center}.lpt-complete-copy h2{margin:0;color:#2f2a25;font-size:21px}.lpt-complete-copy p{margin:7px 0 0;color:#756a62;font-size:12px;line-height:1.7}.lpt-readiness{display:flex;justify-content:center;gap:7px;margin-top:15px;flex-wrap:wrap}.lpt-ready-chip{border-radius:999px;background:#f5eee8;padding:6px 10px;color:#67574f;font-size:10px;font-weight:800}.lpt-ready-chip.done{background:#eaf5ec;color:#41634a}
      @media(max-width:700px){.lpt-welcome{align-items:end;padding:0}.lpt-welcome-card{max-height:94dvh;overflow:auto;border-radius:24px 24px 0 0}.lpt-welcome-head{grid-template-columns:50px minmax(0,1fr);padding:19px 17px 16px}.lpt-welcome-mark{width:50px;height:50px;border-radius:16px}.lpt-welcome-mark svg{width:25px;height:25px}.lpt-welcome-head h2{font-size:20px}.lpt-welcome-body{padding:17px}.lpt-map{grid-template-columns:repeat(2,minmax(0,1fr))}.lpt-welcome-actions{align-items:stretch;flex-direction:column}.lpt-welcome-actions .lpt-button{width:100%}.lpt-duration{text-align:center}.lpt-coach{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));width:calc(100vw - 20px);border-radius:20px}.lpt-coach-actions .lpt-button{flex:1}.lpt-resume{right:12px;bottom:calc(76px + env(safe-area-inset-bottom))}}
      @media(prefers-reduced-motion:reduce){.lpt-progress span,.lpt-button{transition:none!important}.lpt-button:hover{transform:none!important}}
    `
    document.head.appendChild(style)
  }

  const stateKey = organizationId => `lien-product-tour:${VERSION}:${organizationId}`

  function readState(organizationId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(stateKey(organizationId)) || 'null')
      return parsed && parsed.organizationId === organizationId ? parsed : null
    } catch { return null }
  }

  function writeState(value) {
    try {
      localStorage.setItem(stateKey(value.organizationId), JSON.stringify(value))
      localStorage.setItem(PENDING_KEY, value.organizationId)
    } catch {}
  }

  function clearPending() {
    try { localStorage.removeItem(PENDING_KEY) } catch {}
    window.__lienProductTourActive = false
  }

  function removeUi() {
    document.querySelectorAll('.lpt-welcome,.lpt-coach,.lpt-resume').forEach(node => node.remove())
    document.querySelectorAll('.lpt-highlight').forEach(node => node.classList.remove('lpt-highlight'))
  }

  function replaceRegistrationQuery() {
    if (!registrationEntry) return
    const clean = new URL(location.href)
    clean.searchParams.delete('registered')
    history.replaceState(history.state, '', clean.pathname + clean.search + clean.hash)
  }

  function routeMatches(route) {
    if (route === '/admin/owner-analytics') return location.pathname === route && new URLSearchParams(location.search).get('section') !== 'billing'
    return location.pathname === route
  }

  function isBillingScreen() {
    return location.pathname === '/admin/owner-analytics' && new URLSearchParams(location.search).get('section') === 'billing'
  }

  function highlightStep(step) {
    document.querySelectorAll('.lpt-highlight').forEach(node => node.classList.remove('lpt-highlight'))
    let target = Array.from(document.querySelectorAll('a[href]')).find(link => {
      try { return new URL(link.href, location.href).pathname === step.route } catch { return false }
    })
    if (step.key === 'settings') {
      target = Array.from(document.querySelectorAll('h1,h2,h3')).find(node => node.textContent.includes('店舗識別コード'))?.closest('section,article,div') || target
    }
    if (target) {
      target.classList.add('lpt-highlight')
      if (!target.closest('aside')) target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }

  function showResumeButton(tourState, setup) {
    removeUi()
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lpt-resume'
    button.innerHTML = `<span>${icon('play')}</span>使い方ガイドを再開`
    button.addEventListener('click', () => {
      tourState.paused = false
      writeState(tourState)
      renderTour(tourState, setup)
    })
    document.body.appendChild(button)
  }

  function finishTour(tourState, setup) {
    tourState.status = 'completed'
    tourState.completedAt = new Date().toISOString()
    tourState.paused = false
    try { localStorage.setItem(stateKey(tourState.organizationId), JSON.stringify(tourState)) } catch {}
    clearPending()
    removeUi()

    const ready = [
      ['スタッフ', Number(setup.staffCount) > 0],
      ['メニュー', Number(setup.menuCount) > 0],
      ['予約メール', Boolean(setup.inbound?.address)],
    ]
    const allReady = ready.every(item => item[1])
    const root = document.createElement('div')
    root.className = 'lpt-welcome'
    root.innerHTML = `<section class="lpt-welcome-card" role="dialog" aria-modal="true" aria-labelledby="lpt-complete-title"><div class="lpt-welcome-body"><div class="lpt-complete-mark">${icon('check')}</div><div class="lpt-complete-copy"><h2 id="lpt-complete-title">操作ガイドは完了です</h2><p>主要な機能の場所を確認できました。${allReady ? '店舗の基本準備も整っています。' : '続けて店舗の基本設定を仕上げましょう。'}</p></div><div class="lpt-readiness">${ready.map(([label, done]) => `<span class="lpt-ready-chip ${done ? 'done' : ''}">${done ? '✓ ' : ''}${label}</span>`).join('')}</div><div class="lpt-welcome-actions"><span class="lpt-duration">必要な設定は後からいつでも変更できます</span><button type="button" class="lpt-button" data-lpt-complete>${allReady ? '予約画面へ' : '初期設定を仕上げる'}${icon('arrow')}</button></div></div></section>`
    root.querySelector('[data-lpt-complete]').addEventListener('click', () => {
      root.remove()
      location.assign(allReady ? '/admin/appointments' : '/admin/appointments?setup=1')
    })
    document.body.appendChild(root)
  }

  function showWelcome(tourState, setup) {
    removeUi()
    const root = document.createElement('div')
    root.className = 'lpt-welcome'
    root.innerHTML = `<section class="lpt-welcome-card" role="dialog" aria-modal="true" aria-labelledby="lpt-welcome-title"><header class="lpt-welcome-head"><span class="lpt-welcome-mark">${icon('sparkle')}</span><div><span class="lpt-kicker">WELCOME TO SALON DE LIEN</span><h2 id="lpt-welcome-title">まず、全体を一緒に見てみましょう</h2><p>約3分で、毎日の営業に使う6つの画面を順番に確認します。実際の画面を開きながら進めます。</p></div></header><div class="lpt-welcome-body"><div class="lpt-map">${steps.map(step => `<div class="lpt-map-item"><span class="lpt-map-icon">${icon(step.icon)}</span><span>${step.title}</span></div>`).join('')}</div><div class="lpt-welcome-actions"><button type="button" class="lpt-text-button" data-lpt-skip>今回は見ない</button><span class="lpt-duration">所要時間 約3分</span><button type="button" class="lpt-button" data-lpt-start>ガイドを始める${icon('arrow')}</button></div></div></section>`
    root.querySelector('[data-lpt-start]').addEventListener('click', () => {
      tourState.welcome = false
      tourState.step = 0
      tourState.paused = false
      writeState(tourState)
      root.remove()
      renderTour(tourState, setup)
    })
    root.querySelector('[data-lpt-skip]').addEventListener('click', () => {
      tourState.status = 'dismissed'
      tourState.dismissedAt = new Date().toISOString()
      try { localStorage.setItem(stateKey(tourState.organizationId), JSON.stringify(tourState)) } catch {}
      clearPending()
      root.remove()
    })
    document.body.appendChild(root)
  }

  function renderCoach(tourState, setup) {
    removeUi()
    const stepIndex = Math.max(0, Math.min(steps.length - 1, Number(tourState.step) || 0))
    const step = steps[stepIndex]
    const onRoute = routeMatches(step.route)
    if (onRoute) window.setTimeout(() => highlightStep(step), 120)

    const root = document.createElement('aside')
    root.className = 'lpt-coach'
    root.setAttribute('aria-label', '操作ガイド')
    root.innerHTML = `<header class="lpt-coach-head"><div><span class="lpt-step-label">STEP ${stepIndex + 1} / ${steps.length}　${step.eyebrow}</span><h2>${step.title}</h2></div><button type="button" class="lpt-minimize" aria-label="ガイドを一時停止" data-lpt-pause>${icon('close')}</button></header><div class="lpt-progress"><span style="width:${((stepIndex + 1) / steps.length) * 100}%"></span></div><div class="lpt-coach-body"><p>${step.description}</p><div class="lpt-tip">${icon('sparkle')}<span>${step.tip}</span></div><div class="lpt-coach-actions"><button type="button" class="lpt-back" data-lpt-back ${stepIndex === 0 ? 'disabled' : ''}>${icon('back')}戻る</button><button type="button" class="lpt-button" data-lpt-next>${onRoute ? (stepIndex === steps.length - 1 ? 'ガイドを完了' : '次の画面へ') : 'この画面を開く'}${icon('arrow')}</button></div></div>`
    root.querySelector('[data-lpt-pause]').addEventListener('click', () => {
      tourState.paused = true
      writeState(tourState)
      showResumeButton(tourState, setup)
    })
    root.querySelector('[data-lpt-back]').addEventListener('click', () => {
      if (stepIndex === 0) return
      tourState.step = stepIndex - 1
      writeState(tourState)
      location.assign(steps[tourState.step].route)
    })
    root.querySelector('[data-lpt-next]').addEventListener('click', () => {
      if (!onRoute) {
        location.assign(step.route)
        return
      }
      if (stepIndex === steps.length - 1) {
        finishTour(tourState, setup)
        return
      }
      tourState.step = stepIndex + 1
      writeState(tourState)
      location.assign(steps[tourState.step].route)
    })
    document.body.appendChild(root)
  }

  function renderTour(tourState, setup) {
    if (!tourState || tourState.status !== 'active') return
    if (isBillingScreen()) {
      removeUi()
      return
    }
    if (tourState.paused) return showResumeButton(tourState, setup)
    if (tourState.welcome) return showWelcome(tourState, setup)
    renderCoach(tourState, setup)
  }

  async function boot() {
    if (!location.pathname.startsWith('/admin/')) return
    addStyles()
    try {
      const response = await fetch('/api/lien-tenant-setup/status', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      if (!response.ok) return
      const setup = await response.json()
      if (!setup.organizationId || setup.role !== 'ADMIN' || setup.legacy) {
        clearPending()
        return
      }

      const pending = (() => { try { return localStorage.getItem(PENDING_KEY) } catch { return null } })()
      let tourState = readState(setup.organizationId)
      if (registrationEntry && (!tourState || !['completed', 'dismissed'].includes(tourState.status))) {
        tourState = { organizationId: setup.organizationId, status: 'active', step: 0, welcome: true, paused: false, startedAt: new Date().toISOString() }
        writeState(tourState)
      } else if (pending === setup.organizationId && tourState?.status === 'active') {
        window.__lienProductTourActive = true
      } else if (pending === 'awaiting' && registrationEntry) {
        tourState = { organizationId: setup.organizationId, status: 'active', step: 0, welcome: true, paused: false, startedAt: new Date().toISOString() }
        writeState(tourState)
      } else if (!tourState || tourState.status !== 'active') {
        clearPending()
        replaceRegistrationQuery()
        return
      }

      window.__lienProductTourActive = true
      replaceRegistrationQuery()
      renderTour(tourState, setup)
    } catch (error) {
      console.warn('First-store product tour could not be started', error)
    }
  }

  const start = () => window.requestAnimationFrame(boot)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})() /* first-store-product-tour-v405 */
