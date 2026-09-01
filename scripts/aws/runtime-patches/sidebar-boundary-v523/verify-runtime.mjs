import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const shellCss = fs.readFileSync(path.join(root, 'public', 'shell-consistency-v518.css'), 'utf8')

assert.match(server, /X-Lien-Sidebar-Boundary', 'v523'/)
assert.match(server, /X-Lien-Manual-Break-Cleanup', 'v522'/)
assert.match(server, /shell-consistency-v518\.css\?v=523-boundary1/)
assert.match(shellCss, /sidebar-boundary-v523/)
assert.match(shellCss, /left: calc\(var\(--orimia-admin-sidebar-width-v518, 18rem\) - 19px\) !important/)
assert.match(shellCss, /button\[aria-label="サイドバーを開く"\]/)
assert.match(shellCss, /left: \.75rem !important/)

console.log(JSON.stringify({ release: 'sidebar-boundary-v523', verified: true }))
