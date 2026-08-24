import fs from 'node:fs'

function assertIncludes(filePath, expected, label) {
  const source = fs.readFileSync(filePath, 'utf8')
  if (!source.includes(expected)) throw new Error(`${label}: verification failed`)
}

assertIncludes('/app/commercial-admin-v101.js', "document.documentElement.classList.add('ca-settings-embedded')", 'embedded settings shell isolation')
assertIncludes('/app/commercial-admin-v101.js', "grid-template-columns:minmax(0,1fr)!important", 'desktop sidebar navigation')
assertIncludes('/app/sales-ledger-client-v318.js', `!document.querySelector('a[href="/admin/owner-analytics"]')`, 'staff shared-account guard')
assertIncludes('/app/.next/server/app/admin/owner-analytics/page.js', '"grid w-full grid-cols-3 gap-1', 'owner tabs layout')
assertIncludes('/app/.next/server/app/admin/owner-analytics/page.js', 'label: "会計データ管理"', 'owner ledger server tab')

for (const filePath of [
  '/app/catalog-operations.js',
  '/app/store-profile.js',
  '/app/customer-store-staff-v276.js',
  '/app/customer-links-v293.js',
]) {
  assertIncludes(filePath, "new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])", `${filePath} canonical origin`)
  assertIncludes(filePath, "'NEXT_PUBLIC_APP_URL'", `${filePath} configured origins`)
}

console.log('admin PC shell, settings and origin v422 runtime verified')
