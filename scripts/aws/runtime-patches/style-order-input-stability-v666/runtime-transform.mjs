export const RELEASE_MARKER = 'style-order-input-stability-v666'

export function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

export function patchStyleAdminClient(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: style client is already patched`)
  if (!source.includes('window.__orimiaStyleOrderLoadingRecoveryV661 = true')) {
    throw new Error(`${RELEASE_MARKER}: reviewed v661 style client was not found`)
  }

  const savedOrderAnchor = `        if (!Number.isInteger(movedOrder) || movedOrder < 1) throw new Error('保存結果を確認できませんでした。')
        orderInput.value = String(movedOrder)`
  const savedOrderReplacement = `        if (!Number.isInteger(movedOrder) || movedOrder < 1) throw new Error('保存結果を確認できませんでした。')
        window.dispatchEvent(new CustomEvent('orimia:style-order-saved-v666', {
          detail: { postId, displayOrder: movedOrder },
        }))
        orderInput.value = String(movedOrder)`

  return replaceOne(source, savedOrderAnchor, savedOrderReplacement, 'announce saved style order') +
    `\n/* ${RELEASE_MARKER} */\n`
}

export function patchServerRuntime(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: server is already patched`)
  if (!source.includes("X-Lien-Coupon-Menu-Prefill', 'v665'")) {
    throw new Error(`${RELEASE_MARKER}: reviewed v665 parent server was not found`)
  }

  let result = source
  const styleAsset = '<script id="orimia-style-admin-controls-v618" src="/style-admin-controls-v618.js?v=661-order-recovery1" defer></script>'
  result = replaceOne(
    result,
    styleAsset,
    styleAsset + '<script id="orimia-style-order-input-stability-v666" src="/style-order-input-stability-v666.js?v=666-release1" defer></script>',
    'style order stability asset injection',
  )

  const previousReady = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Menu-Prefill', 'v665') /* coupon-menu-prefill-v665-ready */"
  result = replaceOne(
    result,
    previousReady,
    previousReady + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Input-Stability', 'v666') /* ${RELEASE_MARKER}-ready */`,
    'release readiness marker',
  )

  return result + `\n/* ${RELEASE_MARKER} */\n`
}
