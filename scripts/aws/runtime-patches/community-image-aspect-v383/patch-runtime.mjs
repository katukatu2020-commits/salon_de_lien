import fs from 'node:fs'
import path from 'node:path'

const oldFeedName = '6012-e16edeb2a61e1c80.js'
const newFeedName = '6012-community-aspect-v383.js'
const feedDirectory = '/app/.next/static/chunks'
const oldFeedPath = path.join(feedDirectory, oldFeedName)
const newFeedPath = path.join(feedDirectory, newFeedName)

const oldLayoutName = 'layout-customer-community-v378.js'
const newLayoutName = 'layout-community-aspect-v383.js'
const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const oldLayoutPath = path.join(layoutDirectory, oldLayoutName)
const newLayoutPath = path.join(layoutDirectory, newLayoutName)

const customerDetailPath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const oldMobilePath = '/app/public/customer-community-mobile-v377.js'
const newMobilePath = '/app/public/customer-community-mobile-v383.js'
const serverPath = '/app/server.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let feed = fs.readFileSync(oldFeedPath, 'utf8')
feed = replaceOnce(feed, 'aspect-[4/3]', 'aspect-[4/5]', 'community detail image aspect ratio')
fs.writeFileSync(newFeedPath, feed)

let mobile = fs.readFileSync(oldMobilePath, 'utf8')
if (!mobile.startsWith('(() => {')) throw new Error('mobile runtime guard anchor is missing')
mobile = mobile.replace('(() => {', '(() => {\n  if (window.__lienCommunityImageAspectV383) return;\n  window.__lienCommunityImageAspectV383 = true;')
mobile = mobile.split('"aspect-ratio": "4 / 3"').join('"aspect-ratio": "4 / 5"')
mobile = mobile.split('communityMobileLayout = "v377"').join('communityMobileLayout = "v383"')
fs.writeFileSync(newMobilePath, mobile)

let customerDetail = fs.readFileSync(customerDetailPath, 'utf8')
customerDetail = replaceOnce(customerDetail, 'src:"/customer-community-mobile-v377.js"', 'src:"/customer-community-mobile-v383.js"', 'customer detail mobile runtime')
customerDetail = customerDetail.split('aspect-ratio:4/3!important').join('aspect-ratio:4/5!important')
fs.writeFileSync(customerDetailPath, customerDetail)

let layout = fs.readFileSync(oldLayoutPath, 'utf8')
layout = replaceOnce(layout, '/customer-community-mobile-v377.js', '/customer-community-mobile-v383.js', 'customer layout mobile runtime')
fs.writeFileSync(newLayoutPath, layout)

let server = fs.readFileSync(serverPath, 'utf8')
const serverAnchor = "      if (url.pathname === '/customer-community-mobile-v377.js' && req.method === 'GET') {"
const serverRoute = `      if (url.pathname === '/customer-community-mobile-v383.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v383.js')))
        return
      } /* community-image-aspect-v383 */
`
server = replaceOnce(server, serverAnchor, serverRoute + serverAnchor, 'mobile runtime server route')
fs.writeFileSync(serverPath, server)

function replaceManifestReferences(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestReferences(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(oldFeedName) && !source.includes(oldLayoutName)) continue
    source = source.split(oldFeedName).join(newFeedName)
    source = source.split(oldLayoutName).join(newLayoutName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestReferences('/app/.next')
