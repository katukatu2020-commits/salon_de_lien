;(() => {
  'use strict'

  if (window.__lienStyleDetailThreePhotoLayoutV568) return

  const RELEASE = 'style-detail-three-photo-layout-v568'
  const ATTRIBUTE = 'data-style-detail-photo-layout-v568'
  const WIDE_LAYOUT_MINIMUM = 600
  const observedGrids = new WeakSet()

  function installStyles() {
    if (document.querySelector('style[data-style-detail-three-photo-layout-v568]')) return

    const style = document.createElement('style')
    style.dataset.styleDetailThreePhotoLayoutV568 = '1'
    style.textContent = `
      .ts-community-detail article > [${ATTRIBUTE}] {
        display: grid !important;
        width: 100% !important;
        align-self: start !important;
        align-content: start !important;
        grid-auto-flow: row !important;
        background: #eee7df !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}="triptych"] {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
        grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
        aspect-ratio: 6 / 5 !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}="stack"] {
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: auto !important;
        aspect-ratio: auto !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}] > a {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        height: auto !important;
        grid-column: auto !important;
        grid-row: auto !important;
        aspect-ratio: 4 / 5 !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}="triptych"] > a:nth-child(1) {
        grid-column: 1 !important;
        grid-row: 1 / 3 !important;
        height: 100% !important;
        aspect-ratio: auto !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}="triptych"] > a:nth-child(2) {
        grid-column: 2 !important;
        grid-row: 1 !important;
        height: 100% !important;
        aspect-ratio: auto !important;
      }
      .ts-community-detail article > [${ATTRIBUTE}="triptych"] > a:nth-child(3) {
        grid-column: 2 !important;
        grid-row: 2 !important;
        height: 100% !important;
        aspect-ratio: auto !important;
      }
    `
    document.head.appendChild(style)
  }

  function photoLinks(grid) {
    return [...grid.children].filter(child => (
      child.matches('a[aria-label="施術後写真を拡大表示"]')
    ))
  }

  function updateLayout(grid, measuredWidth) {
    const photos = photoLinks(grid)
    if (photos.length !== 3 || grid.children.length !== 3) {
      grid.removeAttribute(ATTRIBUTE)
      return
    }

    const width = Number.isFinite(measuredWidth)
      ? measuredWidth
      : grid.getBoundingClientRect().width
    grid.setAttribute(ATTRIBUTE, width >= WIDE_LAYOUT_MINIMUM ? 'triptych' : 'stack')
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => {
        for (const entry of entries) updateLayout(entry.target, entry.contentRect.width)
      })
    : null

  function mount() {
    installStyles()

    document.querySelectorAll('.ts-community-detail article').forEach(article => {
      const grid = article.querySelector(':scope > header + div')
      if (!(grid instanceof HTMLElement)) return

      updateLayout(grid)
      if (resizeObserver && !observedGrids.has(grid)) {
        observedGrids.add(grid)
        resizeObserver.observe(grid)
      }
    })
  }

  let scheduled = false
  function scheduleMount() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      mount()
    })
  }

  new MutationObserver(scheduleMount).observe(document.documentElement, {
    childList:true,
    subtree:true,
  })
  window.addEventListener('resize', scheduleMount, { passive:true })

  window.__lienStyleDetailThreePhotoLayoutV568 = {
    release:RELEASE,
    refresh:mount,
  }
  mount()
})()
