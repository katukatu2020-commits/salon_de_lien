  const mountedDialogsV703 = new Set()
  let pendingOpenV703 = 0
  let scanFrameV703 = 0

  function mountEntryV703() {
    const manual = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '新しいメニューを追加' && !button.closest('[role="dialog"]'))
    const heading = [...document.querySelectorAll('h2')].find(node => node.textContent.trim() === '登録済みのメニュー')
    const toolbar = heading?.parentElement?.parentElement
    if (!manual || !toolbar || toolbar.querySelector('[data-hotpepper-menu-entry-v703]')) return
    toolbar.classList.add('hotpepper-menu-toolbar-v703')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lien-button-secondary hotpepper-menu-entry-v703'
    button.dataset.hotpepperMenuEntryV703 = '1'
    button.innerHTML = window.HotpepperMenuIconsV703.Download + '<span>ホットペッパーから読み込む</span>'
    button.addEventListener('click', () => {
      pendingOpenV703 = Date.now() + 5000
      manual.click()
      scheduleScanV703()
    })
    toolbar.insertBefore(button, toolbar.lastElementChild)
  }

  function scan() {
    for (const dialog of mountedDialogsV703) {
      if (!dialog.isConnected) { dialog.__orimiaMenuImportV612?.dispose(); mountedDialogsV703.delete(dialog) }
    }
    if (!isMenuPage()) { pendingOpenV703 = 0; return }
    if (document.querySelector('script[src*="/_next/static/chunks/main-app-"]') && !window.__orimiaHydratedV680) return
    mountEntryV703()
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      if (!isMenuDialog(dialog)) return
      mount(dialog)
      if (!dialog.__orimiaMenuImportV612) return
      mountedDialogsV703.add(dialog)
      if (pendingOpenV703 > Date.now()) {
        pendingOpenV703 = 0
        const mode = dialog.querySelector('[data-menu-import-mode-v612]')
        if (mode && !mode.checked) { mode.checked = true; mode.dispatchEvent(new Event('change', { bubbles: true })) }
      }
    })
  }

  function scheduleScanV703() {
    if (scanFrameV703) return
    scanFrameV703 = requestAnimationFrame(() => { scanFrameV703 = 0; scan() })
  }

  new MutationObserver(scheduleScanV703).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', scheduleScanV703)
  scheduleScanV703()
