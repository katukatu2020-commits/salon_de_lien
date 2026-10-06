'use strict'

const MENU_LABELS = ['ご予約メニュー', '予約時メニュー', '予約メニュー', '施術メニュー', 'メニュー', 'コース']
const PRICE_LABELS = ['予約時合計金額', '合計金額', 'メニュー金額', '予定金額', '料金', '金額']
const OTHER_LABELS = ['予約時クーポン', 'ご利用クーポン', '利用クーポン', 'クーポン', '予約番号', '予約受付番号', '受付番号', '予約ID', '予約詳細ページ', '来店日時', '予約日時', 'ご来店日時', '店舗名', '氏名', 'お客様名', 'ご来店者名', '来店者名', '予約者名', 'お名前', '電話番号', '担当スタッフ', 'スタイリスト', '担当者', '合計施術時間', '施術時間目安', '所要時間', '施術時間', 'メニュー内容', '説明', '備考', '注意事項', 'ご要望', 'お客様からのご要望', 'その他割引', '割引額', '事前決済額', 'お支払い予定金額', '支払い予定金額', '今回の利用ポイント', '予約時利用ポイント', '利用ポイント', '今回の利用ギフト券', '利用ギフト券']
const labels = [...MENU_LABELS, ...PRICE_LABELS, ...OTHER_LABELS].sort((a, b) => b.length - a.length)
const clean = value => String(value || '').normalize('NFKC').trim()

function field(line) {
  let text = line.replace(/^[■□●◆◇・\s]+/, '').trim()
  if (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1).trim()
  let scope = null
  const prefix = text.match(/^(?:【|\[|\()?変更(前|後)(?:の)?(?:】|\]|\))?\s*/)
  if (prefix) { scope = prefix[1] === '前' ? 'old' : 'new'; text = text.slice(prefix[0].length) }
  for (const label of labels) {
    const wrapped = ['【' + label + '】', '[' + label + ']', '(' + label + ')'].find(value => text.startsWith(value))
    const raw = wrapped ? text.slice(wrapped.length) : text.startsWith(label) ? text.slice(label.length) : null
    if (raw == null || (!wrapped && raw && !/^(?:\s|:|\([^)]*\))/.test(raw))) continue
    const value = raw.replace(/^\([^)]*\)/, '').replace(/^\s*:?\s*/, '').trim()
    return { label, value, scope }
  }
  // An unknown labeled field is a boundary, never an extra menu line.
  if (/^[■□●◆◇]|^[【\[]|^[^:]{1,35}:/.test(line)) return { label: '', value: '', scope }
  return null
}

function readFields(text) {
  const lines = clean(text).replace(/([■□●◆◇])/g, '\n$1').split(/\r?\n/)
  const result = []
  let scope = 'current', current = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || /^>/.test(line)) continue
    if (/^-+\s*(?:Original Message|元のメッセージ)|^On .+wrote:|^差出人:/.test(line) && result.length) break
    const heading = line.replace(/[■□●◆◇【】\[\]()\s:]/g, '')
    if (/^(?:変更前|変更前の予約内容)$/.test(heading)) { scope = 'old'; current = null; continue }
    if (/^(?:変更後|変更後の予約内容)$/.test(heading)) { scope = 'new'; current = null; continue }
    const found = field(line)
    if (found) {
      current = { label: found.label, scope: found.scope || scope, lines: found.value ? [found.value] : [] }
      result.push(current)
    } else if (current && /^(?:https?:\/\/|[-=]{4,}|※|ご予約の|お問い合わせ)/.test(line)) {
      current = null
    } else if (current) {
      current.lines.push(line)
    }
  }
  return result
}

function activeFields(fields, wanted) {
  const matches = fields.filter(item => wanted.includes(item.label) && item.scope !== 'old')
  return matches.some(item => item.scope === 'new') ? matches.filter(item => item.scope === 'new') : matches
}

function parseReservationMenu(text) {
  const fields = readFields(text)
  const menus = activeFields(fields, MENU_LABELS)
  const prices = activeFields(fields, PRICE_LABELS)
  const values = [...new Set(menus.map(item => item.lines.filter(line => !/^\[[^\]]+\](?:\s*\[[^\]]+\])*$/.test(line)).join(' + ').trim()).filter(Boolean))]
  const candidate = values.length === 1 ? values[0] : null
  const menu = candidate && candidate.length <= 500 && !/^(?:なし|未定|未選択|選択なし|クーポン(?:を選択|参照)|クーポン利用|[-ー]+)$/.test(candidate) ? candidate : null
  let estimatedPrice = null
  let priceAmbiguous = false
  for (const label of PRICE_LABELS) {
    const rows = prices.filter(item => item.label === label && item.lines.length)
    if (!rows.length) continue
    const amounts = rows.map(item => {
      const match = item.lines.join(' ').match(/^(?:[¥￥]\s*)?([\d,]+)\s*(?:円)?(?:\s*\((?:税込|税抜|税別)\))?$/)
      const amount = match ? Number(match[1].replace(/,/g, '')) : NaN
      return Number.isSafeInteger(amount) && amount >= 0 && amount <= 10000000 ? amount : null
    })
    const unique = [...new Set(amounts)]
    if (unique.length === 1 && unique[0] !== null) estimatedPrice = unique[0]
    else priceAmbiguous = true
    break
  }
  const warnings = []
  if (!menu) warnings.push(values.length > 1 ? 'メニューの記載が複数あり特定できません。' : '施術メニューを確認してください。')
  if (estimatedPrice === null) warnings.push('施術料金を確認してください。')
  return { menu, estimatedPrice, menuFieldPresent: menus.length > 0, priceFieldPresent: prices.length > 0, menuNeedsReview: !menu, priceNeedsReview: estimatedPrice === null, priceAmbiguous, reviewReason: warnings.join(' ') || null }
}

function mergeImportedMenu(parsed, existing) {
  const menuChanged = parsed.menu != null && existing?.menu != null && clean(parsed.menu) !== clean(existing.menu)
  return {
    menu: parsed.menuFieldPresent ? parsed.menu : parsed.menu ?? existing?.menu ?? null,
    estimatedPrice: parsed.estimatedPrice ?? (parsed.priceFieldPresent || menuChanged || (parsed.menuFieldPresent && !parsed.menu) ? null : existing?.estimatedPrice ?? null),
  }
}

module.exports = { parseReservationMenu, mergeImportedMenu }
