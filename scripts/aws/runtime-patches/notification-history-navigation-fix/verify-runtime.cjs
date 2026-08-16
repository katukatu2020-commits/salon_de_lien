const fs = require("node:fs");

const root = process.env.RUNTIME_ROOT || "/app";
const server = fs.readFileSync(`${root}/server.js`, "utf8");
const client = fs.readFileSync(`${root}/commercial-admin-v101.js`, "utf8");
const storeProfile = fs.readFileSync(`${root}/store-profile.js`, "utf8");

const checks = {
  redirectsToHydratableRoute: server.includes("res.setHeader('Location', '/admin/appointments?notificationHistory=1')"),
  requestUrlIsNotMutated: !server.includes("req.url = '/admin/appointments?notificationHistory=1'"),
  usesMatchingClientPath: client.includes("location.pathname === '/admin/appointments'"),
  delaysDomReplacement: client.includes("caNotificationHistoryHydrated")
    && client.includes("window.addEventListener('load', renderAfterHydration, { once: true })")
    && client.includes("}, 1200)"),
  forcesCleanPageNavigation: client.includes("caNotificationHistoryNavigation") && client.includes("window.location.assign(target.href)"),
  preservesHydratedReactTree: client.includes("main.insertAdjacentHTML('beforeend', historyMarkup)")
    && client.includes("main.ca-notification-history-mode > :not([data-ca-notification-history-root])")
    && !client.includes("main.innerHTML = `<section class=\"ca-notification-history\""),
  doesNotCachePatchedRuntime: storeProfile.includes("res.setHeader('Cache-Control', 'private, no-store')"),
};

for (const [name, ok] of Object.entries(checks)) {
  if (!ok) throw new Error(`notification history verification failed: ${name}`);
}

console.log(JSON.stringify({ ok: true, checks }));
