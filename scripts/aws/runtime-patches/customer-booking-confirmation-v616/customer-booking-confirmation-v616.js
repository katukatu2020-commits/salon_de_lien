;(() => {
  'use strict'
  if (window.__lienCustomerBookingConfirmationV616) return
  window.__lienCustomerBookingConfirmationV616 = true

  const state = {
    coupons: [],
    loaded: false,
    loadError: '',
    selectedCouponId: '',
    requestedCouponId: new URLSearchParams(location.search).get('coupon') || '',
  }
  let queued = false

  const style = document.createElement('style')
  style.id = 'lien-customer-booking-confirmation-v616-style'
  style.textContent = `
    .lien-booking-v616{display:grid;grid-column:1/-1;gap:14px;min-width:0;border-top:1px solid #e5d8ce;padding-top:16px;color:#382f2a}
    .lien-booking-v616__coupon{display:grid;gap:7px;min-width:0}
    .lien-booking-v616__label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#4f463f}
    .lien-booking-v616__ticket{display:grid;width:20px;height:20px;place-items:center;border:1px solid #d65b79;border-radius:50%;color:#bf4966;font-size:12px;line-height:1}
    .lien-booking-v616 select{box-sizing:border-box;width:100%;min-width:0;height:48px;border:1px solid #d9cec5;border-radius:6px;background:#fff;padding:0 36px 0 12px;color:#382f2a;font:inherit;font-size:14px;font-weight:600;outline:none}
    .lien-booking-v616 select:focus-visible{border-color:#c54d6c;box-shadow:0 0 0 3px rgba(197,77,108,.16)}
    .lien-booking-v616 select:disabled{background:#f3efeb;color:#8d827a}
    .lien-booking-v616__hint{margin:0;color:#81756d;font-size:11px;line-height:1.6}
    .lien-booking-v616__error{margin:0;color:#a9443c;font-size:11px;font-weight:700;line-height:1.6}
    .lien-booking-v616__amounts{display:grid;gap:8px;margin:0;padding:0}
    .lien-booking-v616__amounts>div{display:flex;align-items:center;justify-content:space-between;gap:16px}
    .lien-booking-v616__amounts dt,.lien-booking-v616__amounts dd{margin:0;font-size:13px}
    .lien-booking-v616__amounts dd{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
    .lien-booking-v616__discount{color:#bf4966}
    .lien-booking-v616__total{border-top:1px solid #e5d8ce;padding-top:9px}
    .lien-booking-v616__total dt,.lien-booking-v616__total dd{font-size:16px;font-weight:700}
    .lien-booking-v616__policy{margin:0;color:#786d66;font-size:11px;line-height:1.7}
    .lien-booking-v616__policy a,.lien-cancel-v616__closed a{color:#8f4f42;font-weight:700;text-underline-offset:2px}
    .lien-current-cancel-v373__button,.lien-current-cancel-v373__backdrop,.lien-cancel-v362__detail-button,.lien-cancel-v362__detail{display:none!important}
    [data-customer-appointment-id].lien-cancel-v616__card{display:grid;gap:11px}
    .lien-cancel-v616__button{display:inline-flex;min-height:44px;width:100%;align-items:center;justify-content:center;border:1px solid #d87a72;border-radius:999px;background:#fff;padding:9px 16px;color:#a9443c;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
    .lien-cancel-v616__button:focus-visible,.lien-cancel-v616__dialog button:focus-visible{outline:3px solid rgba(207,102,126,.25);outline-offset:2px}
    .lien-cancel-v616__closed{margin:0;border-top:1px solid #e3d8cf;padding-top:10px;color:#74675f;font-size:11px;line-height:1.65}
    .lien-cancel-v616__backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(48,39,35,.4);padding:20px;backdrop-filter:blur(3px)}
    .lien-cancel-v616__dialog{box-sizing:border-box;width:min(100%,440px);border:1px solid #ead8d1;border-radius:8px;background:#fffdfa;padding:22px;color:#302824;box-shadow:0 24px 70px rgba(60,43,36,.22)}
    .lien-cancel-v616__eyebrow{margin:0 0 6px;color:#bd5369;font-size:11px;font-weight:700}
    .lien-cancel-v616__title{margin:0;font-size:20px;font-weight:700;line-height:1.45}
    .lien-cancel-v616__description{margin:9px 0 0;color:#74675f;font-size:12px;line-height:1.75}
    .lien-cancel-v616__summary{margin-top:16px;border-block:1px solid #eadfd6;padding:12px 0}
    .lien-cancel-v616__summary p{margin:0;color:#4d413b;font-size:13px;line-height:1.7}
    .lien-cancel-v616__summary p+p{color:#7b6f67;font-size:12px}
    .lien-cancel-v616__actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
    .lien-cancel-v616__actions button{min-height:44px;border-radius:999px;padding:0 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .lien-cancel-v616__close{border:1px solid #d9cbc1;background:#fff;color:#5f514a}
    .lien-cancel-v616__confirm{border:1px solid #b94d45;background:#b94d45;color:#fff}
    .lien-cancel-v616__confirm:disabled{cursor:wait;opacity:.55}
    .lien-cancel-v616__error{margin:12px 0 0;border:1px solid #efcbc6;border-radius:6px;background:#fff0ef;padding:10px 12px;color:#973b34;font-size:12px;font-weight:700;line-height:1.6}
    .lien-cancel-v616__feedback{margin:10px 0 0;border:1px solid #b9d9c0;border-radius:6px;background:#edf7ef;padding:10px 12px;color:#315c3c;font-size:12px;font-weight:700;line-height:1.6}
    @media(min-width:768px){.lien-booking-v616{grid-template-columns:minmax(260px,.9fr) minmax(260px,1fr)}.lien-booking-v616__policy{grid-column:1/-1}}
    @media(max-width:639px){.lien-cancel-v616__actions{grid-template-columns:1fr}.lien-booking-v616 select{font-size:16px}}
  `
  document.head.appendChild(style)

  function normalize(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s　・･＋+／/（）()［］\[\]【】]/g, '')
  }

  function couponMatchesMenu(coupon, menuName) {
    const targets = Array.isArray(coupon?.targetMenus) ? coupon.targetMenus : []
    if (!targets.length) return true
    const menu = normalize(menuName)
    return targets.some(target => {
      const value = normalize(target)
      if (['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'].includes(value)) return true
      return value && (menu.includes(value) || value.includes(menu))
    })
  }

  function menuDetails() {
    const select = document.querySelector('select.cx-menu-native-select-v508')
    const option = select?.options?.[select.selectedIndex]
    const text = String(option?.textContent || '').trim()
    const structured = text.match(/^(.*)（(\d+)分・目安\s*([\d,]+)円）$/)
    const price = Number((structured?.[3] || text.match(/([\d,]+)円/)?.[1] || '0').replace(/,/g, ''))
    return {
      select,
      name: String(structured?.[1] || text.replace(/（.*$/, '') || '').trim(),
      price: Number.isFinite(price) ? price : 0,
    }
  }

  function yen(value) {
    return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('ja-JP')}円`
  }

  function dateLabel(value) {
    try { return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(value)) }
    catch { return '' }
  }

  async function loadCoupons() {
    try {
      const query = new URLSearchParams()
      if (state.requestedCouponId) query.set('coupon', state.requestedCouponId)
      const response = await fetch(`/api/lien-customer-booking-context${query.size ? `?${query}` : ''}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'クーポンを取得できませんでした。')
      state.coupons = Array.isArray(data.coupons) ? data.coupons : data.coupon ? [data.coupon] : []
      if (state.requestedCouponId && state.coupons.some(coupon => coupon.id === state.requestedCouponId && !coupon.appointmentId)) {
        state.selectedCouponId = state.requestedCouponId
      }
    } catch (error) {
      state.loadError = error instanceof Error ? error.message : 'クーポンを取得できませんでした。'
    } finally {
      state.loaded = true
      queue()
    }
  }

  function createBookingSummary() {
    const root = document.createElement('section')
    root.className = 'lien-booking-v616'
    root.dataset.lienBookingConfirmationV616 = '1'

    const couponBlock = document.createElement('div')
    couponBlock.className = 'lien-booking-v616__coupon'
    const label = document.createElement('label')
    label.className = 'lien-booking-v616__label'
    label.htmlFor = 'lien-booking-coupon-v616'
    label.innerHTML = '<span class="lien-booking-v616__ticket" aria-hidden="true">%</span><span>利用するクーポン</span>'
    const select = document.createElement('select')
    select.id = 'lien-booking-coupon-v616'
    select.setAttribute('aria-label', '利用するクーポン')
    select.addEventListener('change', () => {
      state.selectedCouponId = select.value
      syncBookingSummary(true)
    })
    const hint = document.createElement('p')
    hint.className = 'lien-booking-v616__hint'
    couponBlock.append(label, select, hint)

    const amounts = document.createElement('dl')
    amounts.className = 'lien-booking-v616__amounts'
    const policy = document.createElement('p')
    policy.className = 'lien-booking-v616__policy'
    policy.innerHTML = 'アプリからのキャンセルは予約日の前日までです。当日の変更・キャンセルは店舗へ電話または<a href="/u/chat">チャット</a>でお問い合わせください。'
    root.append(couponBlock, amounts, policy)
    return root
  }

  function syncBookingSummary(force = false) {
    if (location.pathname !== '/u/appointments') return
    const confirmation = document.querySelector('.cj-confirmation')
    if (!confirmation) return
    const details = menuDetails()
    if (!details.select) return
    let root = confirmation.querySelector(':scope > [data-lien-booking-confirmation-v616]')
    if (!root) {
      root = createBookingSummary()
      const submit = [...confirmation.children].find(node => node.tagName === 'BUTTON')
      confirmation.insertBefore(root, submit || null)
      force = true
    }

    const eligible = state.coupons.filter(coupon => !coupon.appointmentId && couponMatchesMenu(coupon, details.name))
    if (state.selectedCouponId && !eligible.some(coupon => coupon.id === state.selectedCouponId)) state.selectedCouponId = ''
    const selected = eligible.find(coupon => coupon.id === state.selectedCouponId) || null
    window.__lienSelectedCouponV366 = selected
    const signature = JSON.stringify({
      menu: details.name,
      price: details.price,
      loaded: state.loaded,
      error: state.loadError,
      selected: state.selectedCouponId,
      eligible: eligible.map(coupon => [coupon.id, coupon.couponCode, coupon.discountRate, coupon.expiresAt]),
    })
    if (!force && root.dataset.signature === signature) return
    root.dataset.signature = signature

    const select = root.querySelector('select')
    const none = document.createElement('option')
    none.value = ''
    none.textContent = !state.loaded ? 'クーポンを確認しています' : eligible.length ? '利用しない' : '利用できるクーポンはありません'
    const options = eligible.map(coupon => {
      const option = document.createElement('option')
      option.value = coupon.id
      const expiry = dateLabel(coupon.expiresAt)
      option.textContent = `${coupon.couponCode}（${Number(coupon.discountRate)}%OFF${expiry ? `・${expiry}まで` : ''}）`
      return option
    })
    select.replaceChildren(none, ...options)
    select.value = state.selectedCouponId
    select.disabled = !state.loaded || eligible.length === 0
    const hint = root.querySelector('.lien-booking-v616__hint')
    hint.className = state.loadError ? 'lien-booking-v616__error' : 'lien-booking-v616__hint'
    hint.textContent = state.loadError || (selected ? 'クーポンは会計時に適用されます。' : eligible.length ? `${eligible.length}件のクーポンを利用できます。` : 'このメニューに利用できるクーポンはありません。')

    const discount = selected ? Math.floor(details.price * Number(selected.discountRate || 0) / 100) : 0
    const amounts = root.querySelector('.lien-booking-v616__amounts')
    amounts.innerHTML = `<div><dt>メニュー料金</dt><dd>${yen(details.price)}</dd></div>${selected ? `<div class="lien-booking-v616__discount"><dt>クーポン ${Number(selected.discountRate)}%OFF</dt><dd>-${yen(discount)}</dd></div>` : ''}<div class="lien-booking-v616__total"><dt>お支払い目安</dt><dd>${yen(details.price - discount)}</dd></div>`
  }

  function tokyoDateKey(value) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(value))
    const part = type => parts.find(item => item.type === type)?.value || ''
    return `${part('year')}-${part('month')}-${part('day')}`
  }

  function cardDetails(card) {
    const paragraphs = card.querySelectorAll(':scope > p, :scope > .lien-current-cancel-v373__content > p')
    return {
      date: paragraphs[0]?.textContent?.trim() || '日時未設定',
      content: paragraphs[1]?.textContent?.trim() || 'メニュー未設定 / フリー',
    }
  }

  function showCancellationFeedback(section, message) {
    let feedback = section?.querySelector('[data-lien-cancel-v616-feedback]')
    if (!feedback && section) {
      feedback = document.createElement('p')
      feedback.dataset.lienCancelV616Feedback = '1'
      feedback.className = 'lien-cancel-v616__feedback'
      section.querySelector('h2')?.insertAdjacentElement('afterend', feedback)
    }
    if (feedback) feedback.textContent = message
  }

  function openCancellationDialog(card, appointmentId) {
    document.querySelector('[data-lien-cancel-v616-dialog]')?.remove()
    const details = cardDetails(card)
    const backdrop = document.createElement('div')
    backdrop.className = 'lien-cancel-v616__backdrop'
    backdrop.dataset.lienCancelV616Dialog = '1'
    backdrop.innerHTML = `<div class="lien-cancel-v616__dialog" role="dialog" aria-modal="true" aria-labelledby="lien-cancel-v616-title"><p class="lien-cancel-v616__eyebrow">予約キャンセル</p><h2 class="lien-cancel-v616__title" id="lien-cancel-v616-title">予約をキャンセルしますか？</h2><p class="lien-cancel-v616__description">キャンセル後は元に戻せません。店舗にも通知が届きます。</p><div class="lien-cancel-v616__summary"><p></p><p></p></div><p class="lien-cancel-v616__error" role="alert" hidden></p><div class="lien-cancel-v616__actions"><button type="button" class="lien-cancel-v616__close">戻る</button><button type="button" class="lien-cancel-v616__confirm">予約をキャンセル</button></div></div>`
    const summary = backdrop.querySelectorAll('.lien-cancel-v616__summary p')
    summary[0].textContent = details.date
    summary[1].textContent = details.content
    const closeButton = backdrop.querySelector('.lien-cancel-v616__close')
    const confirmButton = backdrop.querySelector('.lien-cancel-v616__confirm')
    const errorNode = backdrop.querySelector('.lien-cancel-v616__error')
    const close = () => backdrop.remove()
    closeButton.addEventListener('click', close)
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
    backdrop.addEventListener('keydown', event => { if (event.key === 'Escape') close() })
    confirmButton.addEventListener('click', async () => {
      confirmButton.disabled = true
      confirmButton.textContent = 'キャンセルしています…'
      errorNode.hidden = true
      try {
        const response = await fetch('/api/lien-customer-appointment-cancel', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.success) throw new Error(payload.error || '予約をキャンセルできませんでした。')
        const section = card.closest('section')
        card.remove()
        close()
        showCancellationFeedback(section, '予約をキャンセルしました。店舗にも通知しました。')
      } catch (error) {
        errorNode.textContent = error instanceof Error ? error.message : '予約をキャンセルできませんでした。'
        errorNode.hidden = false
        confirmButton.disabled = false
        confirmButton.textContent = '予約をキャンセル'
      }
    })
    document.body.appendChild(backdrop)
    closeButton.focus()
  }

  function removeLegacyCancellation(card) {
    card.querySelectorAll('.lien-current-cancel-v373__button, .lien-current-cancel-v373__backdrop, .lien-cancel-v362__detail-button, .lien-cancel-v362__detail, [data-lien-cancel-card-error]').forEach(node => node.remove())
    const content = card.querySelector(':scope > .lien-current-cancel-v373__content')
    if (content) {
      const fragment = document.createDocumentFragment()
      while (content.firstChild) fragment.appendChild(content.firstChild)
      content.replaceWith(fragment)
    }
    card.classList.remove('lien-current-cancel-v373__card')
    card.dataset.lienCurrentCancelV373 = '1'
    card.dataset.lienCancelEnhanced = '1'
  }

  function enhanceCancellationCard(card) {
    removeLegacyCancellation(card)
    if (card.dataset.lienCancelV616 === '1') return
    const appointmentId = card.getAttribute('data-customer-appointment-id')
    const scheduledAt = card.getAttribute('data-customer-appointment-at')
    if (!appointmentId || !scheduledAt) return
    card.dataset.lienCancelV616 = '1'
    card.classList.add('lien-cancel-v616__card')
    const canCancel = tokyoDateKey(new Date()) < tokyoDateKey(scheduledAt)
    if (canCancel) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'lien-cancel-v616__button'
      button.textContent = '予約をキャンセル'
      button.addEventListener('click', () => openCancellationDialog(card, appointmentId))
      card.appendChild(button)
    } else {
      const note = document.createElement('p')
      note.className = 'lien-cancel-v616__closed'
      note.innerHTML = '当日の変更・キャンセルは、店舗へ電話または<a href="/u/chat">チャット</a>でお問い合わせください。'
      card.appendChild(note)
    }
  }

  function run() {
    if (location.pathname !== '/u/appointments') return
    syncBookingSummary()
    document.querySelectorAll('[data-customer-appointment-id]').forEach(enhanceCancellationCard)
  }

  function queue() {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; run() })
  }

  const start = () => {
    loadCoupons()
    run()
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true })
    document.addEventListener('change', event => {
      if (event.target?.matches?.('select.cx-menu-native-select-v508')) queue()
    }, true)
    window.addEventListener('popstate', queue)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
