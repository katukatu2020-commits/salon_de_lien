'use strict'

const fs = require('fs')
const path = require('path')

const appDir = process.env.APP_DIR || '/app'
const serverPath = path.join(appDir, 'server.js')
let source = fs.readFileSync(serverPath, 'utf8')

const importMarker = "const { handlePublicSiteRequest } = require('./public-site') /* public-review-pages-v46 */"
if (!source.includes(importMarker)) {
  const importAnchor = "const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')"
  if (!source.includes(importAnchor)) throw new Error('server import anchor not found')
  source = source.replace(importAnchor, `${importAnchor}\n${importMarker}`)
}

const dispatchMarker = 'if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */'
if (!source.includes(dispatchMarker)) {
  const dispatchAnchor = "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)"
  if (!source.includes(dispatchAnchor)) throw new Error('server dispatch anchor not found')
  source = source.replace(dispatchAnchor, `${dispatchAnchor}\n      ${dispatchMarker}`)
}

fs.writeFileSync(serverPath, source)
console.log('Public review pages were added to the current runtime server.')
