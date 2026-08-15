'use strict'

const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')
const marker = 'customer-booking-hydration-gate-v132'

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

function scanExpressionEnd(source, start) {
  const pairs = { '(': ')', '[': ']', '{': '}' }
  if (!pairs[source[start]]) throw new Error(`expression does not start with a bracket at ${start}`)
  const stack = []
  let quote = ''
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue }
    if (pairs[character]) stack.push(pairs[character])
    else if (stack.length && character === stack[stack.length - 1]) {
      stack.pop()
      if (!stack.length) return index + 1
    }
  }
  throw new Error(`unterminated expression at ${start}`)
}

function componentBounds(source) {
  const candidates = [...source.matchAll(/function\s+[A-Za-z_$][\w$]*\s*\(/g)].reverse()
  for (const match of candidates) {
    const parametersStart = source.indexOf('(', match.index)
    let parametersEnd
    try { parametersEnd = scanExpressionEnd(source, parametersStart) } catch { continue }
    let bodyStart = parametersEnd
    while (/\s/.test(source[bodyStart] || '')) bodyStart += 1
    if (source[bodyStart] !== '{') continue
    let bodyEnd
    try { bodyEnd = scanExpressionEnd(source, bodyStart) } catch { continue }
    const body = source.slice(bodyStart, bodyEnd)
    if (body.includes('className:"grid gap-6"') && body.includes('空き状況を確認しています') && body.includes('/api/customer/appointments')) {
      return { start: match.index, end: bodyEnd, bodyStart }
    }
  }
  throw new Error('customer booking component was not found')
}

function transformHydrationGate(source) {
  if (source.includes(marker)) return source
  const bounds = componentBounds(source)
  let component = source.slice(bounds.start, bounds.end)
  const localBodyStart = bounds.bodyStart - bounds.start

  const stateMatch = component.match(/\(0,\s*([A-Za-z_$][\w$]*)\.useState\)\(/)
  if (!stateMatch) throw new Error('customer booking React hook alias was not found')
  const reactAlias = stateMatch[1]
  const hydrationHooks = `let[__customerHydrated,__setCustomerHydrated]=(0,${reactAlias}.useState)(false);(0,${reactAlias}.useEffect)(()=>{__setCustomerHydrated(true)},[]);`
  component = component.slice(0, localBodyStart + 1) + hydrationHooks + component.slice(localBodyStart + 1)

  const rootMatch = component.match(/\(0,\s*([A-Za-z_$][\w$]*)\.jsxs\)\("div",\{className:"grid gap-6"/)
  if (!rootMatch) throw new Error('customer booking root was not found')
  const jsxAlias = rootMatch[1]
  const rootStart = rootMatch.index
  const callStart = component.indexOf('(', component.indexOf(')', rootStart) + 1)
  if (callStart < 0) throw new Error('customer booking root call was not found')
  const rootEnd = scanExpressionEnd(component, callStart)
  const rootExpression = component.slice(rootStart, rootEnd)
  const placeholder = `(0,${jsxAlias}.jsxs)("div",{className:"grid min-h-[520px] place-items-center rounded-[24px] border border-[#e8ded2] bg-white shadow-sm",role:"status","aria-live":"polite","aria-busy":"true",children:[(0,${jsxAlias}.jsx)("span",{className:"h-8 w-8 animate-spin rounded-full border-2 border-[#ead8d1] border-t-[#cf667e]","aria-hidden":"true"}),(0,${jsxAlias}.jsx)("span",{className:"sr-only",children:"予約画面を読み込んでいます"})]})`
  component = component.slice(0, rootStart) + `(__customerHydrated?${rootExpression}:${placeholder})` + component.slice(rootEnd)

  if (!component.includes('__customerHydrated') || !component.includes('aria-busy')) throw new Error('customer booking hydration gate was not installed')
  component += `/* ${marker} */`
  return source.slice(0, bounds.start) + component + source.slice(bounds.end)
}

function replaceReferences(root, oldName, newName, excludedFile) {
  let count = 0
  for (const file of walk(root)) {
    if (file === excludedFile || !/\.(?:js|json|html)$/.test(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes(oldName)) continue
    fs.writeFileSync(file, source.replaceAll(oldName, newName))
    count += 1
  }
  return count
}

function patchRuntime() {
  const serverFiles = walk(path.join(nextRoot, 'server')).filter(file => file.endsWith('.js'))
  const staticFiles = walk(path.join(nextRoot, 'static')).filter(file => file.endsWith('.js'))
  const manifestPath = path.join(nextRoot, 'app-build-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const activeAssets = new Set(manifest.pages?.['/u/(account)/appointments/page'] || [])
  const serverPageSuffix = path.join('server', 'app', 'u', '(account)', 'appointments', 'page.js')
  const serverTargets = serverFiles.filter(file => {
    if (!file.endsWith(serverPageSuffix)) return false
    const source = fs.readFileSync(file, 'utf8')
    return source.includes('className:"grid gap-6"') && source.includes('空き状況を確認しています')
  })
  const staticTargets = staticFiles.filter(file => {
    const relative = path.relative(nextRoot, file).replaceAll('\\', '/')
    if (!activeAssets.has(relative)) return false
    const source = fs.readFileSync(file, 'utf8')
    return source.includes('business-schedule-v127-customer') && source.includes('/api/customer/appointments/availability')
  })
  if (serverTargets.length !== 1) throw new Error(`expected one customer booking server target, found ${serverTargets.length}`)
  if (staticTargets.length !== 1) throw new Error(`expected one active customer booking static target, found ${staticTargets.length}`)

  const serverSource = transformHydrationGate(fs.readFileSync(serverTargets[0], 'utf8'))
  new Function(serverSource)
  fs.writeFileSync(serverTargets[0], serverSource)

  const oldFile = staticTargets[0]
  const oldName = path.basename(oldFile)
  const staticSource = transformHydrationGate(fs.readFileSync(oldFile, 'utf8'))
  new Function(staticSource)
  const newName = oldName.replace(/(?:\.customer-hydration-gate-v\d+)?\.js$/, '.customer-hydration-gate-v132.js')
  const newFile = path.join(path.dirname(oldFile), newName)
  fs.writeFileSync(newFile, staticSource)
  if (newFile !== oldFile) fs.unlinkSync(oldFile)
  const references = replaceReferences(nextRoot, oldName, newName, newFile)
  if (!references) throw new Error('customer booking chunk references were not cache-busted')

  return {
    marker,
    serverFile: path.relative(appRoot, serverTargets[0]),
    staticFile: path.relative(appRoot, newFile),
    references,
  }
}

if (require.main === module) console.log(JSON.stringify(patchRuntime()))
module.exports = { scanExpressionEnd, componentBounds, transformHydrationGate, patchRuntime }

