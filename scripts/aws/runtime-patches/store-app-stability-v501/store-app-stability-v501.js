;(() => {
  if (window.__storeAppStabilityV501) return
  window.__storeAppStabilityV501 = true

  const PATH_STACK_KEY = 'orimia:admin-path-stack:v501'
  let frame = 0

  function iconArrowLeft() {
    return '<svg class="lucide lucide-arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>'
  }

  function currentRoute() { return location.pathname + location.search + location.hash }
  function readStack() {
    try { const value = JSON.parse(sessionStorage.getItem(PATH_STACK_KEY) || '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(-20) : [] } catch { return [] }
  }
  function writeStack(value) { try { sessionStorage.setItem(PATH_STACK_KEY, JSON.stringify(value.slice(-20))) } catch {} }
  function recordRoute() {
    if (!location.pathname.startsWith('/admin') || location.pathname === '/admin/login') return
    const route = currentRoute()
    const stack = readStack()
    if (stack.at(-1) !== route) { stack.push(route); writeStack(stack) }
  }
  function fallbackRoute() {
    if (location.pathname.startsWith('/admin/customers/messages')) return '/admin/customers'
    if (/^\/admin\/customers\/[^/]+/.test(location.pathname)) return '/admin/customers'
    if (location.pathname.startsWith('/admin/products')) return '/admin/products?section=menus'
    if (location.pathname.startsWith('/admin/community/')) return '/admin/community'
    if (location.pathname !== '/admin/appointments') return '/admin/appointments'
    return '/admin/customers'
  }
  function goBack() {
    const current = currentRoute()
    const stack = readStack()
    while (stack.at(-1) === current) stack.pop()
    const target = stack.pop() || fallbackRoute()
    writeStack([...stack, target])
    window.location.assign(target)
  }

  function enhanceBackButton() {
    const header = document.querySelector('.admin-mobile-header')
    if (!header || header.querySelector('[data-store-back-v501]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'store-mobile-back-v501'
    button.dataset.storeBackV501 = '1'
    button.setAttribute('aria-label', '前の画面へ戻る')
    button.title = '戻る'
    button.innerHTML = iconArrowLeft()
    button.addEventListener('click', goBack)
    header.prepend(button)
  }

  function repairLineSymbols() {
    document.querySelectorAll('.lien-route-line-v461').forEach(symbol => {
      symbol.classList.remove('orimia-brand-icon')
      symbol.style.removeProperty('background-image')
      symbol.removeAttribute('role')
      symbol.removeAttribute('tabindex')
      symbol.removeAttribute('data-orimia-home-link')
      if (symbol.textContent?.trim() !== 'L') symbol.textContent = 'L'
      symbol.setAttribute('aria-label', 'LINE予約')
    })
  }

  function dedupeMobileCustomers() {
    if (location.pathname !== '/admin/customers') return
    const cards = [...document.querySelectorAll('a[data-customer-registration][href^="/admin/customers/"]')]
    const seen = new Set()
    for (const card of cards) {
      card.removeAttribute('data-store-duplicate-v501')
      card.style.removeProperty('display')
      const key = new URL(card.href, location.href).pathname + new URL(card.href, location.href).search
      if (seen.has(key)) {
        card.dataset.storeDuplicateV501 = '1'
        card.style.setProperty('display', 'none', 'important')
      } else seen.add(key)
    }
  }

  function ensureChatText(bubble) {
    let text = bubble.querySelector(':scope > [data-lien-chat-body-text]')
    if (text) return text
    const directText = [...bubble.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.nodeValue || '').join('')
    if (!directText.trim()) return null
    for (const node of [...bubble.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove()
    text = document.createElement('span')
    text.dataset.lienChatBodyText = '1'
    text.textContent = directText
    bubble.prepend(text)
    return text
  }

  function enhanceLongChats() {
    const params = new URLSearchParams(location.search)
    const isChatRoute = location.pathname.startsWith('/admin/customers/messages/chat')
      || (location.pathname === '/admin/customers/messages' && params.get('chat') === '1')
    if (!isChatRoute) return
    document.querySelectorAll('[data-lien-chat-body]').forEach(bubble => {
      const text = ensureChatText(bubble)
      if (!text) return
      text.classList.add('store-chat-text-v501')
      if (bubble.dataset.storeChatMeasuredV501 === '1') return
      bubble.dataset.storeChatMeasuredV501 = '1'
      window.requestAnimationFrame(() => {
        if (text.scrollHeight <= text.clientHeight + 2) return
        bubble.classList.add('store-chat-overflow-v501')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'store-chat-toggle-v501'
        button.textContent = '全文を表示'
        button.addEventListener('click', () => {
          const expanded = bubble.classList.toggle('is-expanded')
          button.textContent = expanded ? '折りたたむ' : '全文を表示'
          button.setAttribute('aria-expanded', String(expanded))
        })
        button.setAttribute('aria-expanded', 'false')
        bubble.appendChild(button)
      })
    })
  }

  function stepBadge(number, label) {
    const badge = document.createElement('div')
    badge.className = 'store-broadcast-step-v501'
    badge.innerHTML = `<span>${number}</span><strong>${label}</strong>`
    return badge
  }

  function enhanceBroadcastFlow() {
    if (location.pathname !== '/admin/customers/messages') return
    const form = [...document.querySelectorAll('form')].find(candidate => candidate.querySelector('[name="title"]') && candidate.querySelector('[name="body"]') && candidate.querySelector('[name="couponEnabled"]'))
    if (!form) return
    form.classList.add('store-broadcast-flow-v501')
    const sections = [...form.children].filter(child => child.tagName === 'SECTION')
    const definitions = [['1', '配信内容'], ['2', '配信先・配信方法'], ['3', 'クーポン（任意）']]
    sections.slice(0, 3).forEach((section, index) => {
      section.classList.add('store-broadcast-card-v501')
      section.dataset.storeBroadcastStep = definitions[index][0]
      if (!section.querySelector(':scope > .store-broadcast-step-v501')) section.prepend(stepBadge(...definitions[index]))
    })

    const coupon = form.querySelector('[name="couponEnabled"]')
    const couponSection = coupon?.closest('section')
    const fields = couponSection?.querySelector(':scope > div:not(.store-broadcast-step-v501)')
    const note = couponSection?.querySelector(':scope > p')
    if (coupon && fields && coupon.dataset.storeCouponV501 !== '1') {
      coupon.dataset.storeCouponV501 = '1'
      const requiredNames = new Set(['couponTitle', 'couponTargetMenu', 'couponDiscountRate', 'couponValidDays'])
      const sync = () => {
        const enabled = coupon.checked
        fields.hidden = !enabled
        fields.setAttribute('aria-hidden', String(!enabled))
        fields.querySelectorAll('input,textarea,select').forEach(input => {
          input.disabled = !enabled
          if (requiredNames.has(input.name)) input.required = enabled
        })
        couponSection.classList.toggle('is-coupon-enabled', enabled)
        if (note) note.textContent = enabled ? 'クーポン情報を入力してから配信してください。' : 'チェックを入れた場合だけ、クーポンの入力欄が表示されます。'
      }
      coupon.addEventListener('change', sync)
      sync()
    }
  }

  function enhanceProductUpload() {
    if (location.pathname !== '/admin/products') return
    document.querySelectorAll('form [name="imageDataUrl"]').forEach(hidden => {
      const form = hidden.closest('form')
      if (!form) return
      form.dataset.storeProductUploadV501 = hidden.value ? 'ready' : 'waiting'
      const picker = form.querySelector('input[type="file"][accept*="image"]')
      if (picker && picker.dataset.storeProductUploadV501 !== '1') {
        picker.dataset.storeProductUploadV501 = '1'
        picker.addEventListener('change', () => {
          const file = picker.files?.[0]
          const error = form.querySelector('[data-product-image-error],[role="alert"]')
          if (error) error.textContent = ''
          if (!file) { form.dataset.storeProductUploadV501 = 'waiting'; return }
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            picker.value = ''
            hidden.value = ''
            form.dataset.storeProductUploadV501 = 'invalid'
            if (error) error.textContent = 'JPEG・PNG・WebPの2MB以下の画像を選択してください。'
            return
          }
          form.dataset.storeProductUploadV501 = 'reading'
          const reader = new FileReader()
          reader.onerror = () => {
            form.dataset.storeProductUploadV501 = 'error'
            if (error) error.textContent = '画像を読み込めませんでした。'
          }
          reader.onload = () => {
            const value = String(reader.result || '')
            if (!value.startsWith('data:image/')) {
              form.dataset.storeProductUploadV501 = 'error'
              if (error) error.textContent = '画像を読み込めませんでした。'
              return
            }
            hidden.value = value
            hidden.dispatchEvent(new Event('input', { bubbles: true }))
            hidden.dispatchEvent(new Event('change', { bubbles: true }))
            const preview = form.querySelector('img[alt*="商品画像"],img[alt="選択した商品画像"]')
            if (preview) preview.src = value
            form.dataset.storeProductUploadV501 = 'ready'
          }
          reader.readAsDataURL(file)
        }, true)
      }
    })
  }

  function apply() {
    recordRoute()
    enhanceBackButton()
    repairLineSymbols()
    dedupeMobileCustomers()
    enhanceLongChats()
    enhanceBroadcastFlow()
    enhanceProductUpload()
  }

  function schedule() {
    if (frame) return
    frame = window.requestAnimationFrame(() => { frame = 0; apply() })
  }

  function start() {
    if (window.__storeAppStabilityV501Active) return
    window.__storeAppStabilityV501Active = true
    const style = document.createElement('style')
    style.id = 'store-app-stability-v501-style'
    style.textContent = `
      .lien-route-line-v461{background:#06c755!important;color:#fff!important;background-image:none!important}
      .store-mobile-back-v501{display:none;width:2.5rem;height:2.5rem;flex:0 0 2.5rem;place-items:center;border:1px solid var(--lien-border,#e8ded2);border-radius:50%;background:#fff;color:var(--lien-ink,#2f2a25);box-shadow:0 3px 10px rgba(47,42,37,.08)}
      .store-mobile-back-v501 svg{width:1.15rem;height:1.15rem}
      .store-chat-text-v501{display:block;max-width:100%;max-height:15rem;overflow:hidden;overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-word}
      [data-lien-chat-body]{max-width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word}
      .store-chat-overflow-v501 .store-chat-text-v501{mask-image:linear-gradient(#000 72%,transparent)}
      .store-chat-overflow-v501.is-expanded .store-chat-text-v501{max-height:none;mask-image:none}
      .store-chat-toggle-v501{display:block;margin-top:.5rem;border:0;background:transparent;padding:.15rem 0;color:inherit;font-size:.72rem;font-weight:700;text-decoration:underline;text-underline-offset:3px;opacity:.82}
      .store-broadcast-flow-v501{grid-template-columns:minmax(0,1fr)!important;max-width:70rem;margin-inline:auto}
      .store-broadcast-card-v501{grid-column:1!important;padding-top:1.15rem!important}
      .store-broadcast-step-v501{display:flex;align-items:center;gap:.65rem;margin-bottom:1rem;padding-bottom:.9rem;border-bottom:1px solid var(--lien-border,#e8ded2)}
      .store-broadcast-step-v501 span{display:grid;width:1.8rem;height:1.8rem;place-items:center;border-radius:50%;background:var(--lien-primary,#9b5143);color:#fff;font-size:.8rem;font-weight:800}
      .store-broadcast-step-v501 strong{font-size:.92rem;color:var(--lien-ink,#2f2a25)}
      .store-broadcast-card-v501 [hidden]{display:none!important}
      .store-broadcast-card-v501[data-store-broadcast-step="3"]{border-color:#e8cfc4!important;background:#fffaf8!important}
      @media(max-width:767.98px){
        html.ca-admin-mobile-shell,html.ca-admin-mobile-shell body,html.ca-admin-mobile-shell body .admin-app-shell{min-width:0!important;overflow-x:hidden!important}
        html.ca-admin-mobile-shell body .admin-app-shell>aside.admin-desktop-sidebar{display:none!important}
        html.ca-admin-mobile-shell body .admin-app-shell>div.min-w-0{padding-left:0!important}
        html.ca-admin-mobile-shell body .admin-mobile-header{display:flex!important;gap:.55rem}
        html.ca-admin-mobile-shell body .admin-desktop-header{display:none!important}
        .store-mobile-back-v501{display:grid}
        body .admin-main-content div.hidden.md\\:block{display:none!important}
        .store-broadcast-flow-v501{gap:1rem!important}
        .store-broadcast-card-v501{padding:1rem!important;border-radius:1rem!important}
      }
    `
    document.head.appendChild(style)
    apply()
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
    window.addEventListener('pageshow', schedule)
    window.addEventListener('popstate', schedule)
    window.addEventListener('resize', schedule, { passive: true })
  }

  const startAfterHydration = () => window.setTimeout(start, 900)
  if (document.readyState === 'complete') startAfterHydration()
  else window.addEventListener('load', startAfterHydration, { once: true })
})()
