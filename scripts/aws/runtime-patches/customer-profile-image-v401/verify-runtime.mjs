import fs from 'node:fs'

const profileChunkPath = '/app/.next/static/chunks/app/u/(account)/profile/page-profile-code-v267.js'
const profileChunk = fs.readFileSync(profileChunkPath, 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const requiredFiles = JSON.parse(fs.readFileSync('/app/.next/required-server-files.json', 'utf8'))
const cropRuntime = fs.readFileSync('/app/public/customer-profile-image-v401.js', 'utf8')

if (!profileChunk.includes('p(m.imageUrl),v("")')) {
  throw new Error('the client still mutates the newly signed profile image URL')
}
if (profileChunk.includes('m.imageUrl,"?v="')) {
  throw new Error('the invalid signed URL cache suffix remains')
}
if (!profileChunk.includes('data-lien-profile-image-runtime="401"')) {
  throw new Error('the square crop runtime is not loaded by the profile page')
}
if (!server.includes('"serverActions":{"bodySizeLimit":"6mb"}')) {
  throw new Error('standalone server action upload limit was not raised')
}
if (requiredFiles.config?.experimental?.serverActions?.bodySizeLimit !== '6mb') {
  throw new Error('required-server-files does not contain the 6mb upload limit')
}
if (!cropRuntime.includes('canvas.toBlob') || !cropRuntime.includes('new DataTransfer')) {
  throw new Error('the profile crop runtime is incomplete')
}
if (!server.includes('LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"')) {
  throw new Error('v400 customer store session isolation was lost')
}

console.log('customer profile image v401 verified')
