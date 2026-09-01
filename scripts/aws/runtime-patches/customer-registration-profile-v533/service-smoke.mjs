import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { normalizeProfile } = require('/app/customer-registration-profile-v533.js')

assert.deepEqual(normalizeProfile({
  gender: 'ｆｅｍａｌｅ',
  servicePreference: '会話したい',
  hairTexture: 'やわらかい',
  hairThickness: '太め',
  hairVolume: '標準',
  hairCurl: '直毛',
}), {
  gender: '女性',
  servicePreference: '適度に会話したい',
  hairTexture: '柔らかい',
  hairThickness: '太い',
  hairVolume: '普通',
  hairCurl: 'なし（直毛）',
})

assert.deepEqual(normalizeProfile({ gender: '女性', hairCurl: 'なし(直毛)' }), {
  gender: '女性',
  servicePreference: null,
  hairTexture: null,
  hairThickness: null,
  hairVolume: null,
  hairCurl: 'なし（直毛）',
})

assert.deepEqual(normalizeProfile({}), {
  gender: null,
  servicePreference: null,
  hairTexture: null,
  hairThickness: null,
  hairVolume: null,
  hairCurl: null,
})

console.log(JSON.stringify({ release: 'customer-registration-profile-v533', normalizedAliases: true, optionalProfileAccepted: true }))
