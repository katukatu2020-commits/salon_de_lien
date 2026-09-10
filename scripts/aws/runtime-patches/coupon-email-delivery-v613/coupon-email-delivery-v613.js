(() => {
  const init = () => {
    const deliveryInputs = [...document.querySelectorAll('input[name="deliveryMethod"]')]
    const form = deliveryInputs[0]?.closest('form')
    const summary = document.getElementById('broadcast-email-eligibility-v613')
    if (!form || !summary || form.dataset.couponEmailV613 === 'ready') return

    form.dataset.couponEmailV613 = 'ready'
    const eligible = Number(summary.dataset.emailEligibleCount || 0)
    const unregistered = Number(summary.dataset.emailUnregisteredCount || 0)
    const rows = [...form.querySelectorAll('.broadcast-recipient-row[data-recipient-email]')]

    const sync = () => {
      const emailMode = form.querySelector('input[name="deliveryMethod"]:checked')?.value === 'email'
      let selectionChanged = false

      for (const row of rows) {
        const input = row.querySelector('input[name="targetCustomerId"]')
        if (!input) continue
        const disabled = emailMode && row.dataset.recipientEmail !== '1'
        if (disabled && input.checked) {
          input.checked = false
          selectionChanged = true
        }
        input.disabled = disabled
        row.dataset.emailDisabled = disabled ? 'true' : 'false'
        row.setAttribute('aria-disabled', disabled ? 'true' : 'false')
      }

      summary.dataset.emailMode = emailMode ? 'true' : 'false'
      summary.textContent = emailMode
        ? `登録メールがある${eligible.toLocaleString('ja-JP')}名が配信対象です。未登録の${unregistered.toLocaleString('ja-JP')}名は自動で除外します。`
        : `アプリ内配信は登録顧客${(eligible + unregistered).toLocaleString('ja-JP')}名が対象です。`

      if (selectionChanged) {
        rows[0]?.querySelector('input[name="targetCustomerId"]')?.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    for (const input of deliveryInputs) input.addEventListener('change', sync)
    sync()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
  window.addEventListener('pageshow', init)
})()
