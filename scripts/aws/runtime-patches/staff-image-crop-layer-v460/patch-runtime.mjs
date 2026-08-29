import fs from 'node:fs'

const customerLinkPath = '/app/customer-link-ui-v293.js'
const marker = 'staff-image-crop-layer-v460'
let source = fs.readFileSync(customerLinkPath, 'utf8')

if (source.includes(marker)) throw new Error(`${marker}: patch is already applied`)

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: expected one ${label}, found ${count}`)
  source = source.replace(before, after)
}

replaceOnce(
  '      .lien-crop-stage{display:grid;place-items:center;overflow:hidden;',
  `      /* ${marker} */
      .lien-v293-modal.lien-v293-crop-modal{z-index:2147483000;isolation:isolate;overflow-y:auto;overscroll-behavior:contain}
      .lien-v293-modal.lien-v293-crop-modal .lien-v293-dialog{position:relative;z-index:1}
      .lien-crop-stage{display:grid;place-items:center;overflow:hidden;`,
  'crop style insertion point',
)

replaceOnce(
  '    dialog.body.innerHTML = `<div class="lien-crop-stage">',
  `    dialog.overlay.classList.add('lien-v293-crop-modal')
    dialog.body.innerHTML = \`<div class="lien-crop-stage">`,
  'crop dialog body',
)

fs.writeFileSync(customerLinkPath, source)
console.log(`${marker} patched`)
