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
