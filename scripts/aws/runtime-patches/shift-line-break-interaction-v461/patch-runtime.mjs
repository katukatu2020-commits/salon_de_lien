import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const oldChunkName = 'page-shift-staff-drop-v444.js'
const newChunkName = 'page-shift-line-break-v461.js'
const chunkDir = `${root}/.next/static/chunks/app/admin/appointments`
const oldChunkPath = `${chunkDir}/${oldChunkName}`
const newChunkPath = `${chunkDir}/${newChunkName}`
const appManifestPath = `${root}/.next/app-build-manifest.json`
const clientManifestPath = `${root}/.next/server/app/admin/appointments/page_client-reference-manifest.js`
const breakServicePath = `${root}/staff-breaks-checkout-menu-v442.js`
const breakClientPath = `${root}/staff-breaks-checkout-menu-client-v442.js`
const patchRoot = new URL('.', import.meta.url)
const marker = 'shift-line-break-interaction-v461'

function replaceExactly(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${marker}: expected ${expected} ${label}, found ${count}`)
  return source.split(before).join(after)
}

if (!fs.existsSync(oldChunkPath)) throw new Error(`${marker}: active v444 shift chunk is missing`)
if (fs.existsSync(newChunkPath)) throw new Error(`${marker}: new chunk already exists`)

let shift = fs.readFileSync(oldChunkPath, 'utf8')
if (shift.includes(marker)) throw new Error(`${marker}: shift patch already applied`)
shift = replaceExactly(
  shift,
  `        phone: {
          symbol: "電",`,
  `        line: {
          symbol: "L",
          label: "LINE予約",
          className: "lien-route-line-v461 text-white",
        },
        phone: {
          symbol: "電",`,
  1,
  'LINE route insertion point',
)
shift = replaceExactly(
  shift,
  String.raw`                                        return /hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(`,
  String.raw`                                        return /line公式|line予約|\bline\b|liff/i.test(l)
                                          ? "line"
                                          : /hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(`,
  1,
  'LINE route fallback',
)
shift = shift.replace('(self.webpackChunk_N_E =', `/* ${marker} */\n(self.webpackChunk_N_E =`)
fs.writeFileSync(newChunkPath, shift)

let appManifest = fs.readFileSync(appManifestPath, 'utf8')
appManifest = replaceExactly(appManifest, oldChunkName, newChunkName, 1, 'app-build manifest reference')
fs.writeFileSync(appManifestPath, appManifest)

let clientManifest = fs.readFileSync(clientManifestPath, 'utf8')
clientManifest = replaceExactly(clientManifest, oldChunkName, newChunkName, 7, 'client-reference manifest references')
fs.writeFileSync(clientManifestPath, clientManifest)

let service = fs.readFileSync(breakServicePath, 'utf8')
if (service.includes(marker)) throw new Error(`${marker}: break service patch already applied`)
service = replaceExactly(
  service,
  "const startMinutes = validMinutes(body.startMinutes, '開始時刻', { min: 0, max: 1435, step: 5 })",
  "const startMinutes = validMinutes(body.startMinutes, '開始時刻', { min: 0, max: 1425, step: 15 })",
  1,
  'break start validation',
)
service = replaceExactly(
  service,
  "const durationMinutes = validMinutes(body.durationMinutes, '休憩時間', { min: 5, max: 720, step: 5 })",
  "const durationMinutes = validMinutes(body.durationMinutes, '休憩時間', { min: 15, max: 720, step: 15 })",
  1,
  'break duration validation',
)
const updateBreak = fs.readFileSync(new URL('update-break-function-v461.txt', patchRoot), 'utf8').trimEnd()
service = replaceExactly(
  service,
  '  async function deleteBreak(req, res, id) {',
  `${updateBreak}\n\n  async function deleteBreak(req, res, id) {`,
  1,
  'break update insertion point',
)
service = replaceExactly(
  service,
  "      if (breakId && req.method === 'DELETE') { await deleteBreak(req, res, decodeURIComponent(breakId)); return true }",
  `      if (breakId && req.method === 'PATCH') { await updateBreak(req, res, decodeURIComponent(breakId)); return true } /* ${marker} */
      if (breakId && req.method === 'DELETE') { await deleteBreak(req, res, decodeURIComponent(breakId)); return true }`,
  1,
  'break PATCH route',
)
fs.writeFileSync(breakServicePath, service)

let client = fs.readFileSync(breakClientPath, 'utf8')
if (client.includes(marker)) throw new Error(`${marker}: break client patch already applied`)
const clientAddon = fs.readFileSync(new URL('shift-line-break-interaction-client-v461.js', patchRoot), 'utf8')
client += `\n\n/* ${marker} */\n${clientAddon}\n`
fs.writeFileSync(breakClientPath, client)

console.log(`${marker} patched`)
