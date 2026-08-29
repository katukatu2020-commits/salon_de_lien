import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimePath = `${root}/customer-link-ui-v293.js`
const marker = 'staff-image-selection-v467'

const oldBlock = `    return new Promise(resolve => {
      const finish = value => { URL.revokeObjectURL(source); dialog.close(); resolve(value) }
      dialog.body.querySelector('[data-cancel]').addEventListener('click', () => finish(null))
      dialog.overlay.addEventListener('lien:close', () => { URL.revokeObjectURL(source); resolve(null) }, { once: true })
      dialog.body.querySelector('[data-confirm]').addEventListener('click', () => {
        canvas.toBlob(blob => {
          if (!blob) return finish(null)
          finish(new File([blob], \`\${file.name.replace(/\\.[^.]+$/, '') || 'image'}-square.jpg\`, { type: 'image/jpeg', lastModified: Date.now() }))
        }, 'image/jpeg', 0.9)
      })
    })
`

const newBlock = `    return new Promise(resolve => {
      /* ${marker}: a confirmed crop must win before the dialog-close cancellation path. */
      let settled = false
      const settle = value => {
        if (settled) return
        settled = true
        URL.revokeObjectURL(source)
        resolve(value)
      }
      const finish = value => {
        settle(value)
        dialog.overlay.remove()
      }
      dialog.body.querySelector('[data-cancel]').addEventListener('click', () => finish(null))
      dialog.overlay.addEventListener('lien:close', () => settle(null), { once: true })
      dialog.body.querySelector('[data-confirm]').addEventListener('click', () => {
        canvas.toBlob(blob => {
          if (!blob) return finish(null)
          finish(new File([blob], \`\${file.name.replace(/\\.[^.]+$/, '') || 'image'}-square.jpg\`, { type: 'image/jpeg', lastModified: Date.now() }))
        }, 'image/jpeg', 0.9)
      })
    })
`

const source = fs.readFileSync(runtimePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)
const count = source.split(oldBlock).length - 1
if (count !== 1) throw new Error(`${marker}: expected one legacy crop settlement block, found ${count}`)

fs.writeFileSync(runtimePath, source.replace(oldBlock, newBlock))
console.log(`${marker} runtime patched`)
