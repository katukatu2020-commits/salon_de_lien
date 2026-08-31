;(() => {
  if (window.__storePlatformV503) return
  window.__storePlatformV503 = true

  let routeTimer = 0
  let analyticsRequest = ''
  let lotteryPayload = null

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])

  function icon(name) {
    const paths = {
      chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
      gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.5 4.8 5.2 6 3.2 10 5.1 12 8m4.5 0C19 8 20 6.5 19.2 5.2 18 3.2 14 5.1 12 8"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.check}</svg>`
  }

  function addStyles() {
    if (document.getElementById('store-platform-v503-styles')) return
    const style = document.createElement('style')
    style.id = 'store-platform-v503-styles'
    style.textContent = `
      .sp-demographics{display:grid;gap:16px;border:1px solid #e7d8d1;border-radius:8px;background:#fffdfb;padding:22px;color:#342824;box-shadow:0 10px 28px rgba(74,42,32,.06)}
      .sp-demographics-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.sp-demographics-title{display:flex;align-items:flex-start;gap:12px}.sp-demographics-symbol{display:grid;width:40px;height:40px;flex:0 0 40px;place-items:center;border-radius:8px;background:#f8e8ec;color:#b74764}.sp-demographics-symbol svg{width:20px;height:20px}.sp-demographics h2{margin:0;font-size:18px;line-height:1.4}.sp-demographics-head p{margin:5px 0 0;color:#817169;font-size:11px;line-height:1.7}.sp-demographics-period{display:inline-flex;min-height:30px;align-items:center;border:1px solid #dfd1ca;border-radius:999px;background:#fff;padding:0 11px;color:#796a63;font-size:10px;font-weight:800;white-space:nowrap}
      .sp-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sp-product-segment{display:grid;gap:13px;border:1px solid #eaded8;border-radius:8px;background:#fff;padding:16px}.sp-product-segment-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sp-product-segment h3{margin:0;font-size:14px;line-height:1.45}.sp-product-maker{display:block;margin-top:3px;color:#8b7b74;font-size:9px}.sp-product-total{flex:0 0 auto;text-align:right}.sp-product-total strong{display:block;font-size:20px;font-variant-numeric:tabular-nums}.sp-product-total span{color:#8b7b74;font-size:9px}.sp-product-highlights{display:flex;flex-wrap:wrap;gap:6px}.sp-product-highlight{display:inline-flex;min-height:27px;align-items:center;gap:5px;border-radius:999px;background:#f8f2ee;padding:0 9px;color:#624e46;font-size:9px;font-weight:850}.sp-product-highlight svg{width:13px;height:13px;color:#a95161}.sp-bars{display:grid;gap:7px}.sp-bars-title{color:#77675f;font-size:9px;font-weight:900}.sp-bar{display:grid;grid-template-columns:58px minmax(0,1fr) 44px;align-items:center;gap:7px;color:#66544d;font-size:9px}.sp-bar-track{height:7px;overflow:hidden;border-radius:999px;background:#f0e9e5}.sp-bar-fill{display:block;height:100%;border-radius:999px;background:#bf5a73}.sp-bars.gender .sp-bar-fill{background:#4c8a79}.sp-bar-value{text-align:right;font-variant-numeric:tabular-nums}.sp-product-empty{display:grid;min-height:90px;place-items:center;border:1px dashed #e4d5ce;border-radius:8px;color:#968780;font-size:10px;text-align:center}.sp-demographics-loading{display:grid;min-height:160px;place-items:center;color:#82726b;font-size:11px;font-weight:800}
      .sp-settings-hours-link{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:8px;margin-top:12px;border:1px solid #d9b9ae;border-radius:999px;background:#fff;padding:0 15px;color:#8b493d;font-size:10px;font-weight:900;text-decoration:none}.sp-settings-hours-link svg{width:15px;height:15px}
      .sp-default-hours{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(0,1.4fr);gap:20px;margin-top:16px;border:1px solid #e5d4cc;border-radius:8px;background:#fff;padding:20px;box-shadow:0 10px 28px rgba(74,42,32,.05)}.sp-default-hours-copy{display:flex;align-items:flex-start;gap:11px}.sp-default-hours-copy .symbol{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border-radius:8px;background:#f9eae6;color:#a34e40}.sp-default-hours-copy svg{width:19px;height:19px}.sp-default-hours h2{margin:0;font-size:15px}.sp-default-hours p{margin:5px 0 0;color:#817169;font-size:10px;line-height:1.7}.sp-default-hours-form{display:grid;grid-template-columns:1fr 16px 1fr;align-items:end;gap:9px}.sp-default-field{display:grid;gap:6px;color:#59463f;font-size:10px;font-weight:850}.sp-default-field select{width:100%;height:42px;border:1px solid #e1d0c8;border-radius:8px;background:#fff;padding:0 10px;color:#342824;font:inherit}.sp-default-separator{align-self:center;margin-top:20px;color:#9b857c;text-align:center}.sp-weekdays{grid-column:1/-1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:5px}.sp-weekday{display:flex;min-height:36px;align-items:center;justify-content:center;border:1px solid #e1d3cc;border-radius:8px;background:#fff;color:#6a5750;font-size:10px;font-weight:850;cursor:pointer}.sp-weekday:has(input:checked){border-color:#be7465;background:#fff1ec;color:#8a4136;box-shadow:inset 0 0 0 1px #be7465}.sp-weekday input{position:absolute;opacity:0;pointer-events:none}.sp-default-actions{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px}.sp-default-status{min-height:18px;color:#427156;font-size:10px;font-weight:800}.sp-default-status.error{color:#a33f3a}.sp-default-save{display:inline-flex;min-height:41px;align-items:center;justify-content:center;gap:7px;border:0;border-radius:999px;background:#9d5144;padding:0 17px;color:#fff;font-size:10px;font-weight:900;box-shadow:0 7px 18px rgba(126,62,50,.2);cursor:pointer}.sp-default-save svg{width:15px;height:15px}.sp-default-save:disabled{cursor:wait;opacity:.58}.sp-day-reset{display:inline-flex;min-height:25px;align-items:center;gap:4px;margin-left:auto;border:0;border-radius:999px;background:#fff;padding:0 7px;color:#915044;font-size:8px;font-weight:900;cursor:pointer}.sp-day-reset svg{width:11px;height:11px}
      .sp-lottery-original{display:none!important}.sp-multi-lottery{width:100%;overflow:hidden;border:1px solid #e5cf93;border-radius:8px;background:#fffaf0;padding:20px;text-align:center;box-shadow:0 20px 50px rgba(91,51,44,.15)}.sp-multi-lottery .symbol{display:grid;width:52px;height:52px;place-items:center;margin:auto;border-radius:50%;background:#fff;color:#8f4f42;box-shadow:0 4px 16px rgba(91,51,44,.1)}.sp-multi-lottery .symbol svg{width:24px;height:24px}.sp-multi-lottery h2{margin:12px 0 0;color:#4f3b22;font-size:20px}.sp-multi-lottery p{margin:6px 0 0;color:#7c7168;font-size:11px;line-height:1.7}.sp-lottery-progress{margin-top:12px;color:#7b5d1d;font-size:11px;font-weight:900}.sp-chests{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:18px}.sp-chest{display:grid;min-height:128px;place-items:center;border:1px solid #eadfcb;border-radius:8px;background:#fff;padding:10px;cursor:pointer}.sp-chest:disabled{cursor:default}.sp-chest.selected{border-color:#d8b56d;background:#fff4d6}.sp-chest img{width:86px;height:86px;object-fit:contain;filter:drop-shadow(0 9px 10px rgba(91,51,44,.2))}.sp-lottery-result{min-height:48px;margin-top:14px}.sp-lottery-result strong{display:block;color:#8f4f42;font-size:24px}.sp-lottery-result span{color:#6c574f;font-size:11px;font-weight:850}.sp-lottery-next{display:inline-flex;min-height:42px;align-items:center;justify-content:center;margin-top:10px;border:0;border-radius:999px;background:#8f4f42;padding:0 22px;color:#fff;font-size:11px;font-weight:900;cursor:pointer}.sp-lottery-summary{margin-top:14px;border-radius:8px;background:#fff;padding:13px;color:#4f3b22;font-size:12px;font-weight:900}
      @media(max-width:900px){.sp-product-grid{grid-template-columns:1fr}.sp-default-hours{grid-template-columns:1fr}}
      @media(max-width:620px){.sp-demographics{padding:16px}.sp-demographics-head{display:grid}.sp-product-segment{padding:14px}.sp-default-hours{padding:16px}.sp-default-hours-form{grid-template-columns:1fr}.sp-default-separator{display:none}.sp-weekdays{grid-template-columns:repeat(4,minmax(0,1fr))}.sp-default-actions{align-items:stretch;flex-direction:column}.sp-default-save{width:100%}.sp-chest{min-height:105px}.sp-chest img{width:68px;height:68px}}
    `
    document.head.appendChild(style)
  }

  function schedule() {
    window.clearTimeout(routeTimer)
    routeTimer = window.setTimeout(enhance, 180)
  }

  function ageBarLabel(value) {
    return value === '未登録' ? value : value
  }

  function barsMarkup(groups, tone) {
    const populated = (groups || []).filter(group => Number(group.quantity) > 0)
    if (!populated.length) return ''
    const max = Math.max(...populated.map(group => Number(group.quantity)))
    return `<div class="sp-bars ${tone || ''}"><span class="sp-bars-title">${tone === 'gender' ? '性別' : '年代'}</span>${populated.map(group => {
      const value = Number(group.quantity)
      const width = Math.max(6, Math.round(value / max * 100))
      return `<div class="sp-bar"><span>${esc(ageBarLabel(group.label))}</span><span class="sp-bar-track"><span class="sp-bar-fill" style="width:${width}%"></span></span><span class="sp-bar-value">${value.toLocaleString('ja-JP')}点</span></div>`
    }).join('')}</div>`
  }

  function productMarkup(product) {
    if (!product.totalQuantity) {
      return `<article class="sp-product-segment"><div class="sp-product-segment-head"><div><h3>${esc(product.name)}</h3><span class="sp-product-maker">${esc(product.manufacturerName)}</span></div><div class="sp-product-total"><strong>0</strong><span>販売数</span></div></div><div class="sp-product-empty">会計済みの購入データはまだありません。</div></article>`
    }
    return `<article class="sp-product-segment"><div class="sp-product-segment-head"><div><h3>${esc(product.name)}</h3><span class="sp-product-maker">${esc(product.manufacturerName)}</span></div><div class="sp-product-total"><strong>${Number(product.totalQuantity).toLocaleString('ja-JP')}</strong><span>販売数 / ${Number(product.customerCount).toLocaleString('ja-JP')}名</span></div></div><div class="sp-product-highlights"><span class="sp-product-highlight">${icon('users')}最多年代 ${esc(product.dominantAge || '未登録')}</span><span class="sp-product-highlight">${icon('chart')}最多性別 ${esc(product.dominantGender || '未登録')}</span></div>${barsMarkup(product.ageGroups)}${barsMarkup(product.genders, 'gender')}</article>`
  }

  function placeDemographics(section, pageRoot) {
    const detailSection = [...pageRoot.children].find(child => child !== section && child.matches?.('section') && child.querySelector('article'))
    if (detailSection && section.nextElementSibling !== detailSection) pageRoot.insertBefore(section, detailSection)
    else if (!section.isConnected) pageRoot.appendChild(section)
  }

  async function enhanceProductDemographics() {
    const active = location.pathname === '/admin/products' && new URLSearchParams(location.search).get('section') === 'feedback'
    if (!active) {
      document.querySelector('[data-sp-demographics]')?.remove()
      analyticsRequest = ''
      return
    }
    const main = document.querySelector('main')
    const pageRoot = main?.querySelector(':scope > div') || main
    if (!pageRoot) return
    const existing = document.querySelector('[data-sp-demographics]')
    if (existing) {
      placeDemographics(existing, pageRoot)
      return
    }
    if (analyticsRequest === location.href) return
    analyticsRequest = location.href
    const section = document.createElement('section')
    section.className = 'sp-demographics'
    section.dataset.spDemographics = '1'
    section.innerHTML = '<div class="sp-demographics-loading">商品別の購入層を読み込んでいます…</div>'
    placeDemographics(section, pageRoot)
    try {
      const response = await fetch('/api/lien-product-demographics', { credentials: 'same-origin', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '購入層を読み込めませんでした。')
      section.innerHTML = `<header class="sp-demographics-head"><div class="sp-demographics-title"><span class="sp-demographics-symbol">${icon('chart')}</span><div><h2>商品別 購入層</h2><p>会計済みの商品から、年代・性別ごとの販売数と購入者傾向を確認できます。</p></div></div><span class="sp-demographics-period">全期間</span></header><div class="sp-product-grid">${payload.products?.length ? payload.products.map(productMarkup).join('') : '<div class="sp-product-empty">集計対象の商品がありません。</div>'}</div>`
    } catch (error) {
      section.innerHTML = `<div class="sp-product-empty" role="alert">${esc(error.message)}</div>`
      analyticsRequest = ''
    }
  }

  function hideSettingsHours() {
    if (location.pathname !== '/admin/settings') return
    const section = document.querySelector('[data-ca-store-settings] .ca-hours-card')
    if (!section || section.dataset.spHoursMoved === '1') return
    section.dataset.spHoursMoved = '1'
    section.hidden = true
    section.setAttribute('aria-hidden', 'true')
    const card = section.closest('form')
    const description = card?.querySelector(':scope > p')
    if (description) description.textContent = '予約案内や店舗画面で利用する正式情報です。営業時間と休業日は、予約カレンダーの日別設定から管理します。'
    if (!card?.querySelector('[data-sp-settings-hours-link]')) {
      const link = document.createElement('a')
      link.href = '/admin/appointments?businessDays=1'
      link.className = 'sp-settings-hours-link'
      link.dataset.spSettingsHoursLink = '1'
      link.innerHTML = `${icon('calendar')}営業時間・休業日を設定`
      description?.insertAdjacentElement('afterend', link)
    }
  }

  function timeOptions(selected) {
    const values = []
    for (let minutes = 0; minutes <= 1440; minutes += 30) {
      const label = minutes === 1440 ? '24:00' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      values.push(`<option value="${label}" ${label === selected ? 'selected' : ''}>${label}</option>`)
    }
    return values.join('')
  }

  async function saveDefaultHours(form, profile) {
    const button = form.querySelector('[data-sp-default-save]')
    const status = form.querySelector('[data-sp-default-status]')
    const openTime = form.elements.businessOpen.value
    const closeTime = form.elements.businessClose.value
    const toMinutes = value => {
      const [hour, minute] = value.split(':').map(Number)
      return hour * 60 + minute
    }
    status.className = 'sp-default-status'
    if (toMinutes(closeTime) - toMinutes(openTime) < 60) {
      status.classList.add('error')
      status.textContent = '営業時間は1時間以上で設定してください。'
      return
    }
    button.disabled = true
    status.textContent = '通常設定を保存しています…'
    try {
      const closedWeekdays = [...form.querySelectorAll('[name="closedWeekdays"]:checked')].map(input => input.value)
      const response = await fetch('/api/admin/store-profile', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'update-store',
          storeName: profile.storeName,
          ownerName: profile.ownerName,
          phone: profile.phone,
          postalCode: profile.postalCode,
          prefecture: profile.prefecture,
          city: profile.city,
          addressLine1: profile.addressLine1,
          addressLine2: profile.addressLine2,
          websiteUrl: profile.websiteUrl,
          businessOpen: openTime,
          businessClose: closeTime,
          closedWeekdays,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '通常設定を保存できませんでした。')
      status.textContent = '通常の営業時間と定休日を保存しました。個別設定した日はそのまま保持されます。'
      window.setTimeout(() => location.reload(), 650)
    } catch (error) {
      status.classList.add('error')
      status.textContent = error.message
      button.disabled = false
    }
  }

  async function ensureDefaultHours() {
    const query = new URLSearchParams(location.search)
    if (location.pathname !== '/admin/appointments' || !query.has('businessDays')) return
    const root = document.getElementById('ts-business-days-root')
    if (!root || !root.dataset.ready || root.querySelector('[data-sp-default-hours]') || root.dataset.spDefaultLoading === '1') return
    root.dataset.spDefaultLoading = '1'
    try {
      const response = await fetch('/api/admin/store-profile', { credentials: 'same-origin', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.profile) throw new Error(payload.error || '通常設定を読み込めませんでした。')
      const profile = payload.profile
      const schedule = profile.businessSchedule || { openTime: '10:00', closeTime: '19:00', closedWeekdays: [] }
      const panel = document.createElement('section')
      panel.className = 'sp-default-hours'
      panel.dataset.spDefaultHours = '1'
      const weekdays = ['日','月','火','水','木','金','土'].map((label, index) => `<label class="sp-weekday"><input type="checkbox" name="closedWeekdays" value="${index}" ${schedule.closedWeekdays.includes(index) ? 'checked' : ''}><span>${label}</span></label>`).join('')
      panel.innerHTML = `<div class="sp-default-hours-copy"><span class="symbol">${icon('clock')}</span><div><h2>通常の営業時間・定休日</h2><p>個別設定のない日に共通で使われます。日ごとの変更は下のカレンダーから行えます。</p></div></div><form class="sp-default-hours-form"><label class="sp-default-field">営業開始<select name="businessOpen">${timeOptions(schedule.openTime)}</select></label><span class="sp-default-separator">〜</span><label class="sp-default-field">営業終了<select name="businessClose">${timeOptions(schedule.closeTime)}</select></label><div class="sp-weekdays" aria-label="定休日">${weekdays}</div><div class="sp-default-actions"><p class="sp-default-status" data-sp-default-status role="status"></p><button class="sp-default-save" data-sp-default-save type="submit">${icon('check')}通常設定を保存</button></div></form>`
      root.querySelector('.ts-days-hero')?.insertAdjacentElement('afterend', panel)
      panel.querySelector('form').addEventListener('submit', event => {
        event.preventDefault()
        saveDefaultHours(event.currentTarget, profile)
      })
    } catch (error) {
      console.warn('[store-platform-v503] default hours could not be loaded', error)
    } finally {
      root.dataset.spDefaultLoading = '0'
    }
  }

  function ensureDayResetButtons() {
    const query = new URLSearchParams(location.search)
    if (location.pathname !== '/admin/appointments' || !query.has('businessDays')) return
    document.querySelectorAll('.ts-day-card:not(.empty)').forEach(card => {
      if (!card.querySelector('.ts-day-badge.custom') || card.querySelector('[data-sp-day-reset]')) return
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'sp-day-reset'
      button.dataset.spDayReset = '1'
      button.innerHTML = `${icon('reset')}通常設定に戻す`
      card.querySelector('.ts-day-head')?.appendChild(button)
      button.addEventListener('click', async () => {
        button.disabled = true
        const response = await fetch('/api/lien-business-days', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ days: [{ date: card.dataset.date, reset: true }] }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          button.disabled = false
          window.alert(payload.error || '通常設定に戻せませんでした。')
          return
        }
        location.reload()
      })
    })
  }

  function rewardTier(points, prizes) {
    return (prizes || []).find(prize => Number(prize.points) === Number(points))?.tier || 3
  }

  function renderLottery() {
    if (!lotteryPayload || Number(lotteryPayload.drawCount || 0) < 2) return
    const existing = document.querySelector('[data-sp-multi-lottery]')
    if (existing) return
    const original = [...document.querySelectorAll('section')].find(section => {
      const text = section.textContent || ''
      return text.includes('アンケート回答プレゼント') && text.includes('宝箱')
    })
    if (!original) return
    original.classList.add('sp-lottery-original')
    const results = lotteryPayload.drawResults.map(Number).filter(Number.isFinite)
    if (!results.length) return
    const total = results.reduce((sum, value) => sum + value, 0)
    const panel = document.createElement('section')
    panel.className = 'sp-multi-lottery'
    panel.dataset.spMultiLottery = '1'
    original.insertAdjacentElement('afterend', panel)
    let drawIndex = 0
    let selected = -1

    const paint = () => {
      const opened = selected >= 0
      const result = results[drawIndex]
      const final = opened && drawIndex === results.length - 1
      panel.innerHTML = `<span class="symbol">${icon('gift')}</span><div class="sp-lottery-progress">抽選 ${drawIndex + 1} / ${results.length}</div><h2>${final ? '抽選結果' : '好きな宝箱を1つ選んでください'}</h2><p>購入数${results.length}点分、${results.length}回抽選できます。同じ商品のアンケートは1回で完了です。</p><div class="sp-chests">${[0,1,2].map(index => `<button type="button" class="sp-chest ${selected === index ? 'selected' : ''}" data-sp-chest="${index}" ${opened ? 'disabled' : ''} aria-label="宝箱${index + 1}を選ぶ"><img src="${selected === index ? '/rewards/treasure-open-v2.png' : '/rewards/treasure-closed-v2.png'}" alt=""></button>`).join('')}</div><div class="sp-lottery-result">${opened ? `<strong>${Number(result).toLocaleString('ja-JP')}pt</strong><span>${rewardTier(result, lotteryPayload.rewardPrizes)}等が当たりました</span>` : '<span>宝箱を選ぶと結果が表示されます</span>'}</div>${opened && !final ? `<button type="button" class="sp-lottery-next" data-sp-lottery-next>次の抽選へ（${drawIndex + 2}/${results.length}）</button>` : ''}${final ? `<div class="sp-lottery-summary">合計 ${total.toLocaleString('ja-JP')}pt を獲得しました</div>` : ''}`
      panel.querySelectorAll('[data-sp-chest]').forEach(button => button.addEventListener('click', () => {
        if (selected >= 0) return
        selected = Number(button.dataset.spChest)
        paint()
      }))
      panel.querySelector('[data-sp-lottery-next]')?.addEventListener('click', () => {
        drawIndex += 1
        selected = -1
        paint()
      })
    }
    paint()
  }

  function enhance() {
    addStyles()
    hideSettingsHours()
    ensureDefaultHours()
    ensureDayResetButtons()
    enhanceProductDemographics()
    renderLottery()
  }

  const originalFetch = window.fetch.bind(window)
  window.fetch = async function storePlatformFetch(input, init) {
    const response = await originalFetch(input, init)
    try {
      const requestUrl = typeof input === 'string' ? input : input?.url || ''
      const method = String(init?.method || input?.method || 'GET').toUpperCase()
      if (method === 'POST' && /\/api\/(?:customer\/reviews|review\/product|public\/review\/product)\//.test(requestUrl) && response.ok) {
        const payload = await response.clone().json()
        if (Number(payload.drawCount) > 1 && Array.isArray(payload.drawResults)) {
          lotteryPayload = payload
          document.querySelector('[data-sp-multi-lottery]')?.remove()
          schedule()
        }
      }
    } catch {}
    return response
  }

  const start = () => {
    addStyles()
    schedule()
    new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true })
    window.addEventListener('pageshow', schedule)
    window.addEventListener('popstate', schedule)
    document.addEventListener('click', event => {
      if (event.target.closest('a[href]')) window.setTimeout(schedule, 220)
    }, true)
    window.setInterval(enhance, 1400)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(start, 950), { once: true })
  else window.setTimeout(start, 950)
})()
