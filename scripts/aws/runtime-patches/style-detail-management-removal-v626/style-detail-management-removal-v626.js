;(() => {
  'use strict'

  if (window.__orimiaStyleDetailManagementRemovalV626) return
  window.__orimiaStyleDetailManagementRemovalV626 = true

  let scanQueued = false

  function isStaffStyleDetail() {
    return /^\/admin\/community\/[^/]+\/?$/.test(location.pathname) &&
      Boolean(document.querySelector('.orimia-style-detail-staff-v602, .orimia-style-details-v602'))
  }

  function removeLegacyManagement() {
    scanQueued = false
    if (!isStaffStyleDetail()) return
    document.querySelectorAll('[aria-label="投稿管理"]').forEach(panel => panel.remove())
  }

  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(removeLegacyManagement)
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  addEventListener('pageshow', scheduleScan)
  addEventListener('popstate', scheduleScan)
  scheduleScan()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
  }
})()
