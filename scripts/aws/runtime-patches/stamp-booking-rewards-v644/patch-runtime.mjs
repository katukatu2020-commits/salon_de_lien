import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after, expected = 1) {
  const source = read(file)
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`Unexpected v643 parent anchor: ${file} / expected ${expected}, found ${count}`)
  fs.writeFileSync(target(file), source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function addFile(sourceName, destinationName) {
  const destination = target(destinationName)
  if (fs.existsSync(destination)) throw new Error(`${destinationName} already exists`)
  fs.copyFileSync(path.join(here, sourceName), destination)
  changes.push({ kind: 'add', file: destinationName })
}

addFile('stamp-booking-rewards-v644.js', 'stamp-booking-rewards-v644.js')

replaceExact(
  'server.js',
  "const { createCustomerBookingCouponService } = require('./customer-booking-coupon-v616') /* customer-booking-coupon-v616-require */",
  "const { createCustomerBookingCouponService } = require('./stamp-booking-rewards-v644') /* stamp-booking-rewards-v644-require */",
)

replaceExact(
  'server.js',
  '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=616-release1" defer></script>',
  '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=644-stamp-reward1" defer></script>',
)

replaceExact(
  'server.js',
  '<script id="customer-journey-v601" src="/customer-journey-v601.js?v=604-mypage-navigation1" defer></script>',
  '<script id="customer-journey-v601" src="/customer-journey-v601.js?v=644-menu-scroll1" defer></script>',
)

replaceExact(
  'server.js',
  'script.src="/customer-experience-v508.js?v=597-notification-badge1"',
  'script.src="/customer-experience-v508.js?v=644-menu-scroll1"',
)

replaceExact(
  'server.js',
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Account-Approvals', 'v643') /* business-account-approvals-v643-ready */",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Account-Approvals', 'v643') /* business-account-approvals-v643-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Booking-Rewards', 'v644') /* stamp-booking-rewards-v644-ready */",
)

replaceExact(
  'server.js',
  `  const completedCards = Math.max(0, Number(card.completedCards || 0))
  const isComplete = totalVisits > 0 && remainingVisits === 0`,
  `  const completedCards = Math.max(0, Number(card.completedCards || 0))
  const stampRewards = await customerBookingCoupon.stampRewards(session)
  const isComplete = stampRewards.availableCount > 0`,
)

replaceExact(
  'server.js',
  `    + '<footer class="sc-reward-v617"><span class="sc-reward-icon-v617">' + customerIcon('ticket') + '</span><div class="sc-reward-copy-v617"><small>' + rewardEyebrow + '</small><h3>' + htmlEscape(card.reward.title) + '</h3><p>' + htmlEscape(card.reward.description) + '</p></div><span class="sc-reward-state-v617">' + rewardState + '</span><a class="sc-reward-link-v617" href="/u/appointments">予約する' + customerIcon('chevron') + '</a></footer>'`,
  `    + '<footer class="sc-reward-v617"><span class="sc-reward-icon-v617">' + customerIcon('ticket') + '</span><div class="sc-reward-copy-v617"><small>' + rewardEyebrow + '</small><h3>' + htmlEscape(card.reward.title) + '</h3><p>' + htmlEscape(card.reward.description) + '</p></div><span class="sc-reward-state-v617">' + rewardState + '</span><a class="sc-reward-link-v617" href="' + htmlEscape(stampRewards.bookingHref) + '">予約する' + customerIcon('chevron') + '</a></footer>'`,
)

replaceExact(
  'server.js',
  `    + '<p class="sc-note-v617">' + customerIcon('points') + '<span>スタンプは会計完了後に自動で反映されます。特典をご利用の際は店舗スタッフへお伝えください。</span></p>'`,
  `    + '<p class="sc-note-v617">' + customerIcon('points') + '<span>スタンプは会計完了後に自動で反映されます。メニュー特典は予約確認画面で選択すると料金へ反映されます。</span></p>'`,
)

replaceExact(
  'customer-booking-coupon-v616.js',
  `function couponMatchesMenu(targets, appointmentMenu) {
  if (!targets.length) return true
  const menu = normalizeMenu(appointmentMenu)
  return targets.some(target => {
    const normalized = normalizeMenu(target)
    if (['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'].includes(normalized)) return true
    return normalized && (menu.includes(normalized) || normalized.includes(menu))
  })
}`,
  `function couponMatchesMenu(targets, appointmentMenu, exact = false) {
  if (!targets.length) return true
  const menu = normalizeMenu(appointmentMenu)
  return targets.some(target => {
    const normalized = normalizeMenu(target)
    if (!exact && ['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'].includes(normalized)) return true
    return normalized && (exact ? menu === normalized : menu.includes(normalized) || normalized.includes(menu))
  })
}`,
)

