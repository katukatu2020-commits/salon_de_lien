const fs = require('fs')

const file = `${process.env.APP_ROOT || '/app'}/.next/server/chunks/3491.js`
let source = fs.readFileSync(file, 'utf8')
let count = 0
source = source.replace(/className:"px-4 py-3 text-right",children:a\.jsx\(n\.default,\{href:e\.href,className:"([^"]+)",children:"([^"]+)"\}\)/g, (_match, detailClass, detailLabel) => {
  count += 1
  return `className:"px-4 py-3 text-right",children:(0,a.jsxs)("div",{className:"flex items-center justify-end gap-3",children:[a.jsx(n.default,{href:"/admin/customers/messages/chat?customerId="+encodeURIComponent(e.customer.id),className:"text-xs font-semibold text-[#8f4f42] hover:text-[#6f382e]",children:"チャット"}),a.jsx(n.default,{href:e.href,className:"${detailClass}",children:"${detailLabel}"})]})`
})
source = source.replace(/className:"px-5 py-4 text-right",children:a\.jsx\(n\.default,\{href:e\.href,className:"lien-icon-button min-h-9 min-w-9 text-stone-600","aria-label":`\$\{e\.customer\.name\}の詳細`,children:a\.jsx\(x\.Z,\{className:"h-4 w-4"\}\)\}\)/g, () => {
  count += 1
  return 'className:"px-5 py-4 text-right",children:(0,a.jsxs)("div",{className:"flex items-center justify-end gap-2",children:[a.jsx(n.default,{href:"/admin/customers/messages/chat?customerId="+encodeURIComponent(e.customer.id),className:"inline-flex min-h-9 items-center rounded-full bg-[#8f4f42] px-3 text-xs font-semibold text-white",children:"チャット"}),a.jsx(n.default,{href:e.href,className:"lien-icon-button min-h-9 min-w-9 text-stone-600","aria-label":`${e.customer.name}の詳細`,children:a.jsx(x.Z,{className:"h-4 w-4"})})]})'
})
if (!count) throw new Error('customer list action cell was not found')
fs.writeFileSync(file, source)
console.log(JSON.stringify({ file, count }))
