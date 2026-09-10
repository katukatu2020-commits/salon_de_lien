const oldGuard = `  if (window.__orimiaUiTransitionV536) return
  window.__orimiaUiTransitionV536 = true`

const newGuard = `  if (window.__orimiaUiTransitionV623) return
  window.__orimiaUiTransitionV623 = true
  window.__orimiaUiTransitionV536 = true
  document.documentElement.dataset.orimiaNavigationLoaderScope = 'v623'`

const oldClickListener = `  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    const target = new URL(link.href, location.href)
    const current = new URL(location.href)
    if (!protectedUrl(target.href) || !changesPage(current.href, target.href)) return
    beginNavigation('internal-link')
    state.clickTimer = window.setTimeout(() => {
      if (!state.committed && location.href === state.startUrl) reveal('link-not-committed')
    }, 1200)
  }, true)`

const newClickListener = `  // Run after application click handlers so cancelled modal and in-page actions stay visible.
  window.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    const target = new URL(link.href, location.href)
    const current = new URL(location.href)
    if (!protectedUrl(target.href) || !changesPage(current.href, target.href)) return
    if (state.mode === 'navigation') return
    beginNavigation('internal-link')
    state.clickTimer = window.setTimeout(() => {
      if (!state.committed && location.href === state.startUrl) reveal('link-not-committed')
    }, 1200)
  })`

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

export function scopeNavigationLoader(source) {
  let result = replaceOne(source, oldGuard, newGuard, 'navigation loader guard')
  result = replaceOne(result, oldClickListener, newClickListener, 'navigation click listener')
  return result
}

export const navigationLoaderFragments = {
  oldGuard,
  newGuard,
  oldClickListener,
  newClickListener,
}
