import fs from 'node:fs'

const platform = fs.readFileSync('/app/platform-operator.js', 'utf8')
const entrypoint = fs.readFileSync('/usr/local/bin/lien-entrypoint', 'utf8')
const ensure = fs.readFileSync('/app/ensure-platform-account-actions.cjs', 'utf8')

const platformMarkers = [
  '/api/platform/customers/',
  '/delete-account',
  'validSameOrigin(req)',
  `confirmation !== String(target.name || '').trim()`,
  `UPDATE "AppUser" SET "active"=FALSE`,
  `UPDATE "Customer" SET "deletedAt"=COALESCE("deletedAt",NOW())`,
  `UPDATE "CustomerPortalAccess" SET "revokedAt"=COALESCE("revokedAt",NOW())`,
  'ACCOUNT_SOFT_DELETE',
  'アカウントを削除する',
  '予約・会計・施術履歴は削除せず、運営者サイトに保持します。',
]

for (const marker of platformMarkers) {
  if (!platform.includes(marker)) throw new Error(`platform account deletion marker missing: ${marker}`)
}

if (!entrypoint.includes('ensure-platform-account-actions.cjs') || !entrypoint.includes('lien-entrypoint-v355')) {
  throw new Error('platform account action schema initializer is not chained')
}
if (!ensure.includes('PlatformCustomerAccountAction_customerId_createdAt_idx')) {
  throw new Error('platform account action audit schema is incomplete')
}
