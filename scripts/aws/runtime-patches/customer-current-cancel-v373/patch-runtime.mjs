import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, label, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync('/tmp/customer-current-cancel-v373.js', '/app/public/customer-current-cancel-v373.js')

const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const previousLayoutName = 'layout-customer-stability-v371.js'
const currentLayoutName = 'layout-customer-stability-v373.js'
const previousLayoutPath = path.join(layoutDirectory, previousLayoutName)
const currentLayoutPath = path.join(layoutDirectory, currentLayoutName)
let layout = fs.readFileSync(previousLayoutPath, 'utf8')
layout = replaceOnce(
  layout,
  'route-aware customer cancellation loader',
  `;(()=>{
  if(location.pathname!=='/u/appointments'||document.querySelector('script[data-lien-customer-appointment-cancel-v371]'))return;
  const script=document.createElement('script');
  script.src='/customer-appointment-cancel-v371.js';
  script.async=true;
  script.dataset.lienCustomerAppointmentCancelV371='1';
  document.head.appendChild(script);
})()`,
  `;(()=>{
  const ensure=()=>{
    if(location.pathname!=='/u/appointments'||document.querySelector('script[data-lien-customer-current-cancel-v373]'))return;
    const script=document.createElement('script');
    script.src='/customer-current-cancel-v373.js';
    script.async=true;
    script.dataset.lienCustomerCurrentCancelV373='1';
    document.head.appendChild(script);
  };
  ensure();
  window.addEventListener('popstate',ensure);
  new MutationObserver(ensure).observe(document.documentElement,{childList:true,subtree:true});
})()`,
)
fs.writeFileSync(currentLayoutPath, layout)

function replaceManifestChunkReference(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestChunkReference(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(previousLayoutName)) continue
    source = source.split(previousLayoutName).join(currentLayoutName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestChunkReference('/app/.next')
