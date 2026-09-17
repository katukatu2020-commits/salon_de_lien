;(() => {
  'use strict'
  if (window.__lienCustomerBookingPointsUiV652) return
  window.__lienCustomerBookingPointsUiV652 = true

  const state = {
    loaded: false,
    error: '',
    availablePoints: 0,
    minimumRedeem: 1,
    maxRedemptionPercent: 50,
    pointsToUse: 0,
  }
  let queued = false

  const style = document.createElement('style')
  style.id = 'lien-customer-booking-points-v652-style'
  style.textContent = `
    .lien-booking-v616__amounts{grid-column:1/-1}
    .lien-booking-v652__points{display:grid;align-content:start;gap:7px;min-width:0}
    .lien-booking-v652__label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#4f463f}
    .lien-booking-v652__coin{display:grid;width:20px;height:20px;place-items:center;border:1px solid #b28b38;border-radius:50%;color:#936f23;font-size:11px;line-height:1}
    .lien-booking-v652__controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    .lien-booking-v652__input{box-sizing:border-box;width:100%;min-width:0;height:48px;border:1px solid #d9cec5;border-radius:6px;background:#fff;padding:0 12px;color:#382f2a;font:inherit;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;outline:none}
    .lien-booking-v652__input:focus-visible{border-color:#c54d6c;box-shadow:0 0 0 3px rgba(197,77,108,.16)}
    .lien-booking-v652__input:disabled{background:#f3efeb;color:#8d827a}
    .lien-booking-v652__max{min-height:48px;border:1px solid #c9b9ad;border-radius:6px;background:#fff;padding:0 13px;color:#675950;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
    .lien-booking-v652__max:disabled{cursor:not-allowed;opacity:.45}
    .lien-booking-v652__hint{margin:0;color:#81756d;font-size:11px;line-height:1.6}
    .lien-booking-v652__hint[data-error="true"]{color:#a9443c;font-weight:700}
    .lien-booking-v652__discount{color:#936f23}
    @media(max-width:639px){.lien-booking-v652__controls{grid-template-columns:minmax(0,1fr) auto}.lien-booking-v652__max{padding-inline:11px}}
  `
  document.head.appendChild(style)

  function integer(value, fallback = 0) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : fallback
  }

  function yen(value) {
    return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('ja-JP')}円`
  }

  function bookingMenuSelect() {
    return document.querySelector('select.cx-menu-native-select-v508')
      || [...document.querySelectorAll('select')].find(element => [...element.options].some(option => /[\d,]+\s*円/.test(String(option.textContent || ''))))
      || null
  }

  function menuDetails() {
    const select = bookingMenuSelect()
    const option = select?.options?.[select.selectedIndex]
    const text = String(option?.textContent || '').trim()
    const priceMatch = text.match(/([\d,]+)\s*円/)
    const price = Number(String(priceMatch?.[1] || '0').replace(/,/g, ''))
    return {
      select,
      name: text.replace(/[\s/・]*(?:\(?\d+分\)?[\s/]*)?[\d,]+\s*円.*$/, '').trim(),
      price: Number.isFinite(price) ? price : 0,
    }
  }

  function selectedCoupon() {
    const coupon = window.__lienSelectedCouponV366
    return coupon && typeof coupon === 'object' ? coupon : null
  }

  function pricing() {
    const details = menuDetails()
    const coupon = selectedCoupon()
    const rate = Math.max(0, Math.min(100, Number(coupon?.discountRate || 0)))
    const couponDiscount = coupon ? Math.min(details.price, Math.floor(details.price * rate / 100)) : 0
    const afterCoupon = Math.max(0, details.price - couponDiscount)
    const maxByPolicy = Math.floor(afterCoupon * state.maxRedemptionPercent / 100)
    const maximum = state.loaded && state.availablePoints >= state.minimumRedeem
      ? Math.min(state.availablePoints, maxByPolicy)
      : 0
    if (state.pointsToUse > maximum) state.pointsToUse = maximum
    if (state.pointsToUse > 0 && state.pointsToUse < state.minimumRedeem) state.pointsToUse = 0
    window.__lienBookingPointsV652 = state.pointsToUse
    return {
      details,
      coupon,
      couponDiscount,
      maximum,
      finalPrice: Math.max(0, afterCoupon - state.pointsToUse),
    }
  }

  function createPointsBlock() {
    const block = document.createElement('div')
    block.className = 'lien-booking-v652__points'
    block.dataset.lienBookingPointsV652 = '1'
    block.innerHTML = `
      <label class="lien-booking-v652__label" for="lien-booking-points-v652"><span class="lien-booking-v652__coin" aria-hidden="true">P</span><span>利用ポイント</span></label>
      <div class="lien-booking-v652__controls">
        <input id="lien-booking-points-v652" class="lien-booking-v652__input" type="number" min="0" step="1" inputmode="numeric" autocomplete="off" aria-describedby="lien-booking-points-hint-v652">
        <button type="button" class="lien-booking-v652__max">上限まで使う</button>
      </div>
      <p id="lien-booking-points-hint-v652" class="lien-booking-v652__hint"></p>`
    const input = block.querySelector('input')
    const maxButton = block.querySelector('button')
    input.addEventListener('input', () => {
      const maximum = pricing().maximum
      const next = Math.max(0, Math.min(maximum, integer(input.value)))
      state.pointsToUse = next > 0 && next < state.minimumRedeem ? 0 : next
      window.__lienBookingPointsV652 = state.pointsToUse
      queue(true)
    })
    input.addEventListener('blur', () => queue(true))
    maxButton.addEventListener('click', () => {
      state.pointsToUse = pricing().maximum
      window.__lienBookingPointsV652 = state.pointsToUse
      queue(true)
    })
    return block
  }

  function render(force = false) {
    if (location.pathname !== '/u/appointments') return
    const root = document.querySelector('[data-lien-booking-confirmation-v616]')
    if (!root) return
    let block = root.querySelector('[data-lien-booking-points-v652]')
    if (!block) {
      block = createPointsBlock()
      const amounts = root.querySelector('.lien-booking-v616__amounts')
      root.insertBefore(block, amounts || null)
      force = true
    }

    const quote = pricing()
    const signature = JSON.stringify({
      loaded: state.loaded,
      error: state.error,
      available: state.availablePoints,
      minimum: state.minimumRedeem,
      percent: state.maxRedemptionPercent,
      points: state.pointsToUse,
      menu: quote.details.name,
      price: quote.details.price,
      coupon: quote.coupon?.id || '',
      couponRate: quote.coupon?.discountRate || 0,
      couponKind: quote.coupon?.benefitKind || '',
    })
    if (!force && block.dataset.signature === signature) return
    block.dataset.signature = signature

    const input = block.querySelector('input')
    input.max = String(quote.maximum)
    input.value = String(state.pointsToUse)
    input.disabled = !state.loaded || quote.maximum < state.minimumRedeem
    const maxButton = block.querySelector('button')
    maxButton.disabled = input.disabled
    const hint = block.querySelector('.lien-booking-v652__hint')
    hint.dataset.error = String(Boolean(state.error))
    hint.textContent = state.error || (state.loaded
      ? `保有 ${state.availablePoints.toLocaleString('ja-JP')}pt / 今回の利用上限 ${quote.maximum.toLocaleString('ja-JP')}pt（1pt=1円）`
      : 'ポイント残高を確認しています…')

    const amounts = root.querySelector('.lien-booking-v616__amounts')
    if (!amounts) return
    const couponLabel = quote.coupon?.benefitKind === 'STAMP_MENU_FREE'
      ? 'スタンプカード特典（メニュー無料）'
      : `クーポン ${Number(quote.coupon?.discountRate || 0)}%OFF`
    const html = `<div><dt>メニュー料金</dt><dd>${yen(quote.details.price)}</dd></div>`
      + (quote.coupon ? `<div class="lien-booking-v616__discount"><dt>${couponLabel}</dt><dd>-${yen(quote.couponDiscount)}</dd></div>` : '')
      + (state.pointsToUse > 0 ? `<div class="lien-booking-v652__discount"><dt>利用ポイント</dt><dd>-${state.pointsToUse.toLocaleString('ja-JP')}pt</dd></div>` : '')
      + `<div class="lien-booking-v616__total"><dt>お支払い目安</dt><dd>${yen(quote.finalPrice)}</dd></div>`
    if (amounts.innerHTML !== html) amounts.innerHTML = html
  }

  function queue(force = false) {
    if (force) document.documentElement.dataset.lienPointsForceV652 = '1'
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      const shouldForce = document.documentElement.dataset.lienPointsForceV652 === '1'
      delete document.documentElement.dataset.lienPointsForceV652
      render(shouldForce)
    })
  }

  async function loadPoints() {
    try {
      const response = await fetch('/api/lien-customer-booking-context', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'ポイント残高を取得できませんでした。')
      state.availablePoints = Math.max(0, integer(payload.points?.availablePoints))
      state.minimumRedeem = Math.max(1, integer(payload.points?.minimumRedeem, 1))
      state.maxRedemptionPercent = Math.max(0, Math.min(100, integer(payload.points?.maxRedemptionPercent, 50)))
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'ポイント残高を取得できませんでした。'
    } finally {
      state.loaded = true
      queue(true)
    }
  }

  const start = () => {
    window.__lienBookingPointsV652 = 0
    loadPoints()
    render()
    new MutationObserver(() => queue()).observe(document.body, { childList: true, subtree: true })
    document.addEventListener('change', event => {
      if (event.target === bookingMenuSelect() || event.target?.id === 'lien-booking-coupon-v616') render(true)
    }, true)
    window.addEventListener('popstate', () => queue(true))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
