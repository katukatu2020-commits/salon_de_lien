  function initStorePage() {
    if (location.pathname !== '/u/stores' || document.documentElement.dataset.lienStoresV670) return
    const directory = document.querySelector('[data-orimia-store-directory="v670"]')
    const output = document.querySelector('#orimia-store-result')
    if (!directory || !output) return
    document.documentElement.dataset.lienStoresV670 = '1'
    directory.querySelectorAll('[data-select-orimia-store]').forEach(button => button.addEventListener('click', async () => {
      const buttons = [...directory.querySelectorAll('[data-select-orimia-store]')]
      buttons.forEach(item => { item.disabled = true })
      const original = button.textContent
      button.textContent = '切り替えています…'
      output.textContent = ''
      try {
        const result = await requestJson('/api/lien-customer-stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'switch', organizationId: button.dataset.selectOrimiaStore }),
        })
        location.assign(result.redirect || '/u/home')
      } catch (error) {
        buttons.forEach(item => { item.disabled = false })
        button.textContent = original
        output.textContent = error.message
        output.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }))
  }

  function initStoreSettingsQr() {
    document.querySelectorAll('.lien-store-qr-card').forEach(card => card.remove())
  }
