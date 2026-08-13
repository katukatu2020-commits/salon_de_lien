const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(appRoot, 'server.js'), 'utf8')
const layout = fs.readFileSync(path.join(appRoot, '.next/server/chunks/1597.js'), 'utf8')
const chat = fs.readFileSync(path.join(appRoot, '.next/server/app/u/(account)/appointments/page.js'), 'utf8')
const cssRoot = path.join(appRoot, '.next/static/css')
const css = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n')

const checks = [
  ['custom pages keep the home menu header', server.includes('const pageBack = back ?') && server.includes('<main class="content">${pageBack}${body}</main>')],
  ['customer message navigation opens chat', layout.includes('href:"/u/appointments?view=chat"')],
  ['chat and booking active states are separated', layout.includes('"chat"===customerChatParams.get("view")') && layout.includes('"/u/appointments"===e.href&&customerChatView?!1')],
  ['customer chat uses explicit thread selection', chat.includes('c=q?.threadId?r.find(e=>e.id===q.threadId):null')],
  ['customer chat layout has stable selectors', ['customer-chat-layout', 'customer-chat-thread-list', 'customer-chat-conversation', 'customer-chat-mobile-back'].every(value => chat.includes(value))],
  ['home shell icon masks are installed', ['/u/home', '/u/appointments?view=chat', 'Customer shell and chat correction'].every(value => css.includes(value))],
  ['inner chat aside is restored', css.includes('main .customer-chat-thread-list{display:block!important;position:static!important')],
  ['desktop width matches home', css.includes('max-width:1440px!important') && css.includes('max-width:1120px!important')],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name) }))
