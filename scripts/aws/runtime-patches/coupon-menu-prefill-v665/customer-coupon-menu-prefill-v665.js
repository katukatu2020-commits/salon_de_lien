;(function initializeCouponMenuPrefill(root) {
  'use strict'

  const RELEASE = 'coupon-menu-prefill-v665'
  const UNIVERSAL_TARGETS = new Set(['全メニュー', 'すべて', '全施術', '全コース', 'allmenus', 'all'])
  const COMBINATION_WORDS = ['カット', 'カラー', 'パーマ', 'スパ', 'トリートメント', '縮毛', 'ストレート', '眉', 'ヘアセット', 'ケア']

  function normalizeMenuName(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/^\s*(?:(?:no\.?\s*)\d+\s*[.．:：、-]?\s*|\d+\s*[.．:：、-]\s*)/i, '')
      .toLowerCase()
      .replace(/[\s　・･＋+／/（）()［］\[\]【】]/g, '')
  }

  function menuNameFromOption(option) {
    const text = String(option?.textContent || option?.label || '').trim()
    const structured = text.match(/^(.*)（\d+分・目安\s*[\d,]+円）$/)
    if (structured) return structured[1].trim()
    return text.replace(/\s+\d+分\s*[/／]\s*[\d,]+\s*円.*$/, '').trim()
  }

  function scoreMenuTarget(target, menuName, exactOnly) {
    const wanted = normalizeMenuName(target)
    const candidate = normalizeMenuName(menuName)
    if (!wanted || !candidate || UNIVERSAL_TARGETS.has(wanted)) return null
    if (candidate === wanted) return 0
    if (exactOnly) return null
    const difference = Math.abs(candidate.length - wanted.length)
    let extra = candidate
    if (candidate.startsWith(wanted)) extra = candidate.slice(wanted.length)
    else if (candidate.endsWith(wanted)) extra = candidate.slice(0, -wanted.length)
    const combinationPenalty = COMBINATION_WORDS
      .filter(word => !wanted.includes(word) && extra.includes(word))
      .length * 250
    if (candidate.startsWith(wanted)) return 100 + difference + combinationPenalty
    if (wanted.startsWith(candidate)) return 200 + difference + combinationPenalty
    if (candidate.endsWith(wanted)) return 300 + difference + combinationPenalty
    if (candidate.includes(wanted) || wanted.includes(candidate)) return 400 + difference + combinationPenalty
    return null
  }

  function chooseCouponMenuOption(coupon, options) {
    const targets = Array.isArray(coupon?.targetMenus)
      ? coupon.targetMenus.map(value => String(value || '').trim()).filter(Boolean)
      : []
    const available = Array.from(options || [])
      .map((option, index) => ({ option, index, name: menuNameFromOption(option) }))
      .filter(item => !item.option.disabled && String(item.option.value || '').trim() && item.name)
    const exactOnly = coupon?.benefitKind === 'STAMP_MENU_FREE'

    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      const target = targets[targetIndex]
      const matches = available
        .map(item => ({ ...item, score: scoreMenuTarget(target, item.name, exactOnly) }))
        .filter(item => item.score !== null)
        .sort((left, right) => left.score - right.score || left.index - right.index)
      if (matches.length) return { ...matches[0], target, targetIndex }
    }
    return null
  }

  const tools = { normalizeMenuName, menuNameFromOption, scoreMenuTarget, chooseCouponMenuOption }
  if (typeof module !== 'undefined' && module.exports) module.exports = tools
  if (!root?.document) return
  root.__lienCouponMenuPrefillToolsV665 = tools
  if (root.__lienCouponMenuPrefillV665) return
  root.__lienCouponMenuPrefillV665 = true

  const state = {
    routeKey: '',
    couponId: '',
    coupon: null,
    loaded: false,
    loading: false,
    completed: false,
    advanceScheduled: false,
  }
  let queued = false

  function stage(value) {
    root.document.documentElement.dataset.lienCouponMenuPrefillV665 = value
  }

  function requestedCouponId() {
    if (root.location.pathname !== '/u/appointments') return ''
    return new URLSearchParams(root.location.search).get('coupon') || ''
  }

  function syncRoute() {
    const couponId = requestedCouponId()
    const routeKey = root.location.pathname + '?' + couponId
    if (routeKey !== state.routeKey) {
      state.routeKey = routeKey
      state.couponId = couponId
      state.coupon = null
      state.loaded = false
      state.loading = false
      state.completed = false
      state.advanceScheduled = false
      if (couponId) stage('loading')
      else delete root.document.documentElement.dataset.lienCouponMenuPrefillV665
    }
    return couponId
  }

  async function loadCoupon() {
    const couponId = syncRoute()
    if (!couponId || state.loading || state.loaded) return
    state.loading = true
    const requestId = couponId
    try {
      const response = await root.fetch('/api/lien-customer-booking-context?coupon=' + encodeURIComponent(couponId), {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'クーポンを確認できませんでした。')
      if (requestedCouponId() !== requestId) return
      const coupon = payload?.coupon
      state.coupon = coupon?.id === requestId && !coupon.appointmentId ? coupon : null
      state.loaded = true
      stage(state.coupon ? 'ready' : 'unavailable')
    } catch (error) {
      if (requestedCouponId() !== requestId) return
      state.coupon = null
      state.loaded = true
      stage('error')
      console.error('[' + RELEASE + ']', error)
    } finally {
      if (requestedCouponId() === requestId) state.loading = false
      queue()
    }
  }

  function bookingMenuSelect() {
    return root.document.querySelector('select.cx-menu-native-select-v508')
      || Array.from(root.document.querySelectorAll('select')).find(element => (
        Array.from(element.options || []).some(option => /分.*円/.test(String(option.textContent || '')))
      ))
      || null
  }

  function setNativeMenu(select, value) {
    if (select.value === value) return
    const setter = Object.getOwnPropertyDescriptor(root.HTMLSelectElement.prototype, 'value')?.set
    if (setter) setter.call(select, value)
    else select.value = value
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function completeOnStaffStep(selection) {
    const main = root.document.querySelector('main.cj-main[data-cj-step]')
    const currentSelect = bookingMenuSelect()
    if (!main || !currentSelect || currentSelect.value !== selection.option.value) return false
    if (main.dataset.cjStep === '2') {
      state.completed = true
      stage('complete')
      root.dispatchEvent(new CustomEvent('lien:coupon-menu-prefilled', {
        detail: { couponId: state.couponId, menuValue: selection.option.value, menuName: selection.name },
      }))
      return true
    }
    return false
  }

  function prepareCouponMenu() {
    if (!state.loaded || !state.coupon || state.completed || state.advanceScheduled) return
    const select = bookingMenuSelect()
    if (!select || !select.options?.length) return
    const selection = chooseCouponMenuOption(state.coupon, select.options)
    if (!selection) {
      stage('no-matching-menu')
      return
    }

    root.__lienSelectedCouponV366 = state.coupon
    setNativeMenu(select, selection.option.value)

    const radio = Array.from(root.document.querySelectorAll('input[data-cj-menu]'))
      .find(input => input.value === selection.option.value)
    if (!radio) {
      stage('menu-selected')
      return
    }
    if (!radio.checked) {
      radio.checked = true
      radio.dispatchEvent(new Event('change', { bubbles: true }))
    }

    if (completeOnStaffStep(selection)) return
    const main = root.document.querySelector('main.cj-main[data-cj-step]')
    const next = root.document.querySelector('.cj-booking-footer [data-cj-next]')
    if (!main || main.dataset.cjStep !== '1' || !next || next.disabled) return

    state.advanceScheduled = true
    root.requestAnimationFrame(() => root.requestAnimationFrame(() => {
      state.advanceScheduled = false
      const latestSelect = bookingMenuSelect()
      const latestMain = root.document.querySelector('main.cj-main[data-cj-step]')
      const latestNext = root.document.querySelector('.cj-booking-footer [data-cj-next]')
      if (!latestSelect || latestSelect.value !== selection.option.value || !latestMain || latestMain.dataset.cjStep !== '1' || !latestNext || latestNext.disabled) {
        queue()
        return
      }
      latestNext.click()
      if (!completeOnStaffStep(selection)) queue()
    }))
  }

  function run() {
    const couponId = syncRoute()
    if (!couponId) return
    if (!state.loaded) {
      void loadCoupon()
      return
    }
    prepareCouponMenu()
  }

  function queue() {
    if (queued) return
    queued = true
    root.requestAnimationFrame(() => {
      queued = false
      run()
    })
  }

  function start() {
    run()
    new MutationObserver(queue).observe(root.document.documentElement, { childList: true, subtree: true })
    root.addEventListener('popstate', queue)
    root.addEventListener('pageshow', queue)
  }

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})(typeof window === 'undefined' ? null : window)
