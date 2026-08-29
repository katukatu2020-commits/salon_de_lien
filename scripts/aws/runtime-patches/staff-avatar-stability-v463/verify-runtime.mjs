import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimePath = `${root}/admin-staff-experience-v276.js`
const source = fs.readFileSync(runtimePath, 'utf8')

const assertions = [
  [source.includes('staff-avatar-stability-v463'), 'stability patch marker is present'],
  [source.includes("source.searchParams.set('audience', 'staff')"), 'header avatar explicitly uses the staff audience'],
  [source.includes("if (image.getAttribute('src') !== target) image.src = target"), 'identical image URLs are not reassigned'],
  [!source.includes("image.src = profile.avatarUrl + (profile.avatarUrl.includes('?') ? '&' : '?') + 'v=' + Date.now()"), 'per-render timestamp rewriting is absent'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', runtimePath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout)

console.log(`staff avatar stability v463 verified (${assertions.length} assertions)`)
