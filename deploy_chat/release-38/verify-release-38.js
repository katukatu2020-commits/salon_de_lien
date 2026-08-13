const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const staticAppRoot = path.join(appRoot, '.next/static/chunks/app')
const staticLayout = fs.readdirSync(staticAppRoot).find(name => /^layout-sidebar-boundary-.*\.admin-mobile-v38\.js$/.test(name))
if (!staticLayout) throw new Error('renamed admin layout chunk missing')
const layout = fs.readFileSync(path.join(staticAppRoot, staticLayout), 'utf8')
const chat = fs.readFileSync(path.join(appRoot, '.next/server/app/admin/customers/messages/page.js'), 'utf8')
const cssRoot = path.join(appRoot, '.next/static/css')
const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.admin-mobile-v38.css'))
const css = cssFiles.map(name => fs.readFileSync(path.join(cssRoot, name), 'utf8')).join('\n')

const checks = [
  ['admin and customer shells are isolated', layout.includes('admin-app-shell admin-mobile-workspace-v38')],
  ['desktop sidebar has a mobile navigation hook', layout.includes('admin-desktop-sidebar fixed inset-y-0')],
  ['admin headers and main have stable hooks', ['admin-shell-header', 'admin-mobile-header', 'admin-desktop-header', 'admin-main-content'].every(value => layout.includes(value))],
  ['chat uses explicit thread selection', chat.includes('admin-chat-explicit-selection-v38')],
  ['chat has mobile layout hooks', ['admin-chat-layout', 'admin-chat-thread-list', 'admin-chat-conversation', 'admin-chat-mobile-back'].every(value => chat.includes(value))],
  ['admin width reset is present', css.includes('max-width:none!important') && css.includes('body:has(.admin-app-shell)')],
  ['mobile thumb navigation is present', css.includes('repeat(5,minmax(0,1fr))') && css.includes('admin-desktop-sidebar nav a[aria-current="page"]')],
  ['tables and shift board remain operable', css.includes('div:has(>table)') && css.includes('.isolate:has([data-staff-name])')],
  ['mobile chat uses list then conversation flow', css.includes('admin-chat-layout:not(:has(.admin-chat-conversation h2))') && css.includes('admin-chat-layout:has(.admin-chat-conversation h2)')],
  ['mobile dialogs are viewport bounded', css.includes('[role="dialog"]') && css.includes('max-height:100dvh')],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name), staticLayout, cssFiles }))
