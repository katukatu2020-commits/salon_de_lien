import fs from 'node:fs'
import path from 'node:path'
import {afterHydration, patchLayout} from './hydration-gate.mjs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, source) => fs.writeFileSync(path.join(root, file), source)
function exact(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('Unexpected parent: ' + label)
  return source.replace(before, after)
}
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)])
}
const dir = '.next/static/chunks/app/'
const layouts = [
  'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.style-loader-v639.style-list-v640.loading-recovery-v661.js',
  'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.style-loader-v639.style-list-v640.loading-recovery-v661.js',
]
const replacements = []
for (const [i, file] of layouts.entries()) {
  const renamed = file.replace(/\.js$/, '.hydration-v680.js')
  write(dir + renamed, patchLayout(read(dir + file), i === 1))
  replacements.push([file, renamed])
}
write('public/shell-consistency-v680.js', afterHydration(read('public/shell-consistency-v518.js')))
replacements.push(['/shell-consistency-v518.js?v=551-release1', '/shell-consistency-v680.js?v=680'])
write('public/customer-journey-v680.js', afterHydration(read('public/customer-journey-v601.js').split('登録済みの店舗').join('サロンを探す')))
replacements.push(['/customer-journey-v601.js?v=644-menu-scroll1', '/customer-journey-v680.js?v=680'])
write('public/content-edit-delete-client-v680.js', afterHydration(read('public/content-edit-delete-client-v615.js')))
replacements.push(['/content-edit-delete-client-v615.js?v=676-owner1', '/content-edit-delete-client-v680.js?v=680'])
const additionalAssets=['coupon-email-delivery-v613.js','style-system-integration-v602.js','style-community-controls-v610.js','style-admin-controls-v618.js','style-order-focus-stability-v667.js','customer-registration-resend-v347.js','password-visibility-v627.js','inventory-orders-common-layout-v572.js']
const generatedAssets=['public/shell-consistency-v680.js','public/customer-journey-v680.js','public/content-edit-delete-client-v680.js',...layouts.map(f=>dir+f.replace(/\.js$/,'.hydration-v680.js'))]
additionalAssets.push('broadcast-recipient-modal.js')
for (const file of additionalAssets) {
  const renamed=file.replace(/\.js$/,'.hydration-v680.js')
  write('public/'+renamed,afterHydration(read(file==='customer-registration-resend-v347.js'?file:'public/'+file)))
  replacements.push(['/'+file,'/'+renamed])
  generatedAssets.push('public/'+renamed)
}
// Keep immutable parent assets intact and update only the new release's references.
for (const file of [path.join(root, 'server.js'), ...files(path.join(root, '.next/server')), ...fs.readdirSync(path.join(root, '.next')).filter(f => f.endsWith('.json')).map(f => path.join(root, '.next', f)),...generatedAssets.map(f=>path.join(root,f))]) {
  if (!/\.(?:js|json)$/.test(file)) continue
  const before = fs.readFileSync(file, 'utf8')
  let after = before
  for (const [oldName, newName] of replacements) after = after.split(oldName).join(newName)
  if (after !== before) fs.writeFileSync(file, after)
}
const actionFile = '.next/server/chunks/2241.js'
let action=exact(read(actionFile), 'throw Error("ログインIDまたはパスワードの形式が正しくありません。");', '(0,l.redirect)(i("credentials"));', 'registration credentials error')
action=exact(action,'let d=(0,k.Zd)((0,w.Jc)(e,"loginId")),u=(0,w.Jc)(e,"email").trim().toLowerCase(),m=n.email.trim().toLowerCase(),g=(0,w.Jc)(e,"password");','let d=(0,k.Zd)(String(e.get("loginId")||"")),u=String(e.get("email")||"").trim().toLowerCase(),m=n.email.trim().toLowerCase(),g=String(e.get("password")||"");','missing registration credentials')
write(actionFile,action)
const registrationFile = '.next/server/app/u/register/[token]/page.js'
let registration = read(registrationFile)
registration = exact(registration, 'pattern:"[A-Za-z0-9_-]+"', 'pattern:"(?:[A-Za-z0-9_]|-)+",title:"半角英数字・ハイフン・アンダースコアで4〜24文字"', 'HTML v-mode pattern')
const errorAnchor = 'a?.error==="loginId"?s.jsx("p",'
registration = exact(registration, errorAnchor, 'a?.error==="credentials"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"ログインIDは半角英数字・ハイフン・アンダースコアで4〜24文字、パスワードは8〜72文字で入力してください。"}):null,' + errorAnchor, 'registration validation message')
write(registrationFile, registration)
let server = read('server.js')
server = exact(server,"path.join(dir, 'customer-registration-resend-v347.js')","path.join(dir, 'public/customer-registration-resend-v347.hydration-v680.js')",'registration resend asset handler')
const marker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Platform-Usage-Payments', 'v679') /* platform-usage-payments-v679-ready */"
server = exact(server, marker, marker + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Three-App-QA', 'v680') /* three-app-qa-v680 */", 'health marker')
write('server.js', server)
console.log('Three-app QA v680: hydration order, layout parity, registration validation patched')