replaceExact(
  'customer-booking-coupon-v616.js',
  `    expiresAt: row.expiresAt,
    appointmentId: row.appointmentId || null,`,
  `    expiresAt: row.expiresAt,
    appointmentId: row.appointmentId || null,
    benefitKind: row.stampRewardType === 'MENU_FREE' ? 'STAMP_MENU_FREE' : row.stampRewardType === 'DISCOUNT_PERCENT' ? 'STAMP_DISCOUNT_PERCENT' : null,
    displayName: row.stampDisplayName || null,
    noExpiry: Boolean(row.stampRewardType),`,
)

replaceExact(
  'customer-booking-coupon-v616.js',
  `      \`SELECT ci."id",ci."couponCode",ci."discountRate",ci."targetMenusJson",ci."expiresAt",
        a."id" AS "appointmentId",a."status" AS "appointmentStatus"
       FROM "CouponIssue" ci
       JOIN "Customer" c ON c."id"=ci."customerId"
       LEFT JOIN "Appointment" a ON a."couponIssueId"=ci."id"\n`,
  `      \`SELECT ci."id",ci."couponCode",ci."discountRate",ci."targetMenusJson",ci."expiresAt",
        g."rewardType" AS "stampRewardType",g."displayName" AS "stampDisplayName",
        a."id" AS "appointmentId",a."status" AS "appointmentStatus"
       FROM "CouponIssue" ci
       JOIN "Customer" c ON c."id"=ci."customerId"
       LEFT JOIN "CustomerStampRewardGrantV644" g ON g."couponIssueId"=ci."id"
       LEFT JOIN "Appointment" a ON a."couponIssueId"=ci."id"\n`,
)

replaceExact(
  'customer-booking-coupon-v616.js',
  `        \`SELECT ci."id",ci."couponCode",ci."discountRate",ci."targetMenusJson",ci."expiresAt"
         FROM "CouponIssue" ci JOIN "Customer" c ON c."id"=ci."customerId"\n`,
  `        \`SELECT ci."id",ci."couponCode",ci."discountRate",ci."targetMenusJson",ci."expiresAt",
                g."rewardType" AS "stampRewardType"
         FROM "CouponIssue" ci JOIN "Customer" c ON c."id"=ci."customerId"
         LEFT JOIN "CustomerStampRewardGrantV644" g ON g."couponIssueId"=ci."id"\n`,
)

replaceExact(
  'customer-booking-coupon-v616.js',
  '      if (!couponMatchesMenu(parseTargets(issue.targetMenusJson), appointment.menu)) {',
  "      if (!couponMatchesMenu(parseTargets(issue.targetMenusJson), appointment.menu, issue.stampRewardType === 'MENU_FREE')) {",
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  `  function couponMatchesMenu(coupon, menuName) {
    const targets = Array.isArray(coupon?.targetMenus) ? coupon.targetMenus : []
    if (!targets.length) return true
    const menu = normalize(menuName)
    return targets.some(target => {
      const value = normalize(target)
      if (['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'].includes(value)) return true
      return value && (menu.includes(value) || value.includes(menu))
    })
  }`,
  `  function couponMatchesMenu(coupon, menuName) {
    const targets = Array.isArray(coupon?.targetMenus) ? coupon.targetMenus : []
    if (!targets.length) return true
    const menu = normalize(menuName)
    const exact = coupon?.benefitKind === 'STAMP_MENU_FREE'
    return targets.some(target => {
      const value = normalize(target)
      if (!exact && ['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'].includes(value)) return true
      return value && (exact ? menu === value : menu.includes(value) || value.includes(menu))
    })
  }`,
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  '      eligible: eligible.map(coupon => [coupon.id, coupon.couponCode, coupon.discountRate, coupon.expiresAt]),',
  '      eligible: eligible.map(coupon => [coupon.id, coupon.couponCode, coupon.discountRate, coupon.expiresAt, coupon.benefitKind, coupon.displayName]),',
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  '      option.textContent = `${coupon.couponCode}（${Number(coupon.discountRate)}%OFF${expiry ? `・${expiry}まで` : \'\'}）`',
  '      option.textContent = coupon.displayName ? `${coupon.displayName}${coupon.benefitKind === \'STAMP_MENU_FREE\' ? \'\' : `（${Number(coupon.discountRate)}%OFF）`}${!coupon.noExpiry && expiry ? `・${expiry}まで` : \'\'}` : `${coupon.couponCode}（${Number(coupon.discountRate)}%OFF${expiry ? `・${expiry}まで` : \'\'}）`',
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  "    hint.textContent = state.loadError || (selected ? 'クーポンは会計時に適用されます。' : eligible.length ? `${eligible.length}件のクーポンを利用できます。` : 'このメニューに利用できるクーポンはありません。')",
  "    hint.textContent = state.loadError || (selected?.benefitKind === 'STAMP_MENU_FREE' ? 'スタンプカード特典が予約と会計に適用されます。' : selected ? 'クーポンは会計時に適用されます。' : eligible.length ? `${eligible.length}件のクーポンを利用できます。` : 'このメニューに利用できるクーポンはありません。')",
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  '    amounts.innerHTML = `<div><dt>メニュー料金</dt><dd>${yen(details.price)}</dd></div>${selected ? `<div class="lien-booking-v616__discount"><dt>クーポン ${Number(selected.discountRate)}%OFF</dt><dd>-${yen(discount)}</dd></div>` : \'\'}<div class="lien-booking-v616__total"><dt>お支払い目安</dt><dd>${yen(details.price - discount)}</dd></div>`',
  '    const discountLabel = selected?.benefitKind === \'STAMP_MENU_FREE\' ? \'スタンプカード特典（メニュー無料）\' : `クーポン ${Number(selected?.discountRate || 0)}%OFF`\n    amounts.innerHTML = `<div><dt>メニュー料金</dt><dd>${yen(details.price)}</dd></div>${selected ? `<div class="lien-booking-v616__discount"><dt>${discountLabel}</dt><dd>-${yen(discount)}</dd></div>` : \'\'}<div class="lien-booking-v616__total"><dt>お支払い目安</dt><dd>${yen(details.price - discount)}</dd></div>`',
)

