(function () {
  'use strict'
  if (!document.body.classList.contains('wo-dealer-body')) return
  const icons = /* ICONS */ {}
  const selector = 'select[data-dealer-salon-picker]'
  const controls = new Map()
  const pageSize = 50
  let active = null, serial = 0, queued = false
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  const disabled = option => option.disabled || option.parentElement?.disabled
  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }
  function iconButton(icon, label) {
    const button = element('button', 'dsp-icon')
    button.type = 'button'; button.title = label; button.setAttribute('aria-label', label)
    button.innerHTML = icons[icon]
    return button
  }
  function optionInfo(option) {
    return { option, name: option.dataset.salonName || option.text, code: option.dataset.salonCode || '', disabled: disabled(option) }
  }
  function available(control) {
    return control.select.isConnected && !control.select.matches(':disabled') && (!control.parentDialog || control.parentDialog.open)
  }
  function sync(control) {
    const {select, trigger, caption, error} = control
    const selected = select.selectedOptions[0]
    const label = selected ? optionInfo(selected).name : '美容室を選択'
    if (caption.textContent !== label) caption.textContent = label
    trigger.disabled = select.matches(':disabled')
    const ariaLabel = select.dataset.dealerSalonPicker + ': ' + label
    if (trigger.getAttribute('aria-label') !== ariaLabel) trigger.setAttribute('aria-label', ariaLabel)
    if (trigger.title !== label) trigger.title = label
    if (select.validity.valid) { trigger.removeAttribute('aria-invalid'); error.hidden = true }
  }
  function close() {
    if (active) active.dialog.close()
  }
  function choose(option) {
    if (!active) return
    const control = active.control, select = control.select
    if (!available(control) || !select.contains(option) || disabled(option)) { close(); return }
    const changed = select.selectedIndex !== option.index
    select.selectedIndex = option.index
    sync(control)
    close()
    if (changed) {
      // Keep form dirty tracking, invoice due dates and existing delegated filters intact.
      select.dispatchEvent(new Event('input', {bubbles:true}))
      select.dispatchEvent(new Event('change', {bubbles:true}))
    }
  }
  function row(info) {
    const button = element('button', 'dsp-row')
    button.type = 'button'; button.disabled = info.disabled
    const text = element('span', 'dsp-row-text')
    text.append(element('span', 'dsp-name', info.name))
    if (info.code) text.append(element('span', 'dsp-code', info.code))
    button.append(text)
    if (info.option.selected) {
      button.setAttribute('aria-current', 'true')
      const current = element('span', 'dsp-current', '選択中')
      current.insertAdjacentHTML('afterbegin', icons.Check)
      button.append(current)
    }
    button.addEventListener('click', () => choose(info.option))
    return button
  }
  function renderResults() {
    if (!active) return
    const {search, list, count, pager, previous, next, pageLabel, clear, control, emptyChoice} = active
    const tokens = normalize(search.value).trim().split(/\s+/).filter(Boolean)
    const options = Array.from(control.select.options).filter(o => !o.hidden).map(optionInfo)
    const results = options.filter(info => info.option.value !== '' && tokens.every(token => normalize(info.name + ' ' + info.code).replace(/\s+/g, '').includes(token)))
    const pages = Math.max(1, Math.ceil(results.length / pageSize))
    active.page = Math.min(active.page, pages)
    emptyChoice.replaceChildren()
    const empty = options.find(info => info.option.value === '' && !info.disabled)
    if (empty) emptyChoice.append(row(empty))
    emptyChoice.hidden = !empty
    list.replaceChildren()
    for (const info of results.slice((active.page - 1) * pageSize, active.page * pageSize)) {
      const item = element('li'); item.append(row(info)); list.append(item)
    }
    if (!results.length) list.append(element('li', 'dsp-empty', tokens.length ? '条件に一致する美容室はありません。' : '選択できる美容室はありません。'))
    count.textContent = results.length.toLocaleString('ja-JP') + '件'
    pageLabel.textContent = active.page + ' / ' + pages
    previous.disabled = active.page === 1; next.disabled = active.page === pages
    pager.hidden = pages === 1; clear.hidden = !search.value
    list.scrollTop = 0
  }
  function open(control) {
    if (!available(control) || active) return
    sync(control)
    const dialog = element('dialog', 'dsp-dialog')
    dialog.id = control.dialogId
    dialog.setAttribute('aria-labelledby', dialog.id + '-title')
    const header = element('header', 'dsp-header')
    const title = element('h2', '', '契約美容室を選択'); title.id = dialog.id + '-title'
    const dismiss = iconButton('X', '閉じる')
    header.append(title, dismiss)
    const searchBar = element('div', 'dsp-search')
    const search = element('input'); search.type = 'search'; search.autocomplete = 'off'
    search.placeholder = '美容室名・店舗コードで検索'; search.setAttribute('aria-label', search.placeholder)
    search.setAttribute('enterkeyhint', 'search')
    const clear = iconButton('X', '検索をクリア')
    searchBar.insertAdjacentHTML('afterbegin', icons.Search); searchBar.append(search, clear)
    const count = element('p', 'dsp-count'); count.setAttribute('role', 'status')
    const emptyChoice = element('div', 'dsp-empty-choice')
    const list = element('ul', 'dsp-results'); list.setAttribute('aria-label', '美容室の検索結果')
    const pager = element('nav', 'dsp-pager'); pager.setAttribute('aria-label', '検索結果のページ')
    const previous = iconButton('ChevronLeft', '前のページ'), next = iconButton('ChevronRight', '次のページ'), pageLabel = element('span')
    pager.append(previous, pageLabel, next)
    dialog.append(header, searchBar, count, emptyChoice, list, pager)
    active = {control, dialog, search, list, count, pager, previous, next, pageLabel, clear, emptyChoice, page:1}
    // Keep the popup in the same modal subtree so an underlying form remains open.
    ;(control.parentDialog || document.body).append(dialog)
    control.trigger.setAttribute('aria-expanded', 'true')
    dialog.addEventListener('close', () => {
      if (active?.dialog === dialog) active = null
      dialog.remove(); control.trigger.setAttribute('aria-expanded', 'false')
      if (available(control)) control.trigger.focus({preventScroll:true})
    }, {once:true})
    dismiss.addEventListener('click', close)
    search.addEventListener('input', e => { if (!e.isComposing) { active.page = 1; renderResults() } })
    search.addEventListener('compositionend', () => { if (active) { active.page = 1; renderResults() } })
    clear.addEventListener('click', () => { search.value = ''; active.page = 1; renderResults(); search.focus() })
    previous.addEventListener('click', () => { active.page--; renderResults(); (previous.disabled ? next : previous).focus() })
    next.addEventListener('click', () => { active.page++; renderResults(); (next.disabled ? previous : next).focus() })
    dialog.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) { if (e.key === 'Enter') e.preventDefault(); return }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
      if (e.key === 'Tab') {
        const stops = Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)')).filter(node => node.getClientRects().length)
        if (e.shiftKey && e.target === stops[0]) { e.preventDefault(); stops.at(-1)?.focus() }
        else if (!e.shiftKey && e.target === stops.at(-1)) { e.preventDefault(); stops[0]?.focus() }
      }
      const rows = Array.from(list.querySelectorAll('button:not(:disabled)'))
      if (['ArrowDown', 'ArrowUp'].includes(e.key) && (e.target === search || rows.includes(e.target))) {
        e.preventDefault()
        const index = rows.indexOf(e.target), step = e.key === 'ArrowDown' ? 1 : -1
        rows[index < 0 ? (step > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, index + step))]?.focus()
      } else if (e.key === 'Enter' && e.target === search) {
        e.preventDefault(); rows[0]?.focus()
      }
      // A key in this dialog must never submit or close the underlying editor.
      e.stopPropagation()
    })
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect()
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close()
      }
      e.stopPropagation()
    })
    dialog.addEventListener('cancel', e => e.stopPropagation())
    renderResults(); dialog.showModal(); search.focus()
  }
  function enhance(select) {
    const trigger = element('button', 'dsp-trigger'), caption = element('span', 'dsp-caption')
    trigger.type = 'button'; trigger.append(caption); trigger.insertAdjacentHTML('beforeend', icons.Search)
    const dialogId = 'dealer-salon-picker-' + (++serial)
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', dialogId)
    const error = element('small', 'dsp-error', '美容室を選択してください。')
    error.id = dialogId + '-error'; error.hidden = true; trigger.setAttribute('aria-describedby', error.id)
    const control = {select, trigger, caption, error, dialogId, parentDialog:select.closest('dialog'), signature:''}
    controls.set(select, control)
    select.before(trigger); select.after(error)
    // Preserve the native value and form submission contract, with an accessible visible control.
    select.classList.add('dsp-native'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true')
    trigger.addEventListener('click', () => open(control))
    select.addEventListener('focus', () => trigger.focus())
    select.addEventListener('change', () => sync(control))
    select.addEventListener('invalid', e => {
      e.preventDefault(); error.hidden = false; trigger.setAttribute('aria-invalid', 'true'); trigger.focus()
    })
    sync(control)
  }
  function scan() {
    queued = false
    document.querySelectorAll(selector).forEach(select => { if (!controls.has(select)) enhance(select) })
    for (const [select, control] of controls) {
      if (!select.isConnected) { control.trigger.remove(); control.error.remove(); controls.delete(select) }
      else {
        sync(control)
        const signature = JSON.stringify(Array.from(select.options).map(o => [o.value, o.text, o.selected, o.disabled, o.parentElement?.disabled, o.hidden, o.dataset.salonName, o.dataset.salonCode]))
        if (signature !== control.signature) { control.signature = signature; if (active?.control === control) renderResults() }
      }
    }
    if (active && !available(active.control)) close()
  }
  const observer = new MutationObserver(records => {
    if (queued || !records.some(r => !r.target.closest?.('.dsp-dialog,.dsp-trigger,.dsp-error'))) return
    queued = true; queueMicrotask(scan)
  })
  observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['disabled','selected','value','label','hidden','open','data-salon-name','data-salon-code']})
  document.addEventListener('reset', () => setTimeout(scan, 0), true)
  scan()
})()
