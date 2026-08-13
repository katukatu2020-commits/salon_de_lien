const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file, visit)
    else if (entry.isFile()) visit(file)
  }
}

function replaceReferences(dir, oldName, newName) {
  walk(dir, file => {
    if (!/\.(?:js|json|html)$/.test(file)) return
    const source = fs.readFileSync(file, 'utf8')
    if (source.includes(oldName)) fs.writeFileSync(file, source.split(oldName).join(newName))
  })
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before)
  if (index < 0) throw new Error(`${label} not found`)
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`${label} is ambiguous`)
  return source.slice(0, index) + after + source.slice(index + before.length)
}

function patchCustomCustomerShell(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('class="customer-page-back"')) {
    const leftPattern = /  const left = back \?[^\n]+\n/
    if (!leftPattern.test(source)) throw new Error(`customer shell header selector not found: ${file}`)
    source = source.replace(
      leftPattern,
      `  const left = \`<a class="icon-button" href="/u/menu" aria-label="メニュー">\${customerIcon('menu')}</a>\`\n  const pageBack = back ? \`<a class="customer-page-back" href="\${back}">\${customerIcon('arrow')}<span>戻る</span></a>\` : ''\n`,
    )
    source = replaceOnce(
      source,
      '<main class="content">${body}</main>',
      '<main class="content">${pageBack}${body}</main>',
      'customer shell content',
    )
  }

  if (!source.includes('Customer page back link follows the shared home shell')) {
    const match = source.match(/function customerAppCss\(\) \{\s*return `([\s\S]*?)`\s*\}/)
    if (!match) throw new Error(`customerAppCss not found: ${file}`)
    const extraCss = `
/* Customer page back link follows the shared home shell without replacing its header icon. */
.customer-page-back{display:inline-flex;min-height:42px;align-items:center;gap:6px;margin:10px 18px 0;color:var(--muted);font-size:11px;font-weight:700}.customer-page-back .icon{width:17px;height:17px}
@media(min-width:1024px){.content{width:100%}.customer-page-back{display:flex;width:100%;max-width:1120px;margin:18px auto 0;padding:0 4px}.content>.customer-page-back+.page-title{margin-top:0}}
`
    source = source.replace(match[0], `function customerAppCss() {\n  return \`${match[1]}${extraCss}\`\n}`)
  }
  fs.writeFileSync(file, source)
}

