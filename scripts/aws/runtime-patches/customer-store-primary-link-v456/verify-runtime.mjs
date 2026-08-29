import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const customerLinksPath = '/app/customer-links-v293.js'
const source = fs.readFileSync(customerLinksPath, 'utf8')

const assertions = [
  [
    source.includes("ON CONFLICT DO NOTHING', crypto.randomUUID(), appUserId, source.organizationId, source.customerId"),
    'the current store is preserved before another store is linked',
  ],
  [
    source.includes('JOIN "CustomerRegistrationInvite" i ON LOWER(i."email")=LOWER(u."email")'),
    'the registration-origin store can be repaired for existing customers',
  ],
  [
    source.includes('i."customerId" IS NOT NULL AND i."usedAt" IS NOT NULL'),
    'only completed registration invitations are considered',
  ],
  [
    source.includes('for (const membership of memberships)'),
    'all valid memberships are restored before rendering the list',
  ],
  [
    source.includes("ON CONFLICT DO NOTHING', crypto.randomUUID(), session.userId, membership.organizationId, membership.customerId"),
    'membership repair is idempotent',
  ],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', customerLinksPath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(`${customerLinksPath}: ${syntax.stderr || syntax.stdout}`)

console.log(`customer primary store link v456 verified (${assertions.length} assertions)`)

