import fs from 'node:fs'

const commercialPath = '/app/commercial-admin-v101.js'
const clientPath = '/tmp/lien-v492/external-integrations-client-v492.js'
const marker = '__lienExternalAppIntegrationsV492'

let commercial = fs.readFileSync(commercialPath, 'utf8')
if (commercial.includes(marker)) throw new Error('external app integrations v492 is already present')
const client = fs.readFileSync(clientPath, 'utf8')
if (!client.includes(marker)) throw new Error('external integrations client marker is missing')

commercial += `\n\n/* external-app-integrations-v492 */\n${client}\n`
fs.writeFileSync(commercialPath, commercial)

console.log('External app integrations v492 runtime patched.')
