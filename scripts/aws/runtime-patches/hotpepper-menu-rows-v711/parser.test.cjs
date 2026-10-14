'use strict'
const test = require('node:test'), assert = require('node:assert/strict')
const { parseMenuPage, MAX_MENUS } = require('/app/hotpepper-menu-parser-v612.js')
const { sourceUrl, row, group, page, entries, fixture } = require('./fixtures.cjs')
const parse = html => parseMenuPage(html, sourceUrl)
test('all 49 rows are imported, including every row of shared category tables', () => {
  const result = parse(fixture)
  assert.equal(result.items.length, 49)
  assert.deepEqual(result.sourceWarnings, [])
  result.items.forEach((item, i) => {
    assert.equal(item.name, entries[i].name)
    assert.equal(item.priceYen, Number(entries[i].price))
    assert.equal(item.description, entries[i].description)
    assert.equal(item.sourceKey, 'hotpepper:H000307612:' + entries[i].id)
    assert.equal(item.sourceOrder, i)
    assert.equal(item.category, i < 20 ? 'カット・カラー' : i < 23 ? 'カット' : i < 30 ? 'カラー' : 'トリートメント')
  })
  assert.equal(result.items[48].durationMinutes, 30)
})
test('row-local fields do not leak and duplicate reservation links or repeated rows are deduplicated', () => {
  const cut = row({ name: 'カット', id: 'MN71100001', price: '４，５００円', description: 'カットの説明' })
  const color = row({ name: 'カラー', id: 'MN71100002', price: '7,700～', description: 'カラーの説明' })
  const result = parse(page(group('カット', [cut, cut]) + group('カラー', [color])))
  assert.equal(result.items.length, 2)
  assert.deepEqual(result.items.map(i => [i.category, i.priceYen, i.priceIsMinimum, i.description]), [['カット', 4500, false, 'カットの説明'], ['カラー', 7700, true, 'カラーの説明']])
})
test('legacy set-menu IDs and name/price fallback identities are retained', () => {
  const body = row({ name: '同名', price: '5,000', id: 'SN71100003', categories: ['カット'] }) + row({ name: '同名', price: '5,000', id: 'MN71100004' }) + row({ name: 'IDなし', price: '0' })
  const items = parse(page(group('カラー', [body]))).items
  assert.equal(items.length, 3)
  assert.equal(items[0].sourceKey, 'hotpepper:H000307612:SN71100003')
  assert.equal(items[1].sourceKey, 'hotpepper:H000307612:MN71100004')
  assert.match(items[2].sourceKey, /^hotpepper:H000307612:menu-[0-9a-f]{24}$/)
  assert.equal(items[2].priceYen, 0)
})
test('a missing price is reported without borrowing another row price', () => {
  const result = parse(page(group('カット', [row({ name: '価格未定', price: '要問い合わせ' }), row({ name: '学生', price: '4,000', id: 'MN71100005' })])))
  assert.deepEqual(result.items.map(i => i.name), ['学生'])
  assert.equal(result.sourceWarnings.length, 1)
})
test('limit is measured in menus rather than category tables, with no silent truncation', () => {
  const rows = Array.from({ length: MAX_MENUS + 1 }, (_, i) => row({ name: `上限${i}`, id: `MN7119${String(i).padStart(5, '0')}` }))
  assert.equal(parse(page(group('カット', rows.slice(0, MAX_MENUS)))).items.length, MAX_MENUS)
  assert.throws(() => parse(page(group('カット', rows))), e => e.status === 422 && /上限/.test(e.message))
})
test('an incomplete advertised menu list cannot silently become a partial preview', () => {
  assert.throws(() => parse(page(group('カット', [row({ name: '先頭', id: 'MN71100007' })]), 49)), e => e.status === 422 && /掲載件数/.test(e.message))
})
test('only regular menu tables are parsed, never coupons or outside headings', () => {
  const html = page('<table class="couponTbl">' + row({ name: 'クーポン', id: 'SN71100008' }) + '</table>' + group('カット', [row({ name: '通常', id: 'MN71100009' })]))
  assert.deepEqual(parse(html).items.map(i => i.name), ['通常'])
})
