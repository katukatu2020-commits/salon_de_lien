import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const page = fs.readFileSync(pagePath, 'utf8')

for (const marker of [
  'customer-community-content-height-v375',
  'article>div:first-of-type>a',
  'aspect-ratio:4/3!important',
  'article>div:last-of-type>div.mt-4.grid',
  'grid-auto-rows:max-content!important',
]) {
  if (!page.includes(marker)) throw new Error(`customer community content-height marker is missing: ${marker}`)
}

const styleCount = page.split('customer-community-content-height-v375').length - 1
if (styleCount !== 1) throw new Error(`customer community content-height style count is ${styleCount}`)

console.log('customer community content height v375 verified')
