;(function () {
  'use strict'
  function init() {
    const directory = document.querySelector('[data-directory-ranking="v673"]')
    if (!directory || directory.dataset.filterReady) return
    directory.dataset.filterReady = '1'
    const select = directory.querySelector('#orimia-prefecture-filter')
    const cards = [...directory.querySelectorAll('[data-prefecture]')]
    const count = directory.querySelector('[data-directory-count]')
    const empty = directory.querySelector('[data-directory-empty]')
    const valid = new Set([...select.options].map(option => option.value))
    function filter() {
      let visible = 0
      for (const card of cards) {
        card.hidden = Boolean(select.value && card.dataset.prefecture !== select.value)
        if (!card.hidden) visible++
      }
      count.textContent = visible.toLocaleString('ja-JP') + '店舗'
      empty.hidden = visible > 0
    }
    function readLocation() {
      const value = new URL(location.href).searchParams.get('prefecture') || ''
      select.value = valid.has(value) ? value : ''
      filter()
    }
    select.addEventListener('change', function () {
      filter()
      const url = new URL(location.href)
      if (select.value) url.searchParams.set('prefecture', select.value)
      else url.searchParams.delete('prefecture')
      history.replaceState(history.state, '', url)
    })
    addEventListener('popstate', readLocation)
    for (const img of directory.querySelectorAll('.orimia-store-mark img')) {
      img.addEventListener('error', () => { img.hidden = true })
      if (img.complete && img.naturalWidth === 0) img.hidden = true
    }
    readLocation()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
})()
