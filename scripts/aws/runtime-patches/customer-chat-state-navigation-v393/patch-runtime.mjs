import fs from 'node:fs'
import path from 'node:path'

const workflowPath = '/app/ui-workflows-v294.js'
const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const oldLayoutName = 'layout-community-aspect-v383.js'
const newLayoutName = 'layout-customer-chat-v393.js'
const oldLayoutPath = path.join(layoutDirectory, oldLayoutName)
const newLayoutPath = path.join(layoutDirectory, newLayoutName)

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let workflow = fs.readFileSync(workflowPath, 'utf8')
workflow = replaceOnce(
  workflow,
  "    const chatRoot = portal.querySelector('.lien-chat-v294')\n\n    const staffIdentity",
  `    const chatRoot = portal.querySelector('.lien-chat-v294')
    const state = {
      threads: [],
      directory: [],
      activeKey: null,
      activeThreadId: null,
      sending: false,
    }

    const staffIdentity`,
  'customer chat state initialization',
)

workflow = replaceOnce(
  workflow,
  '  function removeSmsPanelFallback() {',
  `  function syncCustomerNavigationState() {
    const currentPath = location.pathname
    if (!currentPath.startsWith('/u/')) return

    document.querySelectorAll('nav[aria-label="お客様アプリメニュー"]').forEach(nav => {
      const links = Array.from(nav.querySelectorAll('a[data-customer-navigation="document"]'))
      const desired = links.find(link => {
        const href = new URL(link.href, location.href).pathname
        return currentPath === href || currentPath.startsWith(href + '/')
      })
      if (!desired) return

      const previous = links.find(link => link.getAttribute('aria-current') === 'page')
      if (previous && previous !== desired) {
        const previousClassName = previous.className
        previous.className = desired.className
        desired.className = previousClassName
      }
      links.forEach(link => {
        if (link === desired) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      })
    })
  }

  function removeSmsPanelFallback() {`,
  'customer navigation synchronization',
)

workflow = replaceOnce(
  workflow,
  '    removeSmsPanelFallback()\n    initCustomerChat()',
  '    removeSmsPanelFallback()\n    syncCustomerNavigationState()\n    initCustomerChat()',
  'customer navigation boot',
)
fs.writeFileSync(workflowPath, workflow)

let layout = fs.readFileSync(oldLayoutPath, 'utf8')
layout = replaceOnce(
  layout,
  'ui-workflows-v294.js?v=366',
  'ui-workflows-v294.js?v=393',
  'customer workflow cache key',
)
fs.writeFileSync(newLayoutPath, layout)

function replaceManifestReferences(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestReferences(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(oldLayoutName)) continue
    source = source.split(oldLayoutName).join(newLayoutName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestReferences('/app/.next')
