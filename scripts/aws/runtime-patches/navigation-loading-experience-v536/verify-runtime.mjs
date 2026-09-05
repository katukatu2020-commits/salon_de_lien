import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(`${root}/${relative}`, 'utf8')
const server = read('server.js')
const script = read('public/ui-transition-v536.js')
const style = read('public/ui-transition-v536.css')
const adminLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const customerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const cssName = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.navigation-loading-v536-release1.css'
const adminLayout = read(`.next/static/chunks/app/${adminLayoutName}`)
const customerLayout = read(`.next/static/chunks/app/${customerLayoutName}`)
const globalCss = read(`.next/static/css/${cssName}`)

const checks = [
  [server.includes("X-Lien-Navigation-Loading-Experience', 'v536'"), 'readiness marker is installed'],
  [server.includes('id="orimia-customer-transition-v536"'), 'standalone customer uses the new critical style'],
  [server.includes('/ui-transition-v536.js?v=536-release1'), 'standalone customer uses the new script cache key'],
  [!server.includes('/ui-transition-v516.js?v=516-release7'), 'old standalone script is inactive'],
  [script.includes('__orimiaUiTransitionV536'), 'new transition guard is installed'],
  [script.includes('normalizePathname(before.pathname) !== normalizePathname(after.pathname)'), 'page changes compare pathnames'],
  [script.includes("if (!changesPage(before, after)) return"), 'same-page history changes are ignored'],
  [script.includes('ページを移動しています'), 'navigation status copy is available'],
  [script.includes('画面を準備しています'), 'initial status copy is available'],
  [script.includes('orimia-ui-loader-v536__rail'), 'animated progress indicator is rendered'],
  [script.includes("if (root.dataset.orimiaUiReady !== 'v516') ensureLoader()"), 'loader survives framework hydration'],
  [style.includes('@keyframes orimia-ui-mark-v536'), 'logo motion is installed'],
  [style.includes('@keyframes orimia-ui-progress-v536'), 'progress motion is installed'],
  [style.includes('@media (prefers-reduced-motion: no-preference)'), 'active transitions restart motion when allowed'],
  [style.includes('width: 100vw !important'), 'loader covers narrow standalone customer shells'],
  [style.includes('html[data-orimia-ui-ready="v516"] #orimia-ui-loader-v536'), 'ready pages always hide the loader'],
  [style.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion behavior is installed'],
  [adminLayout.includes('navigation-loading-experience-v536'), 'admin layout contains the new runtime'],
  [adminLayout.includes('__orimiaUiTransitionV536'), 'admin layout activates the new transition guard'],
  [customerLayout.includes('__orimiaUiTransitionV536'), 'customer layout activates the new transition guard'],
  [globalCss.includes('orimia-ui-loader-v536__copy'), 'critical application CSS contains the new loader'],
]

for (const [condition, label] of checks) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [
  `${root}/server.js`,
  `${root}/public/ui-transition-v536.js`,
  `${root}/.next/static/chunks/app/${adminLayoutName}`,
  `${root}/.next/static/chunks/app/${customerLayoutName}`,
]) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.stdout}`)
}

console.log(`navigation loading experience v536 verified (${checks.length} checks)`)
