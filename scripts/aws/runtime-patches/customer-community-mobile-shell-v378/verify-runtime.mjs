import fs from 'node:fs'

const layoutPath = '/app/.next/static/chunks/app/u/(account)/layout-customer-community-v378.js'
const layout = fs.readFileSync(layoutPath, 'utf8')
for (const marker of [
  '__lienCustomerCommunityMobileV378',
  '/customer-community-mobile-v377.js',
  'data-lien-customer-community-mobile-v378',
]) {
  if (!layout.includes(marker)) throw new Error(`customer layout marker is missing: ${marker}`)
}
new Function(layout)

for (const file of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/u/(account)/community/page_client-reference-manifest.js',
  '/app/.next/server/app/u/(account)/community/[postId]/page_client-reference-manifest.js',
  '/app/.next/server/app/u/(account)/home/page_client-reference-manifest.js',
]) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('layout-customer-community-v378.js')) throw new Error(`${file}: v378 layout reference is missing`)
  if (source.includes('layout-customer-stability-v373.js')) throw new Error(`${file}: stale v373 layout reference remains`)
}

console.log('customer community mobile shell v378 verified')
