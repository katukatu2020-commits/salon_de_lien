import fs from 'node:fs'

const page = fs.readFileSync('/app/.next/server/app/u/(account)/community/[postId]/page.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const client = fs.readFileSync('/app/public/customer-community-mobile-v377.js', 'utf8')

for (const marker of ['/customer-community-mobile-v377.js', 'customer-community-content-height-v375']) {
  if (!page.includes(marker)) throw new Error(`page marker is missing: ${marker}`)
}
for (const marker of ['customer-community-mobile-runtime-v377', "url.pathname.startsWith('/u/community')"]) {
  if (!server.includes(marker)) throw new Error(`server marker is missing: ${marker}`)
}
for (const marker of ['communityMobileLayout = "v377"', 'reverse().find', 'window.addEventListener("pageshow", schedule)']) {
  if (!client.includes(marker)) throw new Error(`client marker is missing: ${marker}`)
}
if (page.includes('src:"/customer-community-mobile-v376.js"')) throw new Error('v376 page script is still active')
console.log('customer community mobile runtime v377 verified')
