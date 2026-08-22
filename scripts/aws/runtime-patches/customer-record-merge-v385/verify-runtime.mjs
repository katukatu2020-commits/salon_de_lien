import fs from 'node:fs'

const server = fs.readFileSync('/app/server.js', 'utf8')
const service = fs.readFileSync('/app/customer-merge-v385.js', 'utf8')
const client = fs.readFileSync('/app/customer-merge-client-v385.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

for (const marker of [
  `createCustomerMergeService`,
  `await customerMerge.ensureSchema()`,
  `await customerMerge.handle(req, res, url)`,
]) if (!server.includes(marker)) throw new Error(`server marker missing: ${marker}`)

for (const marker of [
  `CustomerMergeHistory`,
  `FOR UPDATE`,
  `sourceCustomerId`,
  `targetCustomerId`,
  `CustomerPointAccount`,
  `PointTransaction`,
  `CustomerBroadcastRecipientDuplicates`,
  `AutomatedCouponGrantDuplicates`,
  `ChatMessage`,
  `storeHiddenAt`,
  `sameOrigin(req)`,
  `confirmationName`,
]) if (!service.includes(marker)) throw new Error(`service marker missing: ${marker}`)

for (const marker of [
  `顧客カルテを統合`,
  `現在のカルテを残し`,
  `data-lcm-confirm-name`,
  `sourceCustomerId`,
  `confirmationName`,
  `この操作は取り消せません`,
]) if (!client.includes(marker)) throw new Error(`client marker missing: ${marker}`)

if (!tenantClient.includes('customer-record-merge-v385-loader')) throw new Error('customer merge loader missing')
if (!tenantClient.includes(`/customer-merge-v385.js?v=385`)) throw new Error('customer merge client URL missing')

new Function(service)
new Function(client)
new Function(tenantClient)
console.log('customer record merge v385 verified')
