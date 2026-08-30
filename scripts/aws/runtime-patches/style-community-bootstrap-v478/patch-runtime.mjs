import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = '"data-lien-community-bootstrap": "v478"'
const appShellClass = 'admin-app-shell admin-mobile-workspace-v38 admin-staff-unified-v48 min-h-screen overflow-x-hidden bg-lien text-lien-ink'
let patched = 0

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes(appShellClass) || !source.includes('管理画面ナビゲーション')) continue

  const pattern = new RegExp(
    `(className: "${appShellClass}",\\n\\s+children: \\[\\n)(\\s+)([A-Za-z_$][\\w$]*)\\.jsx\\("aside", \\{`,
  )
  const matches = [...source.matchAll(new RegExp(pattern.source, 'g'))]
  if (matches.length !== 1) {
    throw new Error(`style-community-bootstrap-v478: expected one authenticated shell anchor in ${entry.name}, found ${matches.length}`)
  }

  source = source.replace(pattern, (_match, prefix, indent, jsx) =>
    `${prefix}${indent}${jsx}.jsx("script", { src: "/content-edit-delete-client-v477.js", defer: !0, ${marker} }),\n${indent}${jsx}.jsx("aside", {`,
  )
  fs.writeFileSync(file, source)
  patched += 1
}

if (patched !== 1) throw new Error(`style-community-bootstrap-v478: expected one AppShell chunk, patched ${patched}`)
console.log('style-community-bootstrap-v478 runtime patched')
