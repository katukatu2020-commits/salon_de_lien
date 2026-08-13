const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const reports = read('.next/server/chunks/4441.js')
assert(reports.includes('comment:m?a.freeComment?.trim()??""'), 'internal review comments are not visible')
assert(reports.includes('comment:m?e.comment:i.length>=Math.max(3,o)'), 'internal sample threshold still hides comments')

const productPageReports = read('.next/server/chunks/6006.js')
assert(productPageReports.includes('comment: m\n                      ? (r.freeComment?.trim() ?? "")'), 'product page still hides internal comments')
assert(productPageReports.includes('comment: m ? e.comment : i.length >= Math.max(3, s)'), 'product page still applies the external sample threshold internally')

const customerChat = read('.next/server/app/u/(account)/appointments/page.js')
assert(customerChat.includes('year:"numeric",month:"long",day:"numeric",weekday:"short"'), 'customer chat lacks year date separator')
assert(customerChat.includes('href:"/u/chat?threadId="'), 'customer thread links do not use standalone chat route')
assert(!customerChat.includes('className:"grid grid-cols-2 gap-1 rounded-[18px]'), 'booking/chat tabs remain')

const adminChat = read('.next/server/app/admin/customers/messages/page.js')
assert(adminChat.includes('year: "numeric", month: "long", day: "numeric", weekday: "short"'), 'admin chat lacks year date separator')

const appointmentsApi = read('.next/server/app/api/customer/appointments/route.js')
assert(appointmentsApi.includes('staffName:"free"===r?"フリー":w.setting.staffName'), 'free appointment is still assigned automatically')

const shell = read('.next/server/chunks/1597.js')
assert(shell.includes('{href:"/u/chat",label:"チャット相談",icon:o}'), 'standalone chat navigation missing')
assert(!shell.includes('href:"/u/menu",label:"メニュー"'), 'menu remains in customer navigation')
assert(shell.includes('grid-cols-4 px-1'), 'mobile navigation is not four columns')

const customServer = read('server.js')
assert(customServer.includes("req.url = '/u/appointments?' + query.toString()"), 'standalone chat rewrite missing')
assert(customServer.includes("query.set('view', 'chat')"), 'chat rewrite does not set chat view')

const manifest = read('.next/server/app/u/(account)/appointments/page_client-reference-manifest.js')
assert(manifest.includes('navigation-v45.js'), 'customer navigation cache bust missing')

console.log('release 45 verification passed')
