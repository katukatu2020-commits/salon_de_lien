'use strict'

const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')
const marker = 'shift-hydration-gate-v131'

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
    if (body.includes('shift-canvas') && body.includes('/api/admin/store-profile') && body.includes('salon-capacity-overrides:')) {
      return { start: match.index, end: bodyEnd }
    }
  }
  throw new Error('business-schedule shift component was not found')
}

function transformHydrationGate(source) {
  if (source.includes(marker)) return source
  const bounds = componentBounds(source)
  let component = source.slice(bounds.start, bounds.end)

  const statePattern = /(\[__businessSchedule,__setBusinessSchedule\]\s*=\s*\(0,\s*([A-Za-z_$][\w$]*)\.useState\)\([^;]+?__businessDuration\s*=\s*Math\.max\(60,__businessClose-__businessOpen\),)/
  const stateMatch = component.match(statePattern)
  if (!stateMatch) throw new Error('business schedule state was not found')
  const reactAlias = stateMatch[2]
  component = component.replace(statePattern, `$1[__shiftHydrated,__setShiftHydrated]=(0,${reactAlias}.useState)(false),`)

  const listenerIndex = component.indexOf('window.addEventListener("lien:business-schedule-updated"')
  if (listenerIndex < 0) throw new Error('business schedule effect was not found')
  const effectEnd = component.indexOf('},[]);', listenerIndex)
  if (effectEnd < 0) throw new Error('business schedule effect end was not found')
  const effectInsertAt = effectEnd + '},[]);'.length
  component = component.slice(0, effectInsertAt) + `(0,${reactAlias}.useEffect)(()=>{__setShiftHydrated(true)},[]);` + component.slice(effectInsertAt)

  const rootMatch = component.match(/return\s+\(0,\s*([A-Za-z_$][\w$]*)\.jsxs\)\("div",\s*\{\s*className:\s*"(?:lien-reference-shift )?grid gap-4"/)
  if (!rootMatch) throw new Error('shift root return was not found')
  const jsxAlias = rootMatch[1]
  const returnIndex = rootMatch.index
  const placeholder = `if(!__shiftHydrated)return (0,${jsxAlias}.jsxs)("div",{className:"grid min-h-[520px] place-items-center rounded-2xl border border-[color:var(--lien-border)] bg-white shadow-sm",role:"status","aria-live":"polite","aria-busy":"true",children:[(0,${jsxAlias}.jsx)("span",{className:"h-8 w-8 animate-spin rounded-full border-2 border-[#ead8d1] border-t-[color:var(--lien-primary)]","aria-hidden":"true"}),(0,${jsxAlias}.jsx)("span",{className:"sr-only",children:"シフト表を読み込んでいます"})]});`
  component = component.slice(0, returnIndex) + placeholder + component.slice(returnIndex)

  if (!component.includes('__shiftHydrated') || !component.includes('aria-busy')) throw new Error('hydration gate was not installed')
  component += `/* ${marker} */`
  return source.slice(0, bounds.start) + component + source.slice(bounds.end)
}

function referenceCount(root, name, excludedFile) {
  let count = 0
  for (const file of walk(root)) {
    if (file === excludedFile || !/\.(?:js|json|html)$/.test(file)) continue
    if (fs.readFileSync(file, 'utf8').includes(name)) count += 1
  }
  return count
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
  const activeAssets = new Set(manifest.pages?.['/admin/appointments/page'] || [])
  const serverTargets = serverFiles.filter(file => {
    const source = fs.readFileSync(file, 'utf8')
    return source.includes('business-schedule-v127') && source.includes('shift-canvas') && source.includes('/api/admin/store-profile')
  })
  const staticTargets = staticFiles.filter(file => {
    const relative = path.relative(nextRoot, file).replaceAll('\\', '/')
    if (!activeAssets.has(relative)) return false
    const source = fs.readFileSync(file, 'utf8')
    return source.includes('business-schedule-v127') && source.includes('shift-canvas') && source.includes('/api/admin/store-profile')
  })
  if (serverTargets.length !== 1) throw new Error(`expected one server shift target, found ${serverTargets.length}`)
  if (staticTargets.length !== 1) throw new Error(`expected one active static shift target, found ${staticTargets.length}`)

  const serverSource = transformHydrationGate(fs.readFileSync(serverTargets[0], 'utf8'))
  new Function(serverSource)
  fs.writeFileSync(serverTargets[0], serverSource)

  const oldFile = staticTargets[0]
  const oldName = path.basename(oldFile)
  const staticSource = transformHydrationGate(fs.readFileSync(oldFile, 'utf8'))
  new Function(staticSource)
  const newName = oldName.replace(/(?:\.shift-hydration-gate-v\d+)?\.js$/, '.shift-hydration-gate-v131.js')
  const newFile = path.join(path.dirname(oldFile), newName)
  fs.writeFileSync(newFile, staticSource)
  if (newFile !== oldFile) fs.unlinkSync(oldFile)
  const references = replaceReferences(nextRoot, oldName, newName, newFile)
  if (!references) throw new Error('active shift chunk references were not cache-busted')

  return {
    marker,
    serverFile: path.relative(appRoot, serverTargets[0]),
    staticFile: path.relative(appRoot, newFile),
    references,
  }
}

if (require.main === module) console.log(JSON.stringify(patchRuntime()))
module.exports = { scanExpressionEnd, componentBounds, transformHydrationGate, patchRuntime }
