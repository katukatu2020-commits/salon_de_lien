import fs from 'node:fs'

const root = process.argv[2] || '/app'
const file = `${root}/customer-experience-v278.js`
let source = fs.readFileSync(file, 'utf8')

const marker = 'cxMobileStoreIcon'
if (source.includes(marker)) {
  console.log('Customer mobile header patch is already applied.')
  process.exit(0)
}

function replaceOnce(needle, replacement, label) {
  const first = source.indexOf(needle)
  if (first < 0) throw new Error(`Missing patch target: ${label}`)
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Ambiguous patch target: ${label}`)
  source = source.slice(0, first) + replacement + source.slice(first + needle.length)
}

const mobileHeader = String.raw`
  function ensureMobileCustomerStoreIcon() {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    document.querySelectorAll('header [aria-label="メニューを開く"]').forEach(control => {
      if (!(control instanceof HTMLElement) || control.dataset.cxMobileStoreIcon === '1') return
      control.dataset.cxMobileStoreIcon = '1'
      control.setAttribute('aria-label', 'ホーム')
      control.classList.add('customer-store-icon')
      control.innerHTML = '<img src="/api/lien-store-icon" alt="" onerror="this.onerror=null;this.src=\'/brand/salon-customer-service-mark.svg\'">'
      if (control instanceof HTMLAnchorElement) {
        control.href = '/u/home'
        return
      }
      control.addEventListener('click', event => {
        event.preventDefault()
        event.stopImmediatePropagation()
        location.assign('/u/home')
      }, true)
    })
  }
`

replaceOnce(
  '  function boot() {\n    applyCustomerConsistency()',
  `${mobileHeader}\n  function boot() {\n    applyCustomerConsistency()\n    ensureMobileCustomerStoreIcon()`,
  'customer boot',
)

replaceOnce(
  "new MutationObserver(() => { applyCustomerConsistency(); replaceNewsLinks(); applyCommunityNickname() })",
  "new MutationObserver(() => { applyCustomerConsistency(); ensureMobileCustomerStoreIcon(); replaceNewsLinks(); applyCommunityNickname() })",
  'customer mutation observer',
)

fs.writeFileSync(file, source, 'utf8')
console.log('Patched customer mobile header icon.')
