import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const workflowPath = `${root}/ui-workflows-v294.js`
const customerRuntimePath = `${root}/customer-runtime-v267.js`
const workflow = fs.readFileSync(workflowPath, 'utf8')
const customerRuntime = fs.readFileSync(customerRuntimePath, 'utf8')
const legacyLifecycle = `  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.setInterval(boot, 1000)`

const assertions = [
  [workflow.includes('customer-chat-open-v468'), 'v468 lifecycle marker exists'],
  [workflow.includes("for (const method of ['pushState', 'replaceState'])"), 'history transitions schedule chat initialization'],
  [workflow.includes("window.addEventListener('pageshow', scheduleBoot)"), 'pageshow schedules chat initialization'],
  [workflow.includes("window.addEventListener('popstate', scheduleBoot)"), 'popstate schedules chat initialization'],
  [workflow.includes("window.setTimeout(boot, 250)"), 'delayed initial stabilization remains'],
  [workflow.includes("window.setInterval(() => {\n      if (location.pathname === '/u/chat'"), 'message refresh remains'],
  [workflow.includes("script.src = '/content-edit-delete-client-v466.js'"), 'chat edit/delete enhancer remains'],
  [workflow.includes("new CustomEvent('lien:chat-rendered')"), 'chat render event remains'],
  [!workflow.includes(legacyLifecycle), 'document-wide chat observer and boot interval were removed'],
  [!workflow.includes('window.setInterval(boot, 1000)'), 'one-second boot loop was removed'],
  [customerRuntime.includes("script.src='/ui-workflows-v294.js?v=468'"), 'customer runtime cache key is v468'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [workflowPath, customerRuntimePath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`customer chat open v468 verified (${assertions.length} assertions)`)
