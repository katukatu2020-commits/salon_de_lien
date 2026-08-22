import fs from 'node:fs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const messagesPage = fs.readFileSync('/app/.next/server/app/admin/customers/messages/page.js', 'utf8')
const actionsChunk = fs.readFileSync('/app/.next/server/chunks/9845.js', 'utf8')
const settingsPage = fs.readFileSync('/app/.next/server/app/admin/settings/page.js', 'utf8')
const cancellation = fs.readFileSync('/app/customer-appointment-cancellation-v362.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')

assert(!messagesPage.includes('(["ADMIN"])'), 'customer workspace still contains an owner-only page gate')
assert((messagesPage.match(/\(\["ADMIN","STAFF"\]\)/g) ?? []).length >= 2, 'customer workspace staff gates are missing')
assert(actionsChunk.includes('async function m(e) {\n        let t = await (0, i.Os)(["ADMIN","STAFF"]);'), 'customer broadcast action is still owner-only')
assert(settingsPage.includes('(["ADMIN"])'), 'owner settings page must remain owner-only')
assert(server.includes('backoffice-access-consistency-v379-owner-guard'), 'owner settings graceful redirect is missing')
assert(server.includes("settingsActor.role !== 'ADMIN'"), 'owner role check is missing')
assert(server.includes("/admin/account?notice=owner-required"), 'owner-only guidance destination is missing')
assert(!cancellation.includes('"StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt","updatedAt")'), 'cancellation notification still writes the nonexistent updatedAt column')
assert(cancellation.includes('"StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt")'), 'cancellation notification insert is missing')

new Function(server)
new Function(cancellation)

console.log('backoffice-access-consistency-v379 runtime verification passed')
