'use strict'

const fs = require('fs')
const path = require('path')

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const checks = {
  'server.js': [
    "require('./customer-links-v293')",
    'await customerLinks.ensureSchema()',
    'await customerLinks.handle(req, res, url)',
    'customerLinks.membershipMarkup(membershipCode)',
    '/customer-link-ui-v293.js?v=293-4',
  ],
  'customer-links-v293.js': [
    "'/api/admin/customer-directory'",
    "'/api/admin/store-qr'",
    'linkMemberToOrganization',
    'membershipMarkup',
    'CustomerStoreLink_appUser_org_key',
  ],
  'customer-link-ui-v293.js': [
    'window.__lienCustomerLinkV293_4',
    'initAdminCustomerDialog',
    'initStorePage',
    'initCropper',
  ],
  'commercial-admin-v101.js': [
    '/customer-link-ui-v293.js?v=293-4',
  ],
  'customer-runtime-v267.js': [
    '/customer-link-ui-v293.js?v=293-4',
    'data-lien-customer-link-v293',
  ],
}

for (const [name, markers] of Object.entries(checks)) {
  const source = fs.readFileSync(path.join(root, name), 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${name}: missing ${marker}`)
  }
  new Function(source)
}

if (!fs.statSync(path.join(root, 'public/vendor/jsQR-v293.js')).size) throw new Error('jsQR browser bundle is empty')
require(path.join(root, 'customer-links-v293.js'))
console.log('Release 293 runtime verification passed.')