function patchLayout(file) {
  let source = fs.readFileSync(file, 'utf8')
  const navMatch = source.match(/let p=\[(\{href:"\/u\/home"[\s\S]*?)\];function b/)
  if (!navMatch) throw new Error(`customer navigation not found: ${file}`)
  let navigation = navMatch[0]
  if (!navigation.includes('href:"/u/appointments?view=chat"')) {
    navigation = navigation.replace('href:"/u/news",label:', 'href:"/u/appointments?view=chat",label:')
  }
  if (!navigation.includes('href:"/u/appointments?view=chat"')) {
    throw new Error(`customer message navigation was not updated: ${file}`)
  }
  source = source.replace(navMatch[0], navigation)

  if (!source.includes('"chat"===customerChatParams.get("view")')) {
    const templatePattern = /([A-Za-z_$][\w$]*)=\(0,([A-Za-z_$][\w$]*)\.usePathname\)\(\),([A-Za-z_$][\w$]*)=p\.map\(e=>\{let ([A-Za-z_$][\w$]*)=\1===e\.href\|\|\1\.startsWith\(`\$\{e\.href\}\/`\)/
    const concatPattern = /([A-Za-z_$][\w$]*)=\(0,([A-Za-z_$][\w$]*)\.usePathname\)\(\),([A-Za-z_$][\w$]*)=p\.map\(e=>\{let ([A-Za-z_$][\w$]*)=\1===e\.href\|\|\1\.startsWith\(""\.concat\(e\.href,"\/"\)\)/
    const activeMatch = source.match(templatePattern) || source.match(concatPattern)
    if (!activeMatch) throw new Error(`customer active navigation logic not found: ${file}`)
    const [, pathname, navigationModule, mapped, active] = activeMatch
    const pathPrefix = activeMatch[0].includes('"".concat') ? `${pathname}.startsWith("".concat(e.href,"/"))` : `${pathname}.startsWith(\`\${e.href}/\`)`
    const next = `${pathname}=(0,${navigationModule}.usePathname)(),customerChatParams=(0,${navigationModule}.useSearchParams)(),customerChatView="chat"===customerChatParams.get("view"),${mapped}=p.map(e=>{let ${active}=e.href.includes("view=chat")?customerChatView:"/u/appointments"===e.href&&customerChatView?!1:${pathname}===e.href||${pathPrefix}`
    source = source.replace(activeMatch[0], next)
  }
  fs.writeFileSync(file, source)
}

function patchCustomerChat(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('customer-chat-layout')) {
    if (!source.includes('c=q?.threadId?r.find(e=>e.id===q.threadId):null')) {
      throw new Error('customer chat explicit thread selection is missing')
    }
    source = replaceOnce(
      source,
      'className:"grid gap-4",children:[s.jsx("aside",{className:c?"hidden":"rounded-[22px] border border-[#e8ded2] bg-white p-3 shadow-sm"',
      'className:"customer-chat-layout "+(c?"customer-chat-open ":"customer-chat-listing ")+"grid gap-4",children:[s.jsx("aside",{className:c?"customer-chat-thread-list hidden":"customer-chat-thread-list rounded-[22px] border border-[#e8ded2] bg-white p-3 shadow-sm"',
      'customer chat layout and thread-list classes',
    )
    source = replaceOnce(
      source,
      's.jsx("section",{className:"flex min-h-[560px] flex-col rounded-[22px] border border-[#e8ded2] bg-[#f3eee9] p-4 shadow-sm"',
      's.jsx("section",{className:"customer-chat-conversation flex min-h-[560px] flex-col rounded-[22px] border border-[#e8ded2] bg-[#f3eee9] p-4 shadow-sm"',
      'customer chat conversation class',
    )
    source = replaceOnce(
      source,
      'className:"mb-3 inline-flex min-h-10 items-center self-start rounded-full bg-white px-4 text-xs font-semibold text-[#8f4f42] shadow-sm"',
      'className:"customer-chat-mobile-back mb-3 inline-flex min-h-10 items-center self-start rounded-full bg-white px-4 text-xs font-semibold text-[#8f4f42] shadow-sm"',
      'customer chat mobile back class',
    )
  }
  fs.writeFileSync(file, source)
}

const icons = {
  home: `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7'%3E%3Cpath d='M3 10.5 12 3l9 7.5'/%3E%3Cpath d='M5 9.5V21h14V9.5'/%3E%3Cpath d='M9 21v-7h6v7'/%3E%3C/g%3E%3C/svg%3E`,
  calendar: `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7'%3E%3Crect x='3' y='5' width='18' height='16' rx='2'/%3E%3Cpath d='M16 3v4M8 3v4M3 10h18'/%3E%3C/g%3E%3C/svg%3E`,
  clock: `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/g%3E%3C/svg%3E`,
  mail: `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='m3 7 9 6 9-6'/%3E%3C/g%3E%3C/svg%3E`,
  menu: `%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7' d='M4 6h16M4 12h16M4 18h16'/%3E%3C/svg%3E`,
}

const bodyScope = 'body:has(.customer-premium-topbar):not(#customer-premium-shell)'
const outerSidebar = `${bodyScope}>div:first-child>div>div.mx-auto.min-h-screen.w-full>aside`
const bottomNav = `${bodyScope}>div:first-child>div>nav:last-child`
const sharedCss = `
/* Customer shell and chat correction: match the /u/home frame exactly. */
${outerSidebar} nav a svg,${bottomNav} a svg{display:none!important}
${outerSidebar} nav a:before,${bottomNav} a:before{content:"";display:block;width:21px;height:21px;flex:0 0 21px;background:currentColor;mask-position:center;mask-repeat:no-repeat;mask-size:contain}
${outerSidebar} nav a[href="/u/home"]:before,${bottomNav} a[href="/u/home"]:before{mask-image:url("data:image/svg+xml,${icons.home}")}
${outerSidebar} nav a[href="/u/appointments"]:before,${bottomNav} a[href="/u/appointments"]:before{mask-image:url("data:image/svg+xml,${icons.calendar}")}
${outerSidebar} nav a[href="/u/history"]:before,${bottomNav} a[href="/u/history"]:before{mask-image:url("data:image/svg+xml,${icons.clock}")}
${outerSidebar} nav a[href="/u/appointments?view=chat"]:before,${bottomNav} a[href="/u/appointments?view=chat"]:before{mask-image:url("data:image/svg+xml,${icons.mail}")}
${outerSidebar} nav a[href="/u/menu"]:before,${bottomNav} a[href="/u/menu"]:before{mask-image:url("data:image/svg+xml,${icons.menu}")}
.customer-chat-mobile-back{display:none;color:var(--customer-rose-dark);font-size:12px;font-weight:700}
@media(max-width:1023px){
${bodyScope} main .customer-chat-layout{grid-template-columns:minmax(0,1fr)!important}
${bodyScope} main .customer-chat-open>.customer-chat-thread-list{display:none!important}
${bodyScope} main .customer-chat-conversation{min-height:460px!important;padding:14px!important}
${bodyScope} main .customer-chat-mobile-back{display:inline-flex;align-items:center;margin:0 0 12px}
}
@media(min-width:1024px){
${bodyScope}>div:first-child{max-width:1440px!important}
${bodyScope}>div:first-child>div>div.mx-auto.min-h-screen.w-full{grid-template-columns:238px minmax(0,1fr)!important;max-width:1440px!important}
${bodyScope} main{width:100%!important;max-width:1120px!important}
${bodyScope} main .customer-chat-layout{grid-template-columns:16rem minmax(0,1fr)!important}
${bodyScope} main .customer-chat-thread-list{display:block!important;position:static!important;top:auto!important;width:auto!important;height:auto!important;min-height:560px!important;flex:none!important;padding:12px!important;border:1px solid var(--customer-line)!important;background:#fff!important}
${bodyScope} main .customer-chat-thread-list>div:last-child{display:grid!important}
}
`

function patchCss() {
  const cssRoot = path.join(appRoot, '.next/static/css')
  const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))
  if (!cssFiles.length) throw new Error('application stylesheet not found')
  const renamed = []
  for (const cssFile of cssFiles) {
    const cssPath = path.join(cssRoot, cssFile)
    let css = fs.readFileSync(cssPath, 'utf8')
    if (!css.includes('Customer shell and chat correction')) css += sharedCss
    fs.writeFileSync(cssPath, css)
    const nextName = cssFile.replace(/(?:\.customer-shell-chat-v\d+)?\.css$/, '.customer-shell-chat-v36.css')
    if (nextName !== cssFile) {
      fs.renameSync(cssPath, path.join(cssRoot, nextName))
      replaceReferences(path.join(appRoot, '.next'), cssFile, nextName)
    }
    renamed.push(nextName)
  }
  return renamed
}

patchCustomCustomerShell(path.join(appRoot, 'server.js'))

const serverLayout = path.join(appRoot, '.next/server/chunks/1597.js')
patchLayout(serverLayout)

const staticLayoutRoot = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const layoutFile = fs.readdirSync(staticLayoutRoot).find(name => /^layout-.*\.js$/.test(name))
if (!layoutFile) throw new Error('customer static layout chunk not found')
const layoutPath = path.join(staticLayoutRoot, layoutFile)
patchLayout(layoutPath)
const nextLayoutFile = layoutFile.replace(/(?:\.customer-shell-chat-v\d+)?\.js$/, '.customer-shell-chat-v36.js')
if (nextLayoutFile !== layoutFile) {
  fs.renameSync(layoutPath, path.join(staticLayoutRoot, nextLayoutFile))
  replaceReferences(path.join(appRoot, '.next'), layoutFile, nextLayoutFile)
}

patchCustomerChat(path.join(appRoot, '.next/server/app/u/(account)/appointments/page.js'))
const css = patchCss()

console.log(JSON.stringify({ patched: [serverLayout, nextLayoutFile, ...css] }))
