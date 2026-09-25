import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { patchServerRuntime } from './runtime-transform.mjs'

const require = createRequire(import.meta.url)
const {
  normalizeMenuName,
  menuNameFromOption,
  chooseCouponMenuOption,
} = require('./customer-coupon-menu-prefill-v665.js')

const options = [
  { value: 'student-cut', textContent: '1.学生カット（50分・目安 4,000円）', disabled: false },
  { value: 'bang-cut', textContent: '2.前髪カット（10分・目安 1,100円）', disabled: false },
  { value: 'cut-color', textContent: 'カット＋カラー（150分・目安 11,000円）', disabled: false },
  { value: 'standard-cut', textContent: '3.カット（SB込）（45分・目安 4,500円）', disabled: false },
  { value: 'brow-cut', textContent: '4.カット（SB込）＋眉カット（50分・目安 5,500円）', disabled: false },
  { value: 'head-spa', textContent: '11.ヘッドスパ（45分・目安 4,400円）', disabled: false },
]

assert.equal(normalizeMenuName(' No.3 カット（SB込） '), 'カットsb込')
assert.equal(menuNameFromOption(options[3]), '3.カット（SB込）')
assert.equal(
  chooseCouponMenuOption({ targetMenus: ['カット'] }, options)?.option.value,
  'standard-cut',
  'A generic cut coupon should prefer the base cut menu over student or add-on menus',
)
assert.equal(
  chooseCouponMenuOption({ targetMenus: ['前髪カット'] }, options)?.option.value,
  'bang-cut',
)
assert.equal(
  chooseCouponMenuOption({ targetMenus: ['ヘッドスパ', 'カット'] }, options)?.option.value,
  'head-spa',
  'Coupon target order should be retained',
)
assert.equal(chooseCouponMenuOption({ targetMenus: ['全メニュー'] }, options), null)
assert.equal(
  chooseCouponMenuOption({ targetMenus: ['3.カット（SB込）'], benefitKind: 'STAMP_MENU_FREE' }, options)?.option.value,
  'standard-cut',
)
assert.equal(
  chooseCouponMenuOption({ targetMenus: ['カット'], benefitKind: 'STAMP_MENU_FREE' }, options),
  null,
  'A menu-free reward must not guess among multiple non-exact menus',
)

const parentServer = [
  "const assets = '<script id=\"customer-booking-confirmation-v616\" src=\"/customer-booking-confirmation-v616.js?v=645-pricing1\" defer></script><script id=\"customer-booking-points-v652\" src=\"/customer-booking-points-v652.js?v=652-release1\" defer></script>'",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Chat-Campaign-Time', 'v664') /* chat-campaign-time-v664-ready */",
].join('\n')
const patchedServer = patchServerRuntime(parentServer)
assert.match(patchedServer, /customer-coupon-menu-prefill-v665\.js\?v=665-release1/)
assert.match(patchedServer, /X-Lien-Coupon-Menu-Prefill', 'v665'/)
assert.equal(patchedServer.split('/* coupon-menu-prefill-v665 */').length - 1, 1)

console.log(JSON.stringify({ release: 'coupon-menu-prefill-v665', testsPassed: true }))
