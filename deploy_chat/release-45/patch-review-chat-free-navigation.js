const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const marker = 'review-chat-free-navigation-v45'

const file = relative => path.join(appRoot, relative)
const read = relative => fs.readFileSync(file(relative), 'utf8')
const write = (relative, source) => fs.writeFileSync(file(relative), source, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceAllChecked(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function prefixDelimitedOnce(source, startText, endText, prefix, label) {
  const start = source.indexOf(startText)
  if (start < 0) throw new Error(`${label}: start not found`)
  if (source.indexOf(startText, start + startText.length) >= 0) throw new Error(`${label}: multiple starts found`)
  const end = source.indexOf(endText, start)
  if (end < 0) throw new Error(`${label}: end not found`)
  return source.slice(0, start) + prefix + source.slice(start, end + endText.length) + source.slice(end + endText.length)
}

function patchInternalReviewComments() {
  const compactRelative = '.next/server/chunks/4441.js'
  let compact = read(compactRelative)
  if (!compact.includes(`${marker}-reviews`)) {
    compact = prefixDelimitedOnce(
      compact,
      'comment:a.allowAnonymousQuote?function(e){',
      '}(a.freeComment):""',
      'comment:m?a.freeComment?.trim()??"":',
      'internal review comment consent bypass',
    ).replace('comment:m?a.freeComment?.trim()??"":comment:', 'comment:m?a.freeComment?.trim()??"":')
    compact = replaceOnce(
      compact,
      'c=i.map(e=>({...e,comment:i.length>=Math.max(3,o)?e.comment:""}))',
      `c=i.map(e=>({...e,comment:m?e.comment:i.length>=Math.max(3,o)?e.comment:""}))/* ${marker}-reviews */`,
      'internal review sample threshold bypass',
    )
    write(compactRelative, compact)
  }

  const pageRelative = '.next/server/chunks/6006.js'
  let page = read(pageRelative)
  if (!page.includes(`${marker}-reviews-page`)) {
    const consentPattern = /comment: r\.allowAnonymousQuote\s*\?/g
    const consentMatches = page.match(consentPattern) || []
    if (consentMatches.length !== 1) throw new Error(`internal page review consent bypass: expected one match, found ${consentMatches.length}`)
    page = page.replace(
      consentPattern,
      'comment: m\n                      ? (r.freeComment?.trim() ?? "")\n                      : r.allowAnonymousQuote\n                        ?',
    )
    const thresholdPattern = /comment: i\.length >= Math\.max\(3, s\) \? e\.comment : "",/g
    const thresholdMatches = page.match(thresholdPattern) || []
    if (thresholdMatches.length !== 1) throw new Error(`internal page sample threshold bypass: expected one match, found ${thresholdMatches.length}`)
    page = page.replace(
      thresholdPattern,
      `comment: m ? e.comment : i.length >= Math.max(3, s) ? e.comment : "", /* ${marker}-reviews-page */`,
    )
    write(pageRelative, page)
  }
}

function patchChatDatesAndSeparatePages() {
  const customerRelative = '.next/server/app/u/(account)/appointments/page.js'
  let customer = read(customerRelative)
  if (!customer.includes(`${marker}-customer-chat`)) {
    customer = replaceAllChecked(
      customer,
      'new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"short",timeZone:"Asia/Tokyo"})',
      'new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short",timeZone:"Asia/Tokyo"})',
      1,
      'customer chat date separator',
    )
    customer = replaceAllChecked(
      customer,
      'href:"/u/appointments?view=chat&threadId="+encodeURIComponent(e.id)',
      'href:"/u/chat?threadId="+encodeURIComponent(e.id)',
      1,
      'customer chat thread links',
    )
    customer = replaceAllChecked(
      customer,
      'href:"/u/appointments?view=chat"',
      'href:"/u/chat"',
      3,
      'customer chat links',
    )
    const tabPattern = /\(0,s\.jsxs\)\("nav",\{className:"grid grid-cols-2 gap-1 rounded-\[18px\] border border-\[#e8ded2\] bg-white p-1 shadow-sm",children:\[s\.jsx\("a",\{href:"\/u\/appointments",className:[\s\S]*?\}\),s\.jsx\("a",\{href:"\/u\/chat",className:[\s\S]*?\}\)\]\}\),/g
    const tabs = customer.match(tabPattern) || []
    if (tabs.length !== 2) throw new Error(`customer booking/chat tabs: expected 2 matches, found ${tabs.length}`)
    customer = customer.replace(tabPattern, '')
    customer = customer.replace(
      'let c="force-dynamic";',
      `let c="force-dynamic";/* ${marker}-customer-chat */`,
    )
    write(customerRelative, customer)
  }

  const adminRelative = '.next/server/app/admin/customers/messages/page.js'
  let admin = read(adminRelative)
  if (!admin.includes(`${marker}-admin-chat`)) {
    admin = replaceAllChecked(
      admin,
      'new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" })',
      'new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" })',
      1,
      'admin chat date separator',
    )
    admin = admin.replace(
      'h = "force-dynamic";',
      `h = "force-dynamic"; /* ${marker}-admin-chat */`,
    )
    write(adminRelative, admin)
  }
}

function patchFreeAppointmentStorage() {
  const relative = '.next/server/app/api/customer/appointments/route.js'
  let source = read(relative)
  if (source.includes(`${marker}-free`)) return

  source = replaceOnce(
    source,
    'staffName:w.setting.staffName,estimatedPrice:a.estimatedPrice',
    `staffName:"free"===r?"フリー":w.setting.staffName,estimatedPrice:a.estimatedPrice/* ${marker}-free */`,
    'free appointment staff persistence',
  )
  const contactStart = source.indexOf('message:`${s} ')
  if (contactStart < 0) throw new Error('free appointment contact log: message start not found')
  const staffReference = '${w.setting.staffName}'
  const staffReferenceAt = source.indexOf(staffReference, contactStart)
  if (staffReferenceAt < 0) throw new Error('free appointment contact log: staff reference not found')
  source = source.slice(0, staffReferenceAt)
    + '${"free"===r?"フリー":w.setting.staffName}'
    + source.slice(staffReferenceAt + staffReference.length)
  write(relative, source)
}

function patchCustomerNavigation() {
  const serverRelative = '.next/server/chunks/1597.js'
  let server = read(serverRelative)
  if (!server.includes(`${marker}-navigation`)) {
    server = replaceOnce(
      server,
      '{href:"/u/appointments?view=chat",label:"メッセージ",icon:o},{href:"/u/menu",label:"メニュー",icon:h}',
      `{href:"/u/chat",label:"チャット相談",icon:o}/* ${marker}-navigation */`,
      'customer server navigation items',
    )
    server = replaceOnce(
      server,
      'let t=e.href.includes("view=chat")?customerChatView:"/u/appointments"===e.href&&customerChatView?!1:s===e.href||s.startsWith(`${e.href}/`)',
      'let t="/u/chat"===e.href?s==="/u/chat":"/u/appointments"===e.href?s==="/u/appointments":s===e.href||s.startsWith(`${e.href}/`)',
      'customer server navigation active state',
    )
    server = replaceOnce(server, 'grid-cols-5 px-1', 'grid-cols-4 px-1', 'customer server mobile nav columns')
    write(serverRelative, server)
  }

  const clientRelative = '.next/static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.js'
  let client = read(clientRelative)
  if (!client.includes(`${marker}-navigation`)) {
    const clientItems = /\{href:"\/u\/appointments\?view=chat",label:"[^"]*",icon:d\},\{href:"\/u\/menu",label:"[^"]*",icon:m\}/g
    const clientItemMatches = client.match(clientItems) || []
    if (clientItemMatches.length !== 1) throw new Error(`customer client navigation items: expected one match, found ${clientItemMatches.length}`)
    client = client.replace(clientItems, `{href:"/u/chat",label:"チャット相談",icon:d}/* ${marker}-navigation */`)
    client = replaceOnce(
      client,
      'let t=e.href.includes("view=chat")?customerChatView:"/u/appointments"===e.href&&customerChatView?!1:n===e.href||n.startsWith("".concat(e.href,"/"))',
      'let t="/u/chat"===e.href?n==="/u/chat":"/u/appointments"===e.href?n==="/u/appointments":n===e.href||n.startsWith("".concat(e.href,"/"))',
      'customer client navigation active state',
    )
    client = replaceOnce(client, 'grid-cols-5 px-1', 'grid-cols-4 px-1', 'customer client mobile nav columns')
    write(clientRelative, client)
  }
}

function patchCustomServerRouting() {
  const relative = 'server.js'
  let source = read(relative)
  if (source.includes(`${marker}-route`)) return

  const bottomItems = /const items = \[\['home',[^\r\n]+?'\/u\/menu'\]\]/g
  const bottomItemMatches = source.match(bottomItems) || []
  if (bottomItemMatches.length !== 1) throw new Error(`custom customer navigation items: expected one match, found ${bottomItemMatches.length}`)
  source = source.replace(bottomItems, `const items = [['home','ホーム','/u/home'],['calendar','予約','/u/appointments'],['clock','履歴','/u/history'],['mail','チャット相談','/u/chat']]`)
  source = replaceOnce(
    source,
    'max-width:480px;grid-template-columns:repeat(5,1fr);padding:7px',
    'max-width:480px;grid-template-columns:repeat(4,1fr);padding:7px',
    'custom customer nav columns',
  )
  const menuChat = /\['mail','[^']*','\/u\/appointments\?view=chat'\]/g
  const menuChatMatches = source.match(menuChat) || []
  if (menuChatMatches.length !== 1) throw new Error(`custom menu chat link: expected one match, found ${menuChatMatches.length}`)
  source = source.replace(menuChat, `['mail','チャット相談','/u/chat']`)
  source = replaceOnce(
    source,
    `if (url.pathname === '/u/chat' || url.pathname === '/u/messages') { res.statusCode = 307; res.setHeader('Location', '/u/appointments?view=chat'); return res.end() }`,
    `if (url.pathname === '/u/messages') { res.statusCode = 307; res.setHeader('Location', '/u/chat'); return res.end() }
      if (url.pathname === '/u/chat') {
        const query = new URLSearchParams(url.searchParams)
        query.set('view', 'chat')
        req.url = '/u/appointments?' + query.toString()
        return handle(req, res)
      } /* ${marker}-route */`,
    'customer chat standalone route',
  )
  source = replaceAllChecked(
    source,
    '/u/appointments?view=chat',
    '/u/chat',
    3,
    'custom server customer chat links',
  )
  write(relative, source)
}

function cacheBustStaticChunk(oldChunk, newChunk, label) {
  const oldAbsolute = path.join(appRoot, '.next', oldChunk)
  const newAbsolute = path.join(appRoot, '.next', newChunk)
  if (!fs.existsSync(oldAbsolute)) throw new Error(`${label}: source chunk not found`)
  fs.copyFileSync(oldAbsolute, newAbsolute)

  const targets = []
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) collect(absolute)
      else if (/\.(?:json|js)$/.test(entry.name)) targets.push(absolute)
    }
  }
  collect(path.join(appRoot, '.next'))

  let references = 0
  for (const absolute of targets) {
    if (absolute === oldAbsolute || absolute === newAbsolute) continue
    const source = fs.readFileSync(absolute, 'utf8')
    if (!source.includes(oldChunk)) continue
    fs.writeFileSync(absolute, source.split(oldChunk).join(newChunk), 'utf8')
    references += 1
  }
  if (references < 1 && !targets.some(absolute => fs.readFileSync(absolute, 'utf8').includes(newChunk))) {
    throw new Error(`${label}: no manifest references updated`)
  }
}

patchInternalReviewComments()
patchChatDatesAndSeparatePages()
patchFreeAppointmentStorage()
patchCustomerNavigation()
patchCustomServerRouting()

cacheBustStaticChunk(
  'static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.js',
  'static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.navigation-v45.js',
  'customer navigation client chunk',
)

console.log('patched internal review comments, chat dates/routes, free appointments, and customer navigation')
