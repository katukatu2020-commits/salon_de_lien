import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const files = {
  registrationRequest: '/app/.next/server/app/api/customer-auth/registration-link/request/route.js',
  phoneRequest: '/app/.next/server/app/api/customer-auth/phone-verification/request/route.js',
  registrationAction: '/app/.next/server/chunks/2241.js',
}

const sources = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
)

const assertions = [
  [
    sources.registrationRequest.includes('process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID ?? "org_showcase_yohaku"'),
    'new registration invitations default to the Yohaku organization',
  ],
  [
    sources.phoneRequest.includes('process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID||"org_showcase_yohaku"'),
    'registration phone verification defaults to the Yohaku organization',
  ],
  [
    sources.registrationAction.includes('select:{id:!0,organizationId:!0,email:!0,customerId:!0,expiresAt:!0,usedAt:!0}'),
    'registration completion selects the invitation organization',
  ],
  [sources.registrationAction.includes('P=n.organizationId'), 'registration completion uses the invitation organization'],
  [
    sources.registrationAction.includes('r.organizationId!==P'),
    'locked invitation organization consistency check remains active',
  ],
  [
    sources.registrationAction.includes('organizationId:P'),
    'new customer records remain explicitly tenant-scoped',
  ],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const staleMarkers = [
  [sources.registrationRequest, 'process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"'],
  [sources.phoneRequest, 'process.env.DEFAULT_ORGANIZATION_ID||"org_salon_de_lien"'],
  [sources.registrationAction, 'P=process.env.DEFAULT_ORGANIZATION_ID??"org_salon_de_lien"'],
]
for (const [source, marker] of staleMarkers) {
  if (source.includes(marker)) throw new Error(`stale registration organization marker remains: ${marker}`)
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`customer registration default store v455 verified (${assertions.length} assertions)`)
