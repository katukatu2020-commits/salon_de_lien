import fs from 'node:fs'
import path from 'node:path'

const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const previousLayoutName = 'layout-customer-stability-v373.js'
const currentLayoutName = 'layout-customer-community-v378.js'
const previousLayoutPath = path.join(layoutDirectory, previousLayoutName)
const currentLayoutPath = path.join(layoutDirectory, currentLayoutName)

let layout = fs.readFileSync(previousLayoutPath, 'utf8')
layout += `;(()=>{
  if(window.__lienCustomerCommunityMobileV378)return;
  window.__lienCustomerCommunityMobileV378=true;
  const load=()=>{
    if(document.querySelector('script[data-lien-customer-community-mobile-v378]'))return;
    const script=document.createElement('script');
    script.src='/customer-community-mobile-v377.js';
    script.async=true;
    script.dataset.lienCustomerCommunityMobileV378='1';
    document.head.appendChild(script);
  };
  load();
})()`
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
