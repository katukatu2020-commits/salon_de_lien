'use strict'

const OPTIONS = Object.freeze({
  gender: ['女性', '男性', 'その他', '未回答'],
  hairThickness: ['細い', '普通', '太い'],
  hairVolume: ['少ない', '普通', '多い'],
  hairTexture: ['柔らかい', '普通', '硬い'],
  hairCurl: ['なし（直毛）', '少しある', '強い'],
  servicePreference: ['静かに過ごしたい', '適度に会話したい'],
})

function key(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLowerCase()
}

const aliases = new Map([
  ['female', '女性'],
  ['male', '男性'],
  ['other', 'その他'],
  ['unknown', '未回答'],
  ['回答しない', '未回答'],
  ['少なめ', '少ない'],
  ['多め', '多い'],
  ['標準', '普通'],
  ['やわらかい', '柔らかい'],
  ['かたい', '硬い'],
  ['細め', '細い'],
  ['太め', '太い'],
  ['なし', 'なし（直毛）'],
  ['直毛', 'なし（直毛）'],
  ['ややあり', '少しある'],
  ['静かにしたい', '静かに過ごしたい'],
  ['会話したい', '適度に会話したい'],
].map(([from, to]) => [key(from), to]))

function option(options, value) {
  const input = key(value)
  if (!input) return null
  const aliased = aliases.get(input) ?? value
  const target = key(aliased)
  return options.find(candidate => key(candidate) === target) ?? null
}

function normalizeProfile(input = {}) {
  return {
    gender: option(OPTIONS.gender, input.gender),
    servicePreference: option(OPTIONS.servicePreference, input.servicePreference),
    hairTexture: option(OPTIONS.hairTexture, input.hairTexture),
    hairThickness: option(OPTIONS.hairThickness, input.hairThickness),
    hairVolume: option(OPTIONS.hairVolume, input.hairVolume),
    hairCurl: option(OPTIONS.hairCurl, input.hairCurl),
  }
}

module.exports = { normalizeProfile }
