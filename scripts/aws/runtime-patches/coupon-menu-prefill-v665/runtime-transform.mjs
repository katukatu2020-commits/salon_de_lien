export const RELEASE_MARKER = 'coupon-menu-prefill-v665'

export function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(label + ': expected 1 match, found ' + count)
  return source.replace(before, after)
}

export function patchServerRuntime(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(RELEASE_MARKER + ': server is already patched')
  if (!source.includes("X-Lien-Chat-Campaign-Time', 'v664'")) {
    throw new Error(RELEASE_MARKER + ': reviewed v664 parent server was not found')
  }

  let result = source
  const bookingAssets = '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=645-pricing1" defer></script><script id="customer-booking-points-v652" src="/customer-booking-points-v652.js?v=652-release1" defer></script>'
  result = replaceOne(
    result,
    bookingAssets,
    bookingAssets + '<script id="customer-coupon-menu-prefill-v665" src="/customer-coupon-menu-prefill-v665.js?v=665-release1" defer></script>',
    'customer booking asset injection',
  )

  const previousReady = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Chat-Campaign-Time', 'v664') /* chat-campaign-time-v664-ready */"
  result = replaceOne(
    result,
    previousReady,
    previousReady + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Menu-Prefill', 'v665') /* " + RELEASE_MARKER + "-ready */",
    'release readiness marker',
  )

  return result + '\n/* ' + RELEASE_MARKER + ' */\n'
}
