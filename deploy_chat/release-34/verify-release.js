const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const serverLayout = fs.readFileSync(path.join(appRoot, '.next/server/chunks/1597.js'), 'utf8')
const layoutRoot = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const layoutFiles = fs.readdirSync(layoutRoot).filter(name => /^layout-.*\.js$/.test(name))
const cssRoot = path.join(appRoot, '.next/static/css')
const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))

if (layoutFiles.length !== 1) throw new Error(`Expected one customer layout chunk, found ${layoutFiles.length}`)
if (!layoutFiles[0].includes('.customer-home-unified-v35.js')) throw new Error(`Customer layout is not versioned: ${layoutFiles[0]}`)
const staticLayout = fs.readFileSync(path.join(layoutRoot, layoutFiles[0]), 'utf8')

for (const [source, label] of [[serverLayout, 'server layout'], [staticLayout, 'static layout']]) {
  if (!source.includes('className:"customer-premium-topbar"')) throw new Error(`${label}: premium topbar missing`)
  if (!source.includes('className:"customer-premium-brand"')) throw new Error(`${label}: premium brand missing`)
  if (!source.includes('href:"/u/menu",className:"customer-premium-icon-button"')) throw new Error(`${label}: menu route missing`)
  if (!source.includes('href:"/u/news",className:"customer-premium-icon-button"')) throw new Error(`${label}: notice route missing`)
  if (source.includes('Salon de Lien Customer Portal')) throw new Error(`${label}: legacy portal header remains`)
}

for (const cssFile of cssFiles) {
  if (!cssFile.includes('.customer-home-unified-v35.css')) throw new Error(`Stylesheet is not versioned: ${cssFile}`)
  const css = fs.readFileSync(path.join(cssRoot, cssFile), 'utf8')
  for (const needle of [
    'Customer routes use the exact visual frame',
    'max-width:1440px!important',
    'grid-template-columns:238px minmax(0,1fr)!important',
    'max-width:1120px!important',
    '--customer-rose:#d85d79',
    'body:has(.customer-premium-topbar):not(#customer-premium-shell)',
  ]) {
    if (!css.includes(needle)) throw new Error(`${cssFile}: missing ${needle}`)
  }
}

console.log(JSON.stringify({ verified: ['server customer shell', layoutFiles[0], ...cssFiles] }))
