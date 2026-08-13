const assert = require('assert/strict')

function section(text, labels) {
  const lines = text.normalize('NFKC').replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const candidate = lines[i].trim().replace(/^[■●]\s*/, '').trim()
    for (const label of labels) {
      if (candidate !== label && !candidate.startsWith(`${label}:`) && !candidate.startsWith(`${label}：`)) continue
      const sameLine = candidate.slice(label.length).replace(/^\s*[:：]\s*/, '').trim()
      const values = sameLine ? [sameLine] : []
      for (let cursor = i + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor].trim()
        if (/^[■◇◆●]/.test(line)) break
        if (line) values.push(line)
      }
      return values.join('\n').trim() || null
    }
  }
  return null
}

function couponTitle(text) {
  const value = section(text, ['予約時クーポン', 'ご利用クーポン', '利用クーポン'])
  if (!value || /利用クーポンなし|クーポン利用なし/.test(value)) return null
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
    .find((line) => !/^(?:\[[^\]]+\]\s*)+$/.test(line)) || null
}

function amount(value) {
  const match = String(value || '').match(/(?:[¥￥]\s*)?([\d,]+)\s*円?/)
  if (!match) return null
  const parsed = Number(match[1].replace(/,/g, ''))
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function price(text) {
  const normalized = text.normalize('NFKC')
  for (const pattern of [
    /予約時合計金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
    /メニュー金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
    /お支払い予定金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
  ]) {
    const parsed = amount(normalized.match(pattern)?.[1])
    if (parsed !== null) return parsed
  }
  for (const value of [couponTitle(normalized), section(normalized, ['予約時メニュー', 'メニュー'])]) {
    const values = Array.from(String(value || '').matchAll(/(?:[¥￥]\s*([\d,]+)|([\d,]+)\s*円)/g),
      (match) => Number((match[1] || match[2]).replace(/,/g, '')))
    if (values.length) return values.at(-1)
  }
  return null
}

const hotPepper = `
◇ご予約内容
■メニュー
 カット＋ヘッドスパ
 （メニュー金額：7,700円）
 （施術時間目安：1時間30分）
■ご利用クーポン
 [全員] [スタイリスト指定]
 女性におすすめ！カット+リフトアップスパ 9000→7700
■合計金額
 予約時合計金額 7,700円
 今回の利用ポイント 100ポイント
 お支払い予定金額 7,600円
`
assert.equal(price(hotPepper), 7700)
assert.equal(couponTitle(hotPepper), '女性におすすめ!カット+リフトアップスパ 9000→7700')

const hotPepperCancel = `
■メニュー
 カット＋ヘッドスパ＋その他
■ご利用クーポン
 [全員]
 【メンズ限定】トータルビューティーコース～響～￥8800
`
assert.equal(price(hotPepperCancel), 8800)

const kanzashi = `
■予約時メニュー
 52.眉カット
■予約時クーポン
 1.頭皮環境改善！カット+SCALPスパ¥10,000→¥8800
■合計施術時間
 100 分
■予約時合計金額
 9,900 円
`
assert.equal(price(kanzashi), 9900)
assert.equal(couponTitle(kanzashi), '1.頭皮環境改善!カット+SCALPスパ¥10,000→¥8800')

const couponOnly = `
■予約時クーポン
 カット+カラー+Aujuaトリートメント ¥13,800
`
assert.equal(price(couponOnly), 13800)

console.log('price extraction fixtures passed')

