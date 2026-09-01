;(() => {
  if (window.__lienBroadcastLayoutV510) return
  window.__lienBroadcastLayoutV510 = true

  let frame = 0
  let timer = 0

  function findBroadcastForm() {
    if (location.pathname !== '/admin/customers/messages') return null
    return [...document.querySelectorAll('form')].find(form => (
      form.querySelector('[name="title"]')
      && form.querySelector('[name="body"]')
      && form.querySelector('[name="couponEnabled"]')
    )) || null
  }

  function syncCouponSection(coupon, section, fields) {
    const enabled = coupon.checked
    fields.hidden = !enabled
    fields.setAttribute('aria-hidden', String(!enabled))
    section.classList.toggle('is-coupon-enabled', enabled)
    section.dataset.lienCouponExpanded = enabled ? 'true' : 'false'

    const requiredNames = new Set([
      'couponTitle',
      'couponTargetMenu',
      'couponDiscountRate',
      'couponValidDays',
    ])
    fields.querySelectorAll('input, textarea, select').forEach(input => {
      input.disabled = !enabled
      if (requiredNames.has(input.name)) input.required = enabled
    })
  }

  function enhanceBroadcastLayout() {
    const form = findBroadcastForm()
    if (!form) return

    form.classList.add('broadcast-layout-v510')
    form.dataset.lienBroadcastLayout = 'v510'

    const sections = [...form.children].filter(child => child.tagName === 'SECTION').slice(0, 3)
    sections.forEach((section, index) => {
      section.classList.add('broadcast-layout-card-v510')
      section.dataset.lienBroadcastStep = String(index + 1)
    })

    const actions = [...form.children].find(child => child.tagName === 'DIV')
    actions?.classList.add('broadcast-layout-actions-v510')

    const coupon = form.querySelector('[name="couponEnabled"]')
    const couponSection = coupon?.closest('section')
    const fields = couponSection?.querySelector(':scope > div:not(.store-broadcast-step-v501)')
    if (!coupon || !couponSection || !fields) return

    if (coupon.dataset.lienBroadcastLayoutV510 !== '1') {
      coupon.dataset.lienBroadcastLayoutV510 = '1'
      coupon.addEventListener('change', () => syncCouponSection(coupon, couponSection, fields))
      form.addEventListener('reset', () => window.setTimeout(() => syncCouponSection(coupon, couponSection, fields)))
    }
    syncCouponSection(coupon, couponSection, fields)
  }

  function schedule() {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        enhanceBroadcastLayout()
      })
    }, 180)
  }

  function start() {
    if (document.getElementById('broadcast-layout-v510-styles')) return
    const style = document.createElement('style')
    style.id = 'broadcast-layout-v510-styles'
    style.textContent = `
      body .store-broadcast-flow-v501 {
        display: grid !important;
        width: 100% !important;
        max-width: 80rem !important;
        margin-inline: auto !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 1rem !important;
        align-items: stretch !important;
      }
      body .store-broadcast-flow-v501 > .store-broadcast-card-v501 {
        min-width: 0 !important;
        grid-column: 1 !important;
      }
      body .store-broadcast-flow-v501 > .broadcast-layout-actions-v510,
      body .store-broadcast-flow-v501 > div:last-child {
        grid-column: 1 !important;
        margin-top: .25rem !important;
      }
      body .store-broadcast-flow-v501 .store-broadcast-step-v501 {
        min-width: 0;
      }
      body .store-broadcast-flow-v501 .store-broadcast-step-v501 strong {
        line-height: 1.45;
      }
      body .store-broadcast-flow-v501 [data-store-broadcast-step="3"] > [hidden] {
        display: none !important;
      }

      @media (min-width: 768px) {
        body .store-broadcast-flow-v501 [data-store-broadcast-step="3"]:not(.is-coupon-enabled) {
          display: grid !important;
          grid-template-columns: minmax(12rem, .7fr) minmax(22rem, 1.3fr);
          grid-template-areas:
            "step toggle"
            "step note";
          align-items: center;
          gap: .35rem 1.5rem;
          padding: 1.1rem 1.25rem !important;
        }
        body .store-broadcast-flow-v501 [data-store-broadcast-step="3"]:not(.is-coupon-enabled) > .store-broadcast-step-v501 {
          grid-area: step;
          align-self: stretch;
          margin: 0;
          padding: 0 1.25rem 0 0;
          border-right: 1px solid var(--lien-border, #e8ded2);
          border-bottom: 0;
        }
        body .store-broadcast-flow-v501 [data-store-broadcast-step="3"]:not(.is-coupon-enabled) > label {
          grid-area: toggle;
          min-width: 0;
        }
        body .store-broadcast-flow-v501 [data-store-broadcast-step="3"]:not(.is-coupon-enabled) > p {
          grid-area: note;
          margin: 0 !important;
        }
      }

      @media (min-width: 1180px) {
        body .store-broadcast-flow-v501 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: clamp(1rem, 1.6vw, 1.5rem) !important;
        }
        body .store-broadcast-flow-v501 > [data-store-broadcast-step="1"] {
          grid-column: 1 !important;
        }
        body .store-broadcast-flow-v501 > [data-store-broadcast-step="2"] {
          grid-column: 2 !important;
        }
        body .store-broadcast-flow-v501 > [data-store-broadcast-step="3"],
        body .store-broadcast-flow-v501 > .broadcast-layout-actions-v510,
        body .store-broadcast-flow-v501 > div:last-child {
          grid-column: 1 / -1 !important;
        }
        body .store-broadcast-flow-v501 > [data-store-broadcast-step="1"],
        body .store-broadcast-flow-v501 > [data-store-broadcast-step="2"] {
          height: 100%;
        }
        body .store-broadcast-flow-v501 [data-store-broadcast-step="1"] textarea[name="body"] {
          min-height: 11.5rem !important;
        }
      }

      @media (max-width: 767.98px) {
        body .store-broadcast-flow-v501 {
          max-width: none !important;
        }
        body .store-broadcast-flow-v501 [data-store-broadcast-step="3"]:not(.is-coupon-enabled) {
          display: block !important;
        }
      }
    `
    document.head.appendChild(style)
    schedule()
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
    window.addEventListener('pageshow', schedule)
    window.addEventListener('popstate', schedule)
    window.addEventListener('resize', schedule, { passive: true })
  }

  const startAfterHydration = () => window.setTimeout(start, 1100)
  if (document.readyState === 'complete') startAfterHydration()
  else window.addEventListener('load', startAfterHydration, { once: true })
})()
