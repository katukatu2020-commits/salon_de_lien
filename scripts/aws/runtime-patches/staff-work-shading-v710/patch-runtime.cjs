'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, from, to) {
  if (source.split(from).length !== 2) throw Error('Unexpected anchor: ' + from.slice(0, 120))
  return source.replace(from, () => to)
}
const helper = fs.readFileSync(path.join(__dirname, 'shading.cjs'), 'utf8').split('module.exports =')[0]
const oldChunk = 'page-checkout-shift-v700.capacity-v705.js'
const newChunk = 'page-staff-work-shading-v710.js'
const chunkRoot = '.next/static/chunks/app/admin/appointments/'
for (const [input, output] of [
  [chunkRoot + oldChunk, chunkRoot + newChunk],
  ['.next/server/app/admin/appointments/page.js', '.next/server/app/admin/appointments/page.js']
]) {
  let source = read(input)
  source = helper + '\n/* staff-work-shading-v710 */\n' + source
  for (const [edge, side] of [['left', 'before'], ['right', 'after']]) {
    const anchor = '"shift-off pointer-events-none absolute inset-y-0 ' + edge + '-0"'
    const start = source.indexOf(anchor), end = source.indexOf('},', source.indexOf('style: {', start)) + 2
    if (start < 0 || end <= start) throw Error('Missing shading block: ' + input)
    const block = source.slice(start, end)
    if (!block.includes('Math.max(0,') || !block.includes('work')) throw Error('Unexpected shading geometry')
    source = replace(source, block, anchor + ',\n' +
      '"data-work-shade": "' + side + '", "aria-hidden": true,\n' +
      'style: { backgroundColor: "#e2e4e7", width: workTimeShading(e,__businessOpen,__businessClose,__businessSchedule.isClosed).' + side + ' + "%" },')
  }
  source = replace(source, '"data-staff-name": e.name,', '"data-staff-name": e.name, "data-work-start": e.workStartMinutes, "data-work-end": e.workEndMinutes,')
  write(output, source)
}
for (const file of ['.next/app-build-manifest.json', '.next/server/app/admin/appointments/page_client-reference-manifest.js']) {
  const source = read(file)
  if (!source.includes(oldChunk)) throw Error('Missing active shift chunk: ' + file)
  write(file, source.split(oldChunk).join(newChunk))
}
let server = read('server.js')
server = replace(server, "res.setHeader('X-Lien-Staff-Work-Calendar', 'v704')",
  "res.setHeader('X-Lien-Staff-Work-Shading', 'v710')\n    res.setHeader('X-Lien-Staff-Work-Calendar', 'v704')")
write('server.js', server)
// Retarget inherited regression checks to the cache-busted active chunk.
let verify700 = fs.readFileSync('/tmp/lien-v700/verify-runtime.mjs', 'utf8')
verify700 = verify700.split('page-checkout-shift-v700.js').join(newChunk).split('/page-checkout-shift-v700/').join('/page-staff-work-shading-v710/')
fs.writeFileSync('/tmp/lien-v700/verify-runtime.mjs', verify700)
let verify705 = fs.readFileSync('/tmp/lien-v705/verify-runtime.mjs', 'utf8')
verify705 = verify705.split(oldChunk).join(newChunk).split('page-checkout-shift-v700\\.capacity-v705\\.js').join('page-staff-work-shading-v710\\.js')
fs.writeFileSync('/tmp/lien-v705/verify-runtime.mjs', verify705)
console.log('v710 applied: date-specific working-time shading with bounded holiday ranges')
