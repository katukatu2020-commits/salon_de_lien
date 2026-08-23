(() => {
  'use strict'

  let codePromise = null
  let frame = 0

  function styles() {
    if (document.getElementById('lien-customer-code-styles')) return
    const style = document.createElement('style')
    style.id = 'lien-customer-code-styles'
    style.textContent = `
      .lien-public-code{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 18px;border:1px solid #ead8d2;border-radius:16px;background:linear-gradient(145deg,#fff9f7,#fff);padding:15px 16px;box-shadow:0 8px 22px rgba(75,49,40,.06)}
      .lien-public-code-copy{min-width:0}.lien-public-code-copy small{display:block;color:#8f7770;font-size:11px;font-weight:700}.lien-public-code-copy strong{display:block;margin-top:5px;color:#5f352e;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:18px;letter-spacing:.08em}.lien-public-code-copy p{margin:5px 0 0;color:#8b7a73;font-size:10px;line-height:1.6}.lien-public-code button{display:inline-flex;min-height:40px;flex:0 0 auto;align-items:center;justify-content:center;border:1px solid #e1c9c1;border-radius:999px;background:white;padding:0 15px;color:#81483d;font-size:11px;font-weight:800;cursor:pointer}.lien-public-code button:focus-visible{outline:3px solid #e7b6c2;outline-offset:2px}
      @media(max-width:420px){.lien-public-code{align-items:flex-start;flex-direction:column}.lien-public-code button{width:100%}}
    `
    document.head.appendChild(style)
  }

  async function loadCode() {
    if (!codePromise) {
      codePromise = fetch('/api/lien-customer-code', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
        .then(async response => {
          const body = await response.json()
          if (!response.ok || !body.code) throw new Error(body.error || 'お客様コードを取得できませんでした。')
          return body.code
        })
        .catch(error => { codePromise = null; throw error })
    }
    return codePromise
  }

  async function enhance() {
    return
    if (location.pathname !== '/u/profile' || document.querySelector('[data-lien-public-code]')) return
    const form = document.querySelector('main form') || document.querySelector('form')
    if (!form) return
    const card = document.createElement('section')
    card.className = 'lien-public-code'
    card.dataset.lienPublicCode = '1'
    card.setAttribute('aria-live', 'polite')
    card.innerHTML = '<div class="lien-public-code-copy"><small>店舗登録用 お客様コード</small><strong>読み込み中...</strong><p>初めて利用する店舗でスタッフへお伝えください。このコードは変更できません。</p></div><button type="button" disabled>コピー</button>'
    form.insertAdjacentElement('beforebegin', card)
    try {
      const code = await loadCode()
      const button = card.querySelector('button')
      card.querySelector('strong').textContent = code
      button.disabled = false
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = 'コピーしました'
          window.setTimeout(() => { button.textContent = 'コピー' }, 1400)
        } catch { button.textContent = 'コピーできませんでした' }
      })
    } catch (error) {
      card.querySelector('strong').textContent = '取得できませんでした'
      card.querySelector('p').textContent = error.message || String(error)
    }
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(() => { frame = 0; styles(); enhance() })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
  window.addEventListener('pageshow', schedule)
})()

;(() => {
  if (document.querySelector('script[data-lien-customer-link-v293]')) return
  const customerLink = document.createElement('script')
  customerLink.src = '/customer-link-ui-v293.js?v=293-4'
  customerLink.defer = true
  customerLink.dataset.lienCustomerLinkV293 = '1'
  document.head.appendChild(customerLink)
})()

;(()=>{if(document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=294-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()
