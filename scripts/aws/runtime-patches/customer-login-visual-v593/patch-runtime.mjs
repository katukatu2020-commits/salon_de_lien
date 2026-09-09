import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const css = fs.readFileSync(path.join(root, 'public/customer-login-visual-v593.css'), 'utf8').replace(/\r\n/g, '\n')
export const changes = [
  ['page.js', 's.jsx("link",{rel:"stylesheet",href:"/customer-login-visual-v593.css"})', 's.jsx("style",{id:"customer-login-visual-v593",dangerouslySetInnerHTML:{__html:' + JSON.stringify(css) + '}})'],
]
export function paths(root) { return { 'page.js': path.join(root, '.next/server/app/u/login/page.js'), 'server.js': path.join(root, 'server.js') } }
if (process.argv.includes('--apply')) {
  const targets = paths(process.env.LIEN_RUNTIME_ROOT || '/app')
  for (const [name, before, after] of changes) {
    const source = fs.readFileSync(targets[name], 'utf8')
    if (source.split(before).length !== 2) throw new Error('Unexpected v593 parent anchor: ' + name + ' / ' + before.slice(0, 80))
    fs.writeFileSync(targets[name], source.replace(before, after))
  }
  console.log('Customer login visual v593: inline route-scoped photo styles to prevent a navigation flash.')
}
