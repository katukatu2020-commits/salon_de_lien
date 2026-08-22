import fs from 'node:fs'

const feedPath = '/app/.next/static/chunks/6012-community-aspect-v383.js'
const layoutPath = '/app/.next/static/chunks/app/u/(account)/layout-community-aspect-v383.js'
const customerDetailPath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const mobilePath = '/app/public/customer-community-mobile-v383.js'
const serverPath = '/app/server.js'

const feed = fs.readFileSync(feedPath, 'utf8')
if (!feed.includes('aspect-[4/5]')) throw new Error('detail image is not using the list 4:5 aspect ratio')
if (feed.includes('aspect-[4/3]')) throw new Error('stale 4:3 detail image ratio remains')
new Function(feed)

const mobile = fs.readFileSync(mobilePath, 'utf8')
for (const marker of ['__lienCommunityImageAspectV383', 'communityMobileLayout = "v383"', '"aspect-ratio": "4 / 5"']) {
  if (!mobile.includes(marker)) throw new Error(`mobile runtime marker is missing: ${marker}`)
}
if (mobile.includes('"aspect-ratio": "4 / 3"')) throw new Error('stale mobile 4:3 ratio remains')
new Function(mobile)

const customerDetail = fs.readFileSync(customerDetailPath, 'utf8')
for (const marker of ['/customer-community-mobile-v383.js', 'aspect-ratio:4/5!important']) {
  if (!customerDetail.includes(marker)) throw new Error(`customer detail marker is missing: ${marker}`)
}
if (customerDetail.includes('src:"/customer-community-mobile-v377.js"')) throw new Error('old customer runtime is still injected by the detail page')

const layout = fs.readFileSync(layoutPath, 'utf8')
if (!layout.includes('/customer-community-mobile-v383.js')) throw new Error('customer layout does not load the v383 runtime')
if (layout.includes('/customer-community-mobile-v377.js')) throw new Error('customer layout still loads the old runtime')
new Function(layout)

const server = fs.readFileSync(serverPath, 'utf8')
if (!server.includes("url.pathname === '/customer-community-mobile-v383.js'")) throw new Error('v383 runtime route is missing')

for (const manifestPath of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/community/[postId]/page_client-reference-manifest.js',
  '/app/.next/server/app/u/(account)/community/[postId]/page_client-reference-manifest.js',
]) {
  const source = fs.readFileSync(manifestPath, 'utf8')
  if (!source.includes('6012-community-aspect-v383.js')) throw new Error(`${manifestPath}: v383 feed chunk is missing`)
  if (source.includes('6012-e16edeb2a61e1c80.js')) throw new Error(`${manifestPath}: stale feed chunk remains`)
}

for (const manifestPath of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/u/(account)/community/[postId]/page_client-reference-manifest.js',
  '/app/.next/server/app/u/(account)/community/page_client-reference-manifest.js',
  '/app/.next/server/app/u/(account)/home/page_client-reference-manifest.js',
]) {
  const source = fs.readFileSync(manifestPath, 'utf8')
  if (!source.includes('layout-community-aspect-v383.js')) throw new Error(`${manifestPath}: v383 layout chunk is missing`)
  if (source.includes('layout-customer-community-v378.js')) throw new Error(`${manifestPath}: stale layout chunk remains`)
}

console.log('community image aspect v383 verified')
