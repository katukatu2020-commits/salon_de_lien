const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const pointsChunk = fs.readFileSync(path.join(appRoot, '.next/server/chunks/3491.js'), 'utf8')
const messagesPage = fs.readFileSync(path.join(appRoot, '.next/server/app/admin/customers/messages/page.js'), 'utf8')

const checks = [
  ['point component accepts modal props', pointsChunk.includes('embedded:Q=!1')],
  ['history fetches 50 records', pointsChunk.includes('skip:(E-1)*50,take:50')],
  ['point history has count query', pointsChunk.includes('pointTransaction.count({where:e})')],
  ['point pagination labels exist', pointsChunk.includes('前の50件') && pointsChunk.includes('次の50件')],
  ['legacy point route redirects to distribution modal', pointsChunk.includes('/admin/customers/messages?points=1&pointPage=1#point-management-dialog')],
  ['distribution renders modal dialog', messagesPage.includes('id: "point-management-dialog"')],
  ['distribution keeps messages tab active', messagesPage.includes('active: "messages"')],
  ['distribution imports point component', messagesPage.includes('P = t(51589)')],
  ['distribution loads shared points dependencies', ['2564', '7401', '3950', '7295', '2241', '3491'].every(chunk => new RegExp(`\\[[^\\]]*${chunk}[^\\]]*\\]`).test(messagesPage))],
  ['old standalone point link is absent', !messagesPage.includes('/admin/customers?section=points')],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name) }))
