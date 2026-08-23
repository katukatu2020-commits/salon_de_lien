import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const profileChunkPath = '/app/.next/static/chunks/app/u/(account)/profile/page-profile-code-v267.js'
let profileChunk = fs.readFileSync(profileChunkPath, 'utf8')

profileChunk = replaceOnce(
  profileChunk,
  'p("".concat(m.imageUrl,"?v=").concat(null!==(e=m.cacheKey)&&void 0!==e?e:Date.now())),v("")',
  'p(m.imageUrl),v("")',
  'presigned profile image URL',
)

const loaderMarker = 'data-lien-profile-image-runtime="401"'
if (profileChunk.includes(loaderMarker)) throw new Error('profile image v401 loader already exists')
profileChunk += `\n;(()=>{if(typeof document==='undefined'||document.querySelector('script[${loaderMarker}]'))return;const s=document.createElement('script');s.src='/customer-profile-image-v401.js?v=20260823-401';s.defer=true;s.setAttribute('${loaderMarker.split('=')[0]}','401');document.head.appendChild(s)})();\n`
fs.writeFileSync(profileChunkPath, profileChunk)

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  '"instrumentationHook":true,"bundlePagesExternals"',
  '"instrumentationHook":true,"serverActions":{"bodySizeLimit":"6mb"},"bundlePagesExternals"',
  'standalone server action size limit',
)
fs.writeFileSync(serverPath, server)

const requiredFilesPath = '/app/.next/required-server-files.json'
const requiredFiles = JSON.parse(fs.readFileSync(requiredFilesPath, 'utf8'))
requiredFiles.config.experimental ||= {}
requiredFiles.config.experimental.serverActions = { bodySizeLimit: '6mb' }
fs.writeFileSync(requiredFilesPath, JSON.stringify(requiredFiles))

console.log('customer profile image v401 runtime patched')