replaceExact(
  'public/customer-journey-v601.js',
  `    shell.querySelector('.cj-menu-list').addEventListener('change',event=>{
      if (!event.target.matches('input[data-cj-menu]')) return
      // The original controlled select remains the single source of booking state.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,event.target.value)
      select.dispatchEvent(new Event('change',{bubbles:true})); queue()
    })`,
  `    let menuScrollSnapshot=null
    const rememberMenuScroll=event=>{if(event.target.closest('input[data-cj-menu],.cj-menu-row'))menuScrollSnapshot={left:window.scrollX,top:window.scrollY,at:performance.now()}}
    shell.querySelector('.cj-menu-list').addEventListener('pointerdown',rememberMenuScroll,true)
    shell.querySelector('.cj-menu-list').addEventListener('mousedown',rememberMenuScroll,true)
    shell.querySelector('.cj-menu-list').addEventListener('touchstart',rememberMenuScroll,{capture:true,passive:true})
    shell.querySelector('.cj-menu-list').addEventListener('change',event=>{
      if (!event.target.matches('input[data-cj-menu]')) return
      const recent=menuScrollSnapshot&&performance.now()-menuScrollSnapshot.at<1200
      const scrollLeft=recent?menuScrollSnapshot.left:window.scrollX,scrollTop=recent?menuScrollSnapshot.top:window.scrollY
      menuScrollSnapshot=null
      // The original controlled select remains the single source of booking state.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,event.target.value)
      select.dispatchEvent(new Event('change',{bubbles:true})); queue()
      let restoreFrames=0
      const restoreScroll=()=>{window.scrollTo({left:scrollLeft,top:scrollTop,behavior:'auto'});restoreFrames+=1;if(restoreFrames<3)requestAnimationFrame(restoreScroll)}
      requestAnimationFrame(restoreScroll)
    })`,
)

replaceExact(
  'customer-experience-v508.js',
  `    function choose(value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      if (setter) setter.call(select, value)
      else select.value = value
      select.dispatchEvent(new Event('input', { bubbles: true }))
      select.dispatchEvent(new Event('change', { bubbles: true }))
      syncTrigger()
      close()
      window.setTimeout(syncTrigger, 0)
    }`,
  `    function choose(value) {
      const scrollLeft = window.scrollX
      const scrollTop = window.scrollY
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      if (setter) setter.call(select, value)
      else select.value = value
      select.dispatchEvent(new Event('input', { bubbles: true }))
      select.dispatchEvent(new Event('change', { bubbles: true }))
      syncTrigger()
      close()
      let restoreFrames = 0
      const restoreScroll = () => {
        window.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' })
        restoreFrames += 1
        if (restoreFrames < 3) window.requestAnimationFrame(restoreScroll)
      }
      window.requestAnimationFrame(restoreScroll)
      window.setTimeout(syncTrigger, 0)
    }`,
)

replaceExact(
  'customer-experience-v508.js',
  '      if (lastFocus instanceof HTMLElement) lastFocus.focus()',
  "      if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true })",
)

fs.writeFileSync('/tmp/stamp-booking-rewards-v644-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: 'stamp-booking-rewards-v644',
  changedFiles: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  addedFiles: changes.filter(change => change.kind === 'add').map(change => change.file),
  changes: changes.length,
}))
