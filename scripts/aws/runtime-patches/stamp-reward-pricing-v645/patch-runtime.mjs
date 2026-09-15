import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = []

function target(file) { return path.join(root, file) }

function replaceExact(file, before, after, expected = 1) {
  const source = fs.readFileSync(target(file), 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`Unexpected v644 parent anchor: ${file} / expected ${expected}, found ${count}`)
  fs.writeFileSync(target(file), source.split(before).join(after))
  changes.push({ file, count })
}

replaceExact(
  'server.js',
  '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=644-stamp-reward1" defer></script>',
  '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=645-pricing1" defer></script>',
)

replaceExact(
  'server.js',
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Booking-Rewards', 'v644') /* stamp-booking-rewards-v644-ready */",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Booking-Rewards', 'v644') /* stamp-booking-rewards-v644-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Reward-Pricing', 'v645') /* stamp-reward-pricing-v645-ready */",
)

replaceExact(
  'ui-workflows-v294.js',
  "        insertBookingStatus(statusCard(`${data.coupon.discountRate}%OFFクーポン（${data.coupon.couponCode}）を予約にセットしました。利用確定は会計完了時です。`, 'coupon'))",
  "        if (data.coupon.benefitKind !== 'STAMP_MENU_FREE') insertBookingStatus(statusCard(`${data.coupon.discountRate}%OFFクーポン（${data.coupon.couponCode}）を予約にセットしました。利用確定は会計完了時です。`, 'coupon'))",
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    selectedCouponId: '',
    requestedCouponId: new URLSearchParams(location.search).get('coupon') || '',`,
  `    selectedCouponId: '',
    requestedCouponId: new URLSearchParams(location.search).get('coupon') || '',
    requestedStampReward: new URLSearchParams(location.search).get('stampReward') === '1',
    stampMenuPrepared: false,`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    .lien-booking-v616__policy{margin:0;color:#786d66;font-size:11px;line-height:1.7}
    .lien-booking-v616__policy a,.lien-cancel-v616__closed a{color:#8f4f42;font-weight:700;text-underline-offset:2px}`,
  `    .lien-booking-v616__policy{margin:0;color:#786d66;font-size:11px;line-height:1.7}
    .lien-booking-v616__policy a,.lien-cancel-v616__closed a{color:#8f4f42;font-weight:700;text-underline-offset:2px}
    .lien-stamp-reward-v645{margin:0 0 16px;border:1px solid #e4c772;border-radius:8px;background:#fff9e8;padding:13px 16px;color:#6f5215;font-size:13px;font-weight:700;line-height:1.7}
    .lien-stamp-reward-v645[data-applicable="false"]{border-color:#e2cbc1;background:#fff8f5;color:#785a4f}`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `  function menuDetails() {
    const select = document.querySelector('select.cx-menu-native-select-v508')
    const option = select?.options?.[select.selectedIndex]
    const text = String(option?.textContent || '').trim()
    const structured = text.match(/^(.*)（(\\d+)分・目安\\s*([\\d,]+)円）$/)
    const price = Number((structured?.[3] || text.match(/([\\d,]+)円/)?.[1] || '0').replace(/,/g, ''))
    return {
      select,
      name: String(structured?.[1] || text.replace(/（.*$/, '') || '').trim(),
      price: Number.isFinite(price) ? price : 0,
    }
  }`,
  `  function menuOptionDetails(option) {
    const text = String(option?.textContent || '').trim()
    const structured = text.match(/^(.*)（(\\d+)分・目安\\s*([\\d,]+)円）$/)
    const price = Number((structured?.[3] || text.match(/([\\d,]+)円/)?.[1] || '0').replace(/,/g, ''))
    return {
      name: String(structured?.[1] || text.replace(/（.*$/, '') || '').trim(),
      price: Number.isFinite(price) ? price : 0,
    }
  }

  function bookingMenuSelect() {
    return document.querySelector('select.cx-menu-native-select-v508')
      || [...document.querySelectorAll('select')].find(element => [...element.options].some(option => /分.*円/.test(String(option.textContent || ''))))
      || null
  }

  function menuDetails() {
    const select = bookingMenuSelect()
    return { select, ...menuOptionDetails(select?.options?.[select.selectedIndex]) }
  }`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `  function createBookingSummary() {`,
  `  function requestedStampCoupon() {
    if (!state.requestedStampReward || !state.requestedCouponId) return null
    const coupon = state.coupons.find(item => item.id === state.requestedCouponId && !item.appointmentId)
    return coupon?.benefitKind === 'STAMP_MENU_FREE' ? coupon : null
  }

  function stampTargetName(coupon) {
    return String(Array.isArray(coupon?.targetMenus) ? coupon.targetMenus[0] || '' : '').trim()
  }

  function prepareRequestedStampMenu() {
    if (state.stampMenuPrepared) return
    const coupon = requestedStampCoupon()
    const nativeSelect = bookingMenuSelect()
    if (!coupon || !nativeSelect) return
    const option = [...nativeSelect.options].find(item => couponMatchesMenu(coupon, menuOptionDetails(item).name))
    if (!option) return
    state.selectedCouponId = coupon.id
    window.__lienSelectedCouponV366 = coupon
    if (nativeSelect.value !== option.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      if (setter) setter.call(nativeSelect, option.value)
      else nativeSelect.value = option.value
      nativeSelect.dispatchEvent(new Event('input', { bubbles: true }))
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const radio = [...document.querySelectorAll('input[data-cj-menu]')].find(input => input.value === option.value)
    if (!radio) return
    if (!radio.checked) {
      radio.checked = true
      radio.dispatchEvent(new Event('change', { bubbles: true }))
    }
    state.stampMenuPrepared = true
  }

  function syncStampRewardNotice() {
    document.querySelectorAll('.lien-booking-v366__status--coupon').forEach(card => card.remove())
    const coupon = requestedStampCoupon()
    let notice = document.querySelector('[data-lien-stamp-reward-v645]')
    if (!coupon) {
      notice?.remove()
      return
    }
    const target = document.querySelector('.cj-booking-top')
    if (!target) return
    if (!notice) {
      notice = document.createElement('div')
      notice.className = 'lien-stamp-reward-v645'
      notice.dataset.lienStampRewardV645 = '1'
      notice.setAttribute('role', 'status')
      target.insertBefore(notice, target.querySelector('[data-cj-heading]') || target.firstChild)
    }
    const details = menuDetails()
    const applicable = Boolean(details.name && couponMatchesMenu(coupon, details.name))
    const targetName = stampTargetName(coupon)
    notice.dataset.applicable = String(applicable)
    notice.textContent = applicable
      ? 'スタンプカード特典「' + (coupon.displayName || targetName + ' 無料') + '」を適用します。予約確認のお支払い目安は0円です。'
      : 'このスタンプカード特典は「' + targetName + '」専用です。現在選択中のメニューには適用されません。'
  }

  function createBookingSummary() {`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    const eligible = state.coupons.filter(coupon => !coupon.appointmentId && couponMatchesMenu(coupon, details.name))
    if (state.selectedCouponId && !eligible.some(coupon => coupon.id === state.selectedCouponId)) state.selectedCouponId = ''
    const selected = eligible.find(coupon => coupon.id === state.selectedCouponId) || null`,
  `    const eligible = state.coupons.filter(coupon => !coupon.appointmentId && couponMatchesMenu(coupon, details.name))
    if (state.selectedCouponId && !eligible.some(coupon => coupon.id === state.selectedCouponId)) state.selectedCouponId = ''
    const selected = eligible.find(coupon => coupon.id === state.selectedCouponId) || null
    const requestedStamp = requestedStampCoupon()
    const requestedStampMismatch = Boolean(requestedStamp && !couponMatchesMenu(requestedStamp, details.name))
    const requestedStampTarget = stampTargetName(requestedStamp)`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    none.textContent = !state.loaded ? 'クーポンを確認しています' : eligible.length ? '利用しない' : '利用できるクーポンはありません'`,
  `    none.textContent = !state.loaded ? 'クーポンを確認しています' : eligible.length ? '利用しない' : requestedStampMismatch ? 'このメニューはスタンプ特典の対象外です' : '利用できるクーポンはありません'`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    hint.textContent = state.loadError || (selected?.benefitKind === 'STAMP_MENU_FREE' ? 'スタンプカード特典が予約と会計に適用されます。' : selected ? 'クーポンは会計時に適用されます。' : eligible.length ? \`${'${eligible.length}'}件のクーポンを利用できます。\` : 'このメニューに利用できるクーポンはありません。')`,
  `    hint.textContent = state.loadError || (selected?.benefitKind === 'STAMP_MENU_FREE' ? 'スタンプカード特典が予約と会計に適用され、お支払い目安は0円になります。' : selected ? 'クーポンは会計時に適用されます。' : requestedStampMismatch ? 'この特典は「' + requestedStampTarget + '」専用です。対象メニューを選ぶと料金が0円になります。' : eligible.length ? String(eligible.length) + '件のクーポンを利用できます。' : 'このメニューに利用できるクーポンはありません。')`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `  function run() {
    if (location.pathname !== '/u/appointments') return
    syncBookingSummary()
    document.querySelectorAll('[data-customer-appointment-id]').forEach(enhanceCancellationCard)
  }`,
  `  function run() {
    if (location.pathname !== '/u/appointments') return
    prepareRequestedStampMenu()
    syncStampRewardNotice()
    syncBookingSummary()
    document.querySelectorAll('[data-customer-appointment-id]').forEach(enhanceCancellationCard)
  }`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `    document.addEventListener('change', event => {
      if (event.target?.matches?.('select.cx-menu-native-select-v508')) queue()
    }, true)`,
  `    document.addEventListener('change', event => {
      if (event.target === bookingMenuSelect()) queue()
    }, true)`,
)

fs.writeFileSync('/tmp/stamp-reward-pricing-v645-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: 'stamp-reward-pricing-v645',
  changedFiles: [...new Set(changes.map(change => change.file))],
  changes: changes.length,
}))
