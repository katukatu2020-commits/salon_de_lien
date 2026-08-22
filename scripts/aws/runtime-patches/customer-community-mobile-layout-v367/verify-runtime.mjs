import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const page = fs.readFileSync(pagePath, 'utf8')

for (const marker of [
  'community-detail-page mx-auto flex w-full max-w-3xl flex-col gap-4',
  'customer-community-layout-v367',
  'grid-auto-rows:max-content',
  'article>header+div+div>div:first-child',
]) {
  if (!page.includes(marker)) throw new Error(`customer community layout marker is missing: ${marker}`)
}

if (page.includes('className:"mx-auto grid w-full max-w-3xl gap-4"')) {
  throw new Error('old customer community detail root remains active')
}

console.log('customer community mobile layout v367 verified')
