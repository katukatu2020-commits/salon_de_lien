import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const links = fs.readFileSync(`${root}/customer-links-v293.js`, 'utf8')
const ui = fs.readFileSync(`${root}/customer-link-ui-v424.js`, 'utf8')

const assertions = [
  [links.includes('customer-code-link-v474'), 'backend marker is present'],
  [links.includes('SELECT 1 FROM "CustomerStoreLink" LIMIT 0'), 'schema readiness uses a non-locking query'],
  [links.includes('JOIN LATERAL ('), 'member lookup supports linked customer records'],
  [links.includes('link."appUserId"=u."id" AND link."customerId"=candidate."id"'), 'linked customer ownership is scoped to the account'],
  [links.includes('const persisted = await tx.$queryRawUnsafe'), 'link persistence is verified'],
  [links.includes('店舗への顧客登録を確認できませんでした。もう一度お試しください。'), 'missing persistence has a retryable response'],
  [ui.includes('const controller = new AbortController()'), 'client requests have an abort controller'],
  [ui.includes('setTimeout(() => controller.abort(), 12000)'), 'client requests have a bounded timeout'],
  [ui.includes('finally { lookupButton.disabled = false }'), 'lookup controls recover after every outcome'],
  [ui.includes('確認に時間がかかっています。通信状態を確認して、もう一度お試しください。'), 'timeout has actionable copy'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

const ensureSchema = links.match(/  async function ensureSchema\(\) \{[\s\S]*?\n  \}/)?.[0] || ''
for (const forbidden of ['ALTER TABLE', 'CREATE UNIQUE INDEX', 'CREATE SEQUENCE', 'DELETE FROM "CustomerStoreLink"']) {
  if (ensureSchema.includes(forbidden)) throw new Error(`request-time schema mutation remains: ${forbidden}`)
}

console.log(`customer code link v474 verified (${assertions.length} assertions)`)
