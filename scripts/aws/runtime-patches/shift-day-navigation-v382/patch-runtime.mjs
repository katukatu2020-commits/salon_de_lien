import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function navigationMarkup(jsx, dateVariable, labelVariable) {
  const jsxs = jsx.replace(/jsx$/, 'jsxs')
  const previousHref = `(() => { const day = new Date(new Date(${dateVariable} + "T00:00:00Z").getTime() - 864e5).toISOString().slice(0, 10); return "/admin/appointments?month=" + day.slice(0, 7) + "&date=" + day + "#staff-schedule" })()`
  const nextHref = `(() => { const day = new Date(new Date(${dateVariable} + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10); return "/admin/appointments?month=" + day.slice(0, 7) + "&date=" + day + "#staff-schedule" })()`

  const chevron = (direction) => `${jsx}("svg", {
                            viewBox: "0 0 24 24",
                            className: "h-4 w-4",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            "aria-hidden": "true",
                            children: ${jsx}("path", { d: "${direction === 'previous' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}" }),
                          })`

  return `(0, ${jsxs})("div", {
                        className: "mt-1 flex items-center gap-2",
                        children: [
                          ${jsx}("a", {
                            href: ${previousHref},
                            className: "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-primary-dark)] shadow-[0_4px_14px_rgba(99,67,55,0.08)] transition hover:-translate-y-0.5 hover:border-[color:var(--lien-primary)] hover:bg-[color:var(--lien-primary-soft)] hover:shadow-[0_7px_18px_rgba(99,67,55,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-95",
                            "aria-label": "前日のシフト表へ",
                            title: "前日",
                            "data-shift-day-nav": "previous",
                            children: ${chevron('previous')},
                          }),
                          ${jsx}("h2", {
                            className: "min-w-0 text-xl font-semibold tabular-nums text-[color:var(--lien-ink)]",
                            children: ${labelVariable},
                          }),
                          ${jsx}("a", {
                            href: ${nextHref},
                            className: "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-primary-dark)] shadow-[0_4px_14px_rgba(99,67,55,0.08)] transition hover:-translate-y-0.5 hover:border-[color:var(--lien-primary)] hover:bg-[color:var(--lien-primary-soft)] hover:shadow-[0_7px_18px_rgba(99,67,55,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-95",
                            "aria-label": "翌日のシフト表へ",
                            title: "翌日",
                            "data-shift-day-nav": "next",
                            children: ${chevron('next')},
                          }),
                        ],
                      })`
}

function patchHeader(source, { jsxNamespace, dateVariable, labelVariable, label }) {
  const jsx = `${jsxNamespace}.jsx`
  const pattern = new RegExp(
    `(?:\\(0,\\s*)?${escapeRegex(jsx)}(?:\\))?\\("h2",\\s*\\{\\s*className:\\s*"mt-1 text-xl font-semibold text-\\[color:var\\(--lien-ink\\)\\]",\\s*children:\\s*${escapeRegex(labelVariable)},\\s*\\}\\)`,
    'g',
  )
  const matches = [...source.matchAll(pattern)]
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}`)
  return source.replace(pattern, navigationMarkup(jsx, dateVariable, labelVariable))
}

const serverPath = '/app/.next/server/app/admin/appointments/page.js'
let server = fs.readFileSync(serverPath, 'utf8')
server = patchHeader(server, {
  jsxNamespace: 'n',
  dateVariable: 'e',
  labelVariable: 't',
  label: 'server shift day navigation',
})
new Function(server)
fs.writeFileSync(serverPath, server)

const staticDirectory = '/app/.next/static/chunks/app/admin/appointments'
const oldName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.free-pool-v372.js'
const newName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'
const oldPath = path.join(staticDirectory, oldName)
const newPath = path.join(staticDirectory, newName)
let browserChunk = fs.readFileSync(oldPath, 'utf8')
browserChunk = patchHeader(browserChunk, {
  jsxNamespace: 'r',
  dateVariable: 't',
  labelVariable: 'n',
  label: 'browser shift day navigation',
})
new Function(browserChunk)
fs.writeFileSync(newPath, browserChunk)

for (const referenceFile of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/appointments/page_client-reference-manifest.js',
]) {
  const manifest = fs.readFileSync(referenceFile, 'utf8')
  const count = manifest.split(oldName).length - 1
  if (count < 1) throw new Error(`missing shift chunk reference: ${referenceFile}`)
  fs.writeFileSync(referenceFile, manifest.replaceAll(oldName, newName))
}

console.log('shift day navigation v382 runtime patch applied')
