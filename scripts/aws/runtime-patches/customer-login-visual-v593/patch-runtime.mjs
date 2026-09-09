import fs from 'node:fs'
import path from 'node:path'

export const changes = [
  ['page.js', 'children:[s.jsx(c.n8,{variant:"customerCare"', 'children:[s.jsx("link",{rel:"stylesheet",href:"/customer-login-visual-v593.css"}),s.jsx(c.n8,{variant:"customerCare"'],
  ['page.js', 'className:"h-56 overflow-hidden rounded-[24px]', 'className:"customer-login-visual-v593 h-56 overflow-hidden rounded-[24px]'],
  ['page.js', 'className:"flex h-full flex-col justify-between bg-gradient-to-r from-[#fffdf9]/95 via-[#fffdf9]/70 to-transparent p-6"', 'className:"customer-login-copy-v593 flex h-full flex-col justify-end p-6"'],
  ['page.js', 'children:[s.jsx("span",{className:"grid h-11 w-11 place-items-center rounded-full bg-[#8f4f42] text-white shadow-sm",children:s.jsx(i.Z,{className:"h-5 w-5"})}),(0,s.jsxs)("div",{children:[s.jsx("p",{className:"text-2xl font-semibold",children:"ORIMIA"})', 'children:[(0,s.jsxs)("div",{children:[s.jsx("p",{className:"text-2xl font-semibold",children:"ORIMIA"})'],
  ['server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Registration-Layout', 'v592')", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Registration-Layout', 'v592')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Login-Visual', 'v593')"],
]

export function paths(root) { return { 'page.js': path.join(root, '.next/server/app/u/login/page.js'), 'server.js': path.join(root, 'server.js') } }
if (process.argv.includes('--apply')) {
  const targets = paths(process.env.LIEN_RUNTIME_ROOT || '/app')
  for (const [name, before, after] of changes) {
    const source = fs.readFileSync(targets[name], 'utf8')
    if (source.split(before).length !== 2) throw new Error('Unexpected v592 parent anchor: ' + name + ' / ' + before.slice(0, 80))
    fs.writeFileSync(targets[name], source.replace(before, after))
  }
  console.log('Customer login visual v593: removed decorative icon and white overlays from login rendering only.')
}
