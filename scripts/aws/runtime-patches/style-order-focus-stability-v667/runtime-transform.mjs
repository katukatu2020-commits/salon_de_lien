export const RELEASE_MARKER = 'style-order-focus-stability-v667'

export function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

export function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

export function patchStyleAdminClient(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: style client is already patched`)
  if (!source.includes('window.__orimiaStyleOrderLoadingRecoveryV661 = true')) {
    throw new Error(`${RELEASE_MARKER}: reviewed v661 style client was not found`)
  }

  const deferredScan = `  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  }`
  const immediateScan = `  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    queueMicrotask(scan)
  }`

  return replaceExact(
    source,
    deferredScan,
    immediateScan,
    2,
    'restore style list and controls before paint',
  ) + `\n/* ${RELEASE_MARKER} */\n`
}

export function patchServerRuntime(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: server is already patched`)
  if (!source.includes("X-Lien-Style-Order-Input-Stability', 'v666'")) {
    throw new Error(`${RELEASE_MARKER}: reviewed v666 parent server was not found`)
  }

  let result = source
  const previousAsset = '<script id="orimia-style-order-input-stability-v666" src="/style-order-input-stability-v666.js?v=666-release1" defer></script>'
  const nextAsset = '<script id="orimia-style-order-focus-stability-v667" src="/style-order-focus-stability-v667.js?v=667-release1" defer></script>'
  result = replaceOne(result, previousAsset, nextAsset, 'style order focus asset replacement')

  const previousReady = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Input-Stability', 'v666') /* style-order-input-stability-v666-ready */"
  result = replaceOne(
    result,
    previousReady,
    previousReady + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Focus-Stability', 'v667') /* ${RELEASE_MARKER}-ready */`,
    'release readiness marker',
  )

  return result + `\n/* ${RELEASE_MARKER} */\n`
}
