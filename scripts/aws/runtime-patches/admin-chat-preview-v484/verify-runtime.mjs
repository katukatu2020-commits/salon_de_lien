import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const source = fs.readFileSync(pagePath, 'utf8')

const assertions = [
  [(source.match(/admin-chat-preview-v484/g) || []).length === 1, 'one v484 release marker exists'],
  [(source.match(/data-lien-chat-thread-preview/g) || []).length === 1, 'one conversation preview marker exists'],
  [source.includes('className: "min-w-0 overflow-hidden rounded-[16px]'), 'sidebar card cannot grow beyond its grid track'],
  [source.includes('style: { minWidth: 0, maxWidth: "100%", overflow: "hidden" }'), 'sidebar card has explicit width containment'],
  [source.includes('flex: "1 1 0%", width: 0'), 'preview consumes only remaining row width'],
  [source.includes('textOverflow: "ellipsis"'), 'preview uses an ellipsis'],
  [source.includes('className: "shrink-0 whitespace-nowrap"'), 'timestamp cannot be compressed'],
  [source.includes('"data-lien-chat-body": "1", children: e.body'), 'full conversation message body remains unchanged'],
  [!source.includes('admin-chat-preview-v483'), 'obsolete preview marker is removed'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', pagePath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout)

console.log(`admin chat preview v484 verified (${assertions.length} assertions)`)
