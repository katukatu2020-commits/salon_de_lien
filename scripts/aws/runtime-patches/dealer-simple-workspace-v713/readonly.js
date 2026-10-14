(() => {
  'use strict'
  if (document.body.dataset.dealerRole === 'ADMIN') return
  if (!['products','pricing'].includes(document.body.dataset.dealerView)) return
  const root = document.getElementById('wholesale-app')
  if (!root) return
  const readOnly = () => {
    root.querySelectorAll('.dw-product-create,[data-action="edit-product"],[data-action="remove-product"],.wo-pricing-bulk,.wo-pricing-save').forEach(el => { el.hidden = true })
    root.querySelectorAll('#dealer-pricing-form input').forEach(el => { el.disabled = true })
  }
  readOnly()
  new MutationObserver(readOnly).observe(root,{childList:true,subtree:true})
})()
