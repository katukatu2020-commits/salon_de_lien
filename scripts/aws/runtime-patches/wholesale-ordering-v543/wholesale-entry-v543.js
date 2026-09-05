/* wholesale-ordering-v543 */
;(() => {
  if (window.__orimiaWholesaleOrderingV543) return
  window.__orimiaWholesaleOrderingV543 = true

  const marker = 'data-wholesale-entry-v543'
  let frame = 0

  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>'

  function ensureStyle() {
    if (document.getElementById('wholesale-entry-v543-style')) return
    const style = document.createElement('style')
    style.id = 'wholesale-entry-v543-style'
    style.textContent = `
      [${marker}]{display:inline-flex;min-height:48px;align-items:center;justify-content:center;gap:9px;border:1px solid #527f72;border-radius:999px;background:#edf6f1;padding:0 20px;color:#356858;font:inherit;font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 8px 20px rgba(51,102,85,.1);transition:background .18s ease,border-color .18s ease,transform .18s ease}
      [${marker}]:hover{border-color:#356858;background:#e1f0e8;transform:translateY(-1px)}
      [${marker}]:focus-visible{outline:3px solid rgba(53,104,88,.24);outline-offset:2px}
      [${marker}] svg{width:19px;height:19px;flex:none}
      [data-wholesale-actions-v543]{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:10px!important}
      @media(max-width:640px){[data-wholesale-actions-v543]{width:100%;align-items:stretch!important;flex-direction:column!important}[data-wholesale-actions-v543]>button,[data-wholesale-actions-v543]>a{width:100%!important}}
      @media(prefers-reduced-motion:reduce){[${marker}]{transition:none}}
    `
    document.head.appendChild(style)
  }

  function removeLegacyInventory() {
    if (location.pathname !== '/admin/settings') return
    document.querySelectorAll('input[name^="stockQuantity:"]').forEach(input => {
      const section = input.closest('section')
      if (section && !section.dataset.wholesaleInventoryRemoved) {
        section.dataset.wholesaleInventoryRemoved = '1'
        section.remove()
      }
    })
    document.querySelectorAll('a[href*="panel=inventory"],button[data-settings-panel="inventory"]').forEach(node => node.remove())
  }

  function addProductShelfEntry() {
    if (location.pathname !== '/admin/products') return
    if (document.querySelector(`[${marker}]`)) return
    const trigger = Array.from(document.querySelectorAll('button,a')).find(node => String(node.textContent || '').replace(/\s+/g, '') === '新しい商品を追加')
    if (!trigger || !trigger.parentElement) return
    ensureStyle()
    const link = document.createElement('a')
    link.href = '/admin/products/orders'
    link.setAttribute(marker, '')
    link.setAttribute('aria-label', '在庫管理と商品発注を開く')
    link.innerHTML = icon + '<span>在庫管理・発注</span>'
    trigger.parentElement.dataset.wholesaleActionsV543 = '1'
    trigger.insertAdjacentElement('afterend', link)
  }

  function organize() {
    frame = 0
    removeLegacyInventory()
    addProductShelfEntry()
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(organize)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
  document.addEventListener('click', event => { if (event.target.closest('a[href]')) setTimeout(schedule, 60) }, true)
})()
