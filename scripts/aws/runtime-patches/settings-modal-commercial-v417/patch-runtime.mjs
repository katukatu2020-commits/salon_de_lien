import fs from 'node:fs'

const commercialPath = '/app/commercial-admin-v101.js'
const customerLinkPath = '/app/customer-link-ui-v293.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let commercial = fs.readFileSync(commercialPath, 'utf8')
let customerLink = fs.readFileSync(customerLinkPath, 'utf8')

customerLink = replaceOnce(
  customerLink,
  `  function initStoreSettingsQr() {\n    if (location.pathname !== '/admin/settings' || document.querySelector('.lien-store-qr-card')) return`,
  `  function initStoreSettingsQr() {\n    const embeddedSettings = new URLSearchParams(location.search).get('embedded') === '1'\n    if (location.pathname !== '/admin/settings' || embeddedSettings || document.querySelector('.lien-store-qr-card')) return`,
  'embedded store QR guard',
)

commercial = replaceOnce(
  commercial,
  `/customer-link-ui-v293.js?v=293-4`,
  `/customer-link-ui-v293.js?v=417`,
  'customer link cache bust',
)

const modalStyles = `
      .ca-settings-dialog{width:min(900px,100%);height:min(760px,calc(100dvh - 36px));border-radius:24px}
      .ca-settings-dialog .ca-dialog-head{height:76px;padding:17px 20px}.ca-settings-dialog .ca-dialog-head h2{font-size:16px}.ca-settings-dialog .ca-dialog-head p{margin-top:4px;font-size:10px;line-height:1.6}
      .ca-settings-frame-wrap{height:calc(100% - 76px)}
      .ca-settings-embedded .admin-main-content{padding:22px 22px calc(28px + env(safe-area-inset-bottom))!important}
      .ca-settings-embedded .admin-main-content>div{width:min(720px,100%)!important;max-width:720px!important;margin-inline:auto!important}
      .ca-settings-embedded [data-sm-store-code],.ca-settings-embedded [data-store-code],.ca-settings-embedded [data-organization-code],.ca-settings-embedded .lien-store-qr-card,.ca-settings-embedded [data-ca-embedded-identity]{display:none!important}
      .ca-settings-embedded [data-ca-embedded-settings-form]{display:grid!important;width:100%!important;max-width:720px!important;gap:16px!important;margin-inline:auto!important}
      .ca-settings-embedded [data-ca-embedded-allowed]{width:100%!important;max-width:720px!important;margin:0!important;border-color:#eadbd3!important;border-radius:20px!important;background:linear-gradient(145deg,#fff,#fffdfb)!important;box-shadow:0 12px 32px rgba(70,43,34,.07)!important}
      .ca-settings-embedded [data-ca-embedded-save]{position:sticky!important;z-index:5!important;bottom:0!important;display:flex!important;width:100%!important;max-width:720px!important;align-items:center!important;justify-content:flex-end!important;margin:0!important;border:1px solid #ead9d1!important;border-radius:18px!important;background:rgba(255,253,251,.94)!important;padding:11px 12px!important;box-shadow:0 12px 34px rgba(70,43,34,.10)!important;backdrop-filter:blur(12px)!important}
      .ca-settings-embedded .ca-embedded-save-button{display:inline-flex!important;min-width:190px!important;min-height:46px!important;align-items:center!important;justify-content:center!important;gap:8px!important;border:1px solid #9c4f43!important;border-radius:999px!important;background:#9c4f43!important;padding:0 22px!important;color:#fff!important;font-size:11px!important;font-weight:900!important;line-height:1!important;box-shadow:0 9px 22px rgba(111,53,43,.20)!important;cursor:pointer!important;transition:transform .16s ease,background .16s ease,box-shadow .16s ease!important}
      .ca-settings-embedded .ca-embedded-save-button:hover{background:#874238!important;transform:translateY(-1px)!important;box-shadow:0 12px 26px rgba(111,53,43,.24)!important}.ca-settings-embedded .ca-embedded-save-button:focus-visible{outline:3px solid rgba(156,79,67,.25)!important;outline-offset:3px!important}.ca-settings-embedded .ca-embedded-save-button:disabled{cursor:wait!important;opacity:.72!important;transform:none!important}.ca-settings-embedded .ca-embedded-save-button svg{width:16px!important;height:16px!important;flex:0 0 16px!important}
      @media(max-width:680px){.ca-settings-dialog{height:96dvh;border-radius:22px 22px 0 0}.ca-settings-dialog .ca-dialog-head{height:70px;padding:15px 16px}.ca-settings-frame-wrap{height:calc(100% - 70px)}.ca-settings-embedded .admin-main-content{padding:14px 14px calc(22px + env(safe-area-inset-bottom))!important}.ca-settings-embedded [data-ca-embedded-save]{padding:9px!important}.ca-settings-embedded .ca-embedded-save-button{width:100%!important;min-width:0!important}}
    `

commercial = replaceOnce(
  commercial,
  `    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
  `    style.textContent += ${JSON.stringify(modalStyles)}\n    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
  'settings modal commercial styles',
)

const embeddedEnhancement = `    document.documentElement.classList.add('ca-settings-panel-' + panelKey)
    document.body.classList.add('ca-settings-panel-' + panelKey)
    main.querySelectorAll('[data-sm-store-code],[data-store-code],[data-organization-code],.lien-store-qr-card').forEach(node => {
      node.dataset.caEmbeddedIdentity = '1'
      node.hidden = true
      node.style.setProperty('display', 'none', 'important')
    })
    const settingsForm = main.querySelector('input[name="taxRate"]')?.closest('form') || main.querySelector('input[name^="stockQuantity:"]')?.closest('form')
    const saveButton = settingsForm?.querySelector('button[type="submit"]')
    const saveBar = saveButton?.parentElement
    if (settingsForm) settingsForm.dataset.caEmbeddedSettingsForm = '1'
    if (saveBar) saveBar.dataset.caEmbeddedSave = '1'
    if (saveButton) {
      saveButton.classList.add('ca-embedded-save-button')
      saveButton.innerHTML = icon('check') + '\\u5909\\u66f4\\u3092\\u4fdd\\u5b58'
      if (!saveButton.dataset.caEmbeddedBound) {
        saveButton.dataset.caEmbeddedBound = '1'
        settingsForm.addEventListener('submit', () => {
          saveButton.disabled = true
          saveButton.innerHTML = icon('settings') + '\\u4fdd\\u5b58\\u3057\\u3066\\u3044\\u307e\\u3059\\u2026'
        })
      }
    }
`

commercial = replaceOnce(
  commercial,
  `    document.documentElement.classList.add('ca-settings-ready')`,
  `${embeddedEnhancement}    document.documentElement.classList.add('ca-settings-ready')`,
  'embedded settings controls',
)

commercial = replaceOnce(
  commercial,
  `    frame.addEventListener('load', reveal)`,
  `    frame.addEventListener('load', () => {
      try {
        const frameUrl = new URL(frame.contentWindow.location.href)
        if (frameUrl.pathname === '/admin/settings' && frameUrl.searchParams.get('notice') === 'saved') {
          closeSettingsDialog(root)
          toast('\\u8a2d\\u5b9a\\u3092\\u4fdd\\u5b58\\u3057\\u307e\\u3057\\u305f\\u3002', 'success')
          return
        }
      } catch {}
      reveal()
    })`,
  'settings saved feedback',
)

fs.writeFileSync(commercialPath, commercial)
fs.writeFileSync(customerLinkPath, customerLink)

console.log('settings modal commercial v417 runtime patched')
