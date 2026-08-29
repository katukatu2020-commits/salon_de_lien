import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const workflowPath = `${root}/ui-workflows-v294.js`
const customerRuntimePath = `${root}/customer-runtime-v267.js`
const marker = 'customer-chat-open-v468'

const legacyLifecycle = `  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.setInterval(boot, 1000)`

const stableLifecycle = `  /* ${marker}: initialize on navigation boundaries without observing chat's own DOM writes. */
  const scheduleBoot = () => {
    window.clearTimeout(window.__lienUiWorkflowsBootTimerV468)
    window.__lienUiWorkflowsBootTimerV468 = window.setTimeout(boot, 0)
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      scheduleBoot()
      window.setTimeout(scheduleBoot, 220)
      return result
    }
  }
  window.addEventListener('popstate', scheduleBoot)
  window.addEventListener('pageshow', scheduleBoot)
  window.setTimeout(boot, 250)`

const workflow = fs.readFileSync(workflowPath, 'utf8')
if (workflow.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)
const lifecycleCount = workflow.split(legacyLifecycle).length - 1
if (lifecycleCount !== 1) throw new Error(`${marker}: expected one legacy customer-chat lifecycle, found ${lifecycleCount}`)
fs.writeFileSync(workflowPath, workflow.replace(legacyLifecycle, stableLifecycle))

const customerRuntime = fs.readFileSync(customerRuntimePath, 'utf8')
const oldCacheKey = "script.src='/ui-workflows-v294.js?v=427'"
const newCacheKey = "script.src='/ui-workflows-v294.js?v=468'"
const cacheKeyCount = customerRuntime.split(oldCacheKey).length - 1
if (cacheKeyCount !== 1) throw new Error(`${marker}: expected one customer workflow cache key, found ${cacheKeyCount}`)
fs.writeFileSync(customerRuntimePath, customerRuntime.replace(oldCacheKey, newCacheKey))

console.log(`${marker} runtime patched`)
