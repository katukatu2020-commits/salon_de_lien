;(() => {
  if (window.__lienCustomerBookingCouponV366) return
  window.__lienCustomerBookingCouponV366 = true

  const style = document.createElement('style')
  style.textContent = `.lien-booking-v366__status{margin:0 0 16px;border:1px solid #e4d7ce;border-radius:8px;padding:13px 16px;background:#fff9f5;color:#6f544b;font-size:13px;font-weight:700;line-height:1.7;white-space:pre-line}.lien-booking-v366__status--success{border-color:#b9d9c0;background:#edf7ef;color:#315c3c}.lien-booking-v366__status--coupon{border-color:#e4c772;background:#fff9e8;color:#6f5215}.lien-booking-v366__status--error{border-color:#efb9b2;background:#fff3f1;color:#9f3d34}.coupon-booked{display:block;margin-top:11px;border-radius:5px;background:#eee7e2;padding:10px;color:#685b54;font-size:11px;font-weight:700}`
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

  function yen(value) {
    return `${Math.max(0, Number(value) || 0).toLocaleString('ja-JP')}円`
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
        insertBookingStatus(statusCard('このクーポンはすでに別の予約に設定されています。', 'notice'))
      } else {
        window.__lienSelectedCouponV366 = data.coupon
        if (data.coupon.benefitKind !== 'STAMP_MENU_FREE') {
          insertBookingStatus(statusCard(`${data.coupon.discountRate}%OFFクーポン（${data.coupon.couponCode}）を予約に設定しました。`, 'coupon'))
        }
      }
    }
  }

  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    const method = String(init.method || 'GET').toUpperCase()
    const isBookingPost = location.pathname === '/u/appointments'
      && url.endsWith('/api/customer/appointments')
      && method === 'POST'
    const selectedCoupon = isBookingPost && window.__lienSelectedCouponV366
      ? window.__lienSelectedCouponV366
      : null
    const selectedPoints = isBookingPost
      ? Math.max(0, Number(window.__lienBookingPointsV652 || 0))
      : 0
    let nextInit = init
    if (isBookingPost && selectedCoupon) {
      try {
        const body = JSON.parse(String(init.body || '{}'))
        body.couponIssueId = selectedCoupon.id
        nextInit = { ...init, body: JSON.stringify(body) }
      } catch {}
    }

    const response = await nativeFetch(input, nextInit)
    if (!isBookingPost || !response.ok || (!selectedCoupon && selectedPoints <= 0)) return response

    try {
      const payload = await response.clone().json()
      const appointmentId = payload?.appointment?.id
      if (!appointmentId) return response
      const linked = await nativeFetch('/api/lien-customer-booking-coupon', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          couponIssueId: selectedCoupon?.id || '',
          pointsToUse: selectedPoints,
        }),
      })
      const linkedBody = await linked.json().catch(() => ({}))
      if (!linked.ok || !linkedBody.success) {
        return new Response(JSON.stringify({
          error: linkedBody.error || '割引を適用できなかったため、予約は確定されていません。',
        }), {
          status: linked.status >= 400 ? linked.status : 409,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      }
      window.__lienBookingPointsV652 = 0
    } catch (error) {
      console.error('[customer-booking-points-v652]', error)
      return new Response(JSON.stringify({
        error: '割引を適用できなかったため、予約は確定されていません。',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }
    return response
  }

  async function enhanceAdminCheckout() {
    const match = location.pathname.match(/^\/admin\/appointments\/([^/]+)$/)
    if (!match) return
    const pageKey = `${location.pathname}${location.search}`
    if (document.documentElement.dataset.lienAdminCouponPage === pageKey) return
    const response = await nativeFetch(`/api/lien-admin-appointment-coupon?appointmentId=${encodeURIComponent(match[1])}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const pricing = await response.json().catch(() => ({}))
    if (!response.ok) return

    const form = document.querySelector('input[name="couponSelection"]')?.closest('form') || null
    if (pricing.bookingApplied) {
      if (document.querySelector('[data-booking-adjustment-v652]')) {
        document.documentElement.dataset.lienAdminCouponPage = pageKey
        return
      }
      const lines = [
        `予約時適用　メニュー料金 ${yen(pricing.menuPrice)}`,
        pricing.couponIssueId ? `クーポン　${pricing.discountRate}%OFF（${pricing.couponCode}） -${yen(pricing.couponDiscount)}` : null,
        pricing.pointsUsed > 0 ? `利用ポイント　-${Number(pricing.pointsUsed).toLocaleString('ja-JP')}pt` : null,
        `お支払い目安　${yen(pricing.finalPrice)}`,
      ].filter(Boolean)
      const banner = statusCard(lines.join('\n'), 'coupon')
      banner.dataset.bookingAdjustmentV652 = '1'
      const target = form?.querySelector('[class*="rounded"]') || form || document.querySelector('main')?.firstElementChild
      if (!target?.parentElement) return
      target.parentElement.insertBefore(banner, target)
      document.documentElement.dataset.lienAdminCouponPage = pageKey
      return
    }

    if (!pricing.couponIssueId || !form) return
    const hidden = form.querySelector('input[name="couponSelection"]')
    const selection = `couponIssue:${pricing.couponIssueId}`
    hidden.value = selection
    form.addEventListener('submit', () => { hidden.value = selection }, true)
    const pickerButton = [...form.querySelectorAll('button')].find(button => button.textContent.trim() === 'クーポン')
    if (pickerButton) {
      pickerButton.click()
      await new Promise(resolve => window.setTimeout(resolve, 80))
      const option = [...document.querySelectorAll('button')].find(button => {
        const text = button.textContent.replace(/\s/g, '')
        return text.includes(String(pricing.couponCode).replace(/\s/g, '')) || text.includes(`限定クーポン${pricing.discountRate}%OFF`)
      })
      if (option) option.click()
    }
    const banner = statusCard(`予約時クーポン：${pricing.discountRate}%OFF（${pricing.couponCode}）。会計確定時に使用済みとなります。`, 'coupon')
    const target = form.querySelector('[class*="rounded"]') || form
    target.parentElement.insertBefore(banner, target)
    document.documentElement.dataset.lienAdminCouponPage = pageKey
  }

  const run = () => {
    enhanceBookingPage().catch(error => insertBookingStatus(statusCard(error.message || '予約情報を取得できませんでした。', 'error')))
    enhanceAdminCheckout().catch(error => console.error('[admin-booking-points-v652]', error))
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
