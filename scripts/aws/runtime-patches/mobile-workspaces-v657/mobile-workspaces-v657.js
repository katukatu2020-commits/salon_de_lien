(() => {
  'use strict'

  const mobile = window.matchMedia('(max-width: 767.98px)')
  const marker = 'mobileDisclosureV657'
  let scheduled = false

  function restoreProductForm() {
    document.querySelectorAll('.wo-mobile-form-disclosure-v657').forEach(button => button.remove())
    document.querySelectorAll('.wo-dealer-product-form').forEach(form => {
      form.classList.remove('is-collapsed-v657')
      delete form.dataset[marker]
    })
    document.querySelectorAll('[data-mobile-original-v657]').forEach(heading => {
      heading.textContent = heading.dataset.mobileOriginalV657
      delete heading.dataset.mobileOriginalV657
    })
  }

  function enhanceProductForm() {
    scheduled = false
    if (!mobile.matches) {
      restoreProductForm()
      return
    }
    if (document.body.dataset.dealerView !== 'products') return

    const form = document.querySelector('.wo-dealer-product-form')
    if (!form || form.dataset[marker] === '1') return
    form.dataset[marker] = '1'
    form.classList.add('is-collapsed-v657')

    const heading = form.closest('.wo-workspace')?.querySelector('.wo-workspace-head h2')
    if (heading && !heading.dataset.mobileOriginalV657) {
      heading.dataset.mobileOriginalV657 = heading.textContent
      heading.textContent = '商品管理'
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'wo-mobile-form-disclosure-v657'
    button.setAttribute('aria-controls', form.id || 'dealer-product-form')
    button.setAttribute('aria-expanded', 'false')

    const sourceIcon = form.querySelector('.wo-button svg')
    if (sourceIcon) button.append(sourceIcon.cloneNode(true))
    const label = document.createElement('span')
    label.textContent = '新しい商品を登録'
    button.append(label)
    const chevron = document.createElement('span')
    chevron.className = 'wo-mobile-disclosure-chevron-v657'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.textContent = '⌄'
    button.append(chevron)

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true'
      button.setAttribute('aria-expanded', String(!expanded))
      label.textContent = expanded ? '新しい商品を登録' : '登録フォームを閉じる'
      form.classList.toggle('is-collapsed-v657', expanded)
      if (!expanded) form.querySelector('input')?.focus({ preventScroll: true })
    })
    form.before(button)
  }

  function scheduleEnhancement() {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(enhanceProductForm)
  }

  const observer = new MutationObserver(scheduleEnhancement)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  mobile.addEventListener?.('change', scheduleEnhancement)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhancement, { once: true })
  } else {
    scheduleEnhancement()
  }
})()
