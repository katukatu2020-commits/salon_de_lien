import fs from 'node:fs'

const page = fs.readFileSync('/app/.next/server/app/u/(account)/community/[postId]/page.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const client = fs.readFileSync('/app/public/customer-community-mobile-v376.js', 'utf8')

for (const marker of [
  '/customer-community-mobile-v376.js',
  'customer-community-content-height-v375',
]) {
  if (!page.includes(marker)) throw new Error(`community page marker is missing: ${marker}`)
}

for (const marker of [
  'customer-community-mobile-runtime-v376-no-store',
  'customer-community-mobile-runtime-v376',
  "url.pathname.startsWith('/u/community')",
]) {
  if (!server.includes(marker)) throw new Error(`server marker is missing: ${marker}`)
}

for (const marker of [
  'communityMobileLayout = "v376"',
  'window.addEventListener("pageshow", schedule)',
  'new MutationObserver(schedule)',
  '"aspect-ratio": "4 / 3"',
]) {
  if (!client.includes(marker)) throw new Error(`mobile client marker is missing: ${marker}`)
}

if (page.split('/customer-community-mobile-v376.js').length - 1 !== 1) {
  throw new Error('community mobile runtime script was injected more than once')
}

console.log('customer community mobile runtime v376 verified')
