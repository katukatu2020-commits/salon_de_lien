import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const expectedHashes = {
  'server.js': '53410f4be83faa85e9c16f76c22137c1bc9ae08d19583ab7eb9a50f825690ac8',
  'customer-experience-v278.js': '2d45677add0a77ff9a589cef424c5b62b1c23c0066fd58e2694b087fb1bf075a',
  'admin-staff-experience-v276.js': 'd544259ea065f59b59ee11ff297661da0cf146e79dc5d19b7fcfd0bd5f13727e',
  'commercial-admin-v101.js': 'cc85895804e0b55fe7bdba59a3fa79974eba2e9962ebdfb4cd471e69787da6c0',
  'customer-runtime-v267.js': '3b966b5f8d151f08b2fe7e82a531091fa0b3438863e5c0ab07f4bf6104cb6389',
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function readChecked(name) {
  const file = path.join(root, name)
  const source = fs.readFileSync(file, 'utf8')
  const actual = sha256(source)
  if (expectedHashes[name] && actual !== expectedHashes[name]) {
    throw new Error(`${name}: unexpected parent hash ${actual}`)
  }
  return source
}

function replaceOnce(source, needle, replacement, label) {
  const count = source.split(needle).length - 1
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`)
  return source.replace(needle, replacement)
}

let server = readChecked('server.js')
server = replaceOnce(
  server,
  "const { createCustomerStoreStaffService } = require('./customer-store-staff-v276')",
  "const { createCustomerStoreStaffService } = require('./customer-store-staff-v276')\nconst { createCustomerLinkService } = require('./customer-links-v293')",
  'customer link require',
)
server = replaceOnce(
  server,
  'let customerStoreStaff = null',
  'let customerStoreStaff = null\nlet customerLinks = null',
  'customer link binding',
)
server = replaceOnce(
  server,
  `customerStoreStaff = createCustomerStoreStaffService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  renderCustomerShell: customerShell,
})`,
  `customerStoreStaff = createCustomerStoreStaffService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  renderCustomerShell: customerShell,
})
customerLinks = createCustomerLinkService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  renderCustomerShell: customerShell,
})`,
  'customer link service creation',
)
server = replaceOnce(
  server,
  '  await customerStoreStaff.ensureSchema()\n  await ensureSmsComplianceSchema()',
  '  await customerStoreStaff.ensureSchema()\n  await customerLinks.ensureSchema()\n  await ensureSmsComplianceSchema()',
  'customer link schema startup',
)
server = replaceOnce(
  server,
  '      if (await customerStoreStaff.handle(req, res, url)) return\n      if (await tenantSetup.handle(req, res, url)) return',
  '      if (await customerLinks.handle(req, res, url)) return\n      if (await customerStoreStaff.handle(req, res, url)) return\n      if (await tenantSetup.handle(req, res, url)) return',
  'customer link request routing',
)
server = replaceOnce(
  server,
  'async function customerHomePage(res, session) {\n  const data = await customerAppData(session)',
  'async function customerHomePage(res, session) {\n  const data = await customerAppData(session)\n  const membershipCode = await customerLinks.customerPublicCode(session)',
  'customer membership code lookup',
)
server = replaceOnce(
  server,
  '<a class="metric" href="/u/history"><span>前回来店</span><strong style="font-size:14px">${htmlEscape(jpDate(data.visit?.visitedAt))}</strong></a></div></section>',
  '<a class="metric" href="/u/history"><span>前回来店</span><strong style="font-size:14px">${htmlEscape(jpDate(data.visit?.visitedAt))}</strong></a></div>${customerLinks.membershipMarkup(membershipCode)}</section>',
  'customer home barcode markup',
)
server = server.replaceAll('/customer-experience-v278.js" defer></script>', '/customer-experience-v278.js" defer></script><script src="/customer-link-ui-v293.js?v=293-4" defer></script>')
fs.writeFileSync(path.join(root, 'server.js'), server, 'utf8')

let commercialAdmin = readChecked('commercial-admin-v101.js')
commercialAdmin = replaceOnce(
  commercialAdmin,
  "document.head.appendChild(staffExperience)\n  }",
  "document.head.appendChild(staffExperience)\n  }\n\n  if (!document.querySelector('script[data-lien-customer-link-v293]')) {\n    const customerLink = document.createElement('script')\n    customerLink.src = '/customer-link-ui-v293.js?v=293-4'\n    customerLink.defer = true\n    customerLink.dataset.lienCustomerLinkV293 = '1'\n    document.head.appendChild(customerLink)\n  }",
  'admin customer-link cache bust',
)
fs.writeFileSync(path.join(root, 'commercial-admin-v101.js'), commercialAdmin, 'utf8')

let customerRuntime = readChecked('customer-runtime-v267.js')
customerRuntime += `\n;(() => {
  if (document.querySelector('script[data-lien-customer-link-v293]')) return
  const customerLink = document.createElement('script')
  customerLink.src = '/customer-link-ui-v293.js?v=293-4'
  customerLink.defer = true
  customerLink.dataset.lienCustomerLinkV293 = '1'
  document.head.appendChild(customerLink)
})()\n`
fs.writeFileSync(path.join(root, 'customer-runtime-v267.js'), customerRuntime, 'utf8')

console.log('Release 293 customer-store link runtime patch complete.')
