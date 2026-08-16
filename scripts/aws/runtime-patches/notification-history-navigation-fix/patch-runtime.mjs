import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const serverPath = path.join(root, "server.js");
const clientPath = path.join(root, "commercial-admin-v101.js");
const storeProfilePath = path.join(root, "store-profile.js");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: patch anchor was not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: patch anchor is not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let server = fs.readFileSync(serverPath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let storeProfile = fs.readFileSync(storeProfilePath, "utf8");

server = replaceOnce(
  server,
  `      if (url.pathname === '/admin/notifications') {
        const session = await chatSession(req, 'staff')
        if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        req.url = '/admin/appointments?notificationHistory=1'
        return tenantSetup.renderNext(req, res, new URL(req.url, 'http://localhost'), handle)
      }
`,
  `      if (url.pathname === '/admin/notifications') {
        const session = await chatSession(req, 'staff')
        if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        res.statusCode = 302
        res.setHeader('Location', '/admin/appointments?notificationHistory=1')
        res.setHeader('Cache-Control', 'no-store')
        return res.end()
      }
`,
  "notification history redirect"
);

client = replaceOnce(
  client,
  `  function enhanceNotificationHistoryPage() {
    if (location.pathname !== '/admin/notifications') return
`,
  `  function isNotificationHistoryPage() {
    return location.pathname === '/admin/appointments'
      && new URLSearchParams(location.search).get('notificationHistory') === '1'
  }

  function enableNotificationHistoryHardNavigation() {
    if (document.documentElement.dataset.caNotificationHistoryNavigation === '1') return
    document.documentElement.dataset.caNotificationHistoryNavigation = '1'
    document.addEventListener('click', event => {
      if (!isNotificationHistoryPage() || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const target = new URL(anchor.href, location.href)
      if (target.origin !== location.origin || target.href === location.href) return
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(target.href)
    }, true)
  }

  function enhanceNotificationHistoryPage() {
    if (!isNotificationHistoryPage()) return
    enableNotificationHistoryHardNavigation()
    const documentRoot = document.documentElement
    if (documentRoot.dataset.caNotificationHistoryHydrated !== '1') {
      if (documentRoot.dataset.caNotificationHistoryPending === '1') return
      documentRoot.dataset.caNotificationHistoryPending = '1'
      const renderAfterHydration = () => window.setTimeout(() => {
          documentRoot.dataset.caNotificationHistoryHydrated = '1'
          delete documentRoot.dataset.caNotificationHistoryPending
          enhanceNotificationHistoryPage()
        }, 1200)
      if (document.readyState === 'complete') renderAfterHydration()
      else window.addEventListener('load', renderAfterHydration, { once: true })
      return
    }
`,
  "notification history hydrated navigation"
);

client = replaceOnce(
  client,
  "      .ca-notification-history{max-width:1180px;margin:0 auto;padding:6px 0 44px;color:var(--ca-ink,#2f2a25)}",
  "      main.ca-notification-history-mode > :not([data-ca-notification-history-root]){display:none!important}\n      .ca-notification-history{max-width:1180px;margin:0 auto;padding:6px 0 44px;color:var(--ca-ink,#2f2a25)}",
  "non-destructive notification history styles"
);

client = replaceOnce(
  client,
  "    main.innerHTML = `<section class=\"ca-notification-history\" data-ca-notification-history-root>",
  "    main.classList.add('ca-notification-history-mode')\n    const historyMarkup = `<section class=\"ca-notification-history\" data-ca-notification-history-root>",
  "non-destructive notification history render"
);

client = replaceOnce(
  client,
  "</div></div></section>`\n    fetch('/api/lien-staff-notifications?history=1&read=1'",
  "</div></div></section>`\n    main.insertAdjacentHTML('beforeend', historyMarkup)\n    fetch('/api/lien-staff-notifications?history=1&read=1'",
  "append notification history after hydration"
);

storeProfile = replaceOnce(
  storeProfile,
  "res.setHeader('Cache-Control', 'public, max-age=300')",
  "res.setHeader('Cache-Control', 'private, no-store')",
  "commercial admin cache policy"
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(clientPath, client, "utf8");
fs.writeFileSync(storeProfilePath, storeProfile, "utf8");
console.log(JSON.stringify({ patched: true, serverPath, clientPath, storeProfilePath }));
