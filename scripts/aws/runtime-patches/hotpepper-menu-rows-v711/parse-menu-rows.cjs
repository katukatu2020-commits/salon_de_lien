'use strict'

function createMenuParser({ load, crypto, menuPageUrl, clean, parsePrice, estimateDuration, failure, MAX_MENUS }) {
  return function parseMenuPage(html, source) {
    const target = menuPageUrl(source), $ = load(String(html || ''))
    const salonName = clean($('.detailTitle').first().text(), 160)
    if (!salonName) throw failure('店舗情報を読み取れませんでした。URLと掲載ページの状態を確認してください。', 422)

    const items = [], sourceWarnings = [], seen = new Set()
    const names = $('table.menuTbl .couponMenuName')
    // Single-menu categories share a table; set menus have one table per menu.
    names.each((index, element) => {
      const title = $(element), row = title.closest('tr'), table = title.closest('table.menuTbl')
      if (!row.length || row.find('.couponMenuName').length !== 1) {
        throw failure('メニューの行構成を確認できませんでした。誤登録を防ぐため取り込みを中止しました。', 422)
      }
      const name = clean(title.text(), 140)
      const price = parsePrice(title.parent().find('.fs16.fgGray').first().text())
        || parsePrice(row.find('.fs16.fgGray').first().text())
      if (!name || !price) {
        sourceWarnings.push(`${index + 1}行目は名称または価格を確認できなかったため除外しました。`)
        return
      }
      const categories = []
      row.find('.couponMenuIcon').each((_, element) => {
        const category = clean($(element).text(), 40)
        if (category && !categories.includes(category)) categories.push(category)
      })
      if (!categories.length) {
        // The single-menu heading is a sibling of the table's wrapper.
        let container = table
        while (container.length && !container.is('body, html')) {
          const heading = container.prevAll('.singleMenuHead').first()
          if (heading.length) {
            const category = clean(heading.text(), 40)
            if (category) categories.push(category)
            break
          }
          container = container.parent()
        }
      }
      const category = clean(categories.join('・') || 'その他', 80)
      const description = clean(row.find('.mT10.fgGray.fs11.wbba').first().text(), 1200)
      let menuId = ''
      row.find('a[href]').each((_, link) => {
        if (menuId) return
        try {
          const url = new URL($(link).attr('href'), target.url)
          if (url.hostname !== 'beauty.hotpepper.jp' || (url.searchParams.get('storeId') && url.searchParams.get('storeId') !== target.salonId)) return
          const setId = url.searchParams.get('setmenuId') || '', singleId = url.searchParams.get('menuId') || ''
          if (/^SN\d+$/.test(setId)) menuId = setId
          else if (/^MN\d+$/.test(singleId)) menuId = singleId
        } catch {}
      })
      const sourceKey = menuId
        ? `hotpepper:${target.salonId}:${menuId}`
        : `hotpepper:${target.salonId}:menu-${crypto.createHash('sha256').update(`${name}\n${price.priceYen}`).digest('hex').slice(0, 24)}`
      if (seen.has(sourceKey)) return
      seen.add(sourceKey)
      items.push({ sourceKey, sourceUrl: target.url, name, category, description,
        durationMinutes: estimateDuration(categories, name), durationEstimated: true,
        priceYen: price.priceYen, priceDisplay: price.priceDisplay, priceIsMinimum: price.priceIsMinimum, sourceOrder: items.length })
      if (items.length > MAX_MENUS) throw failure(`一度に取り込める上限（${MAX_MENUS}件）を超えています。`, 422)
    })
    if (!items.length) throw failure('通常メニューを読み取れませんでした。ホットペッパーの「メニュー」ページを指定してください。', 422)
    $('.numberOfResult').each((_, element) => {
      const label = $(element).parent().text().replace(/\s+/g, '')
      const match = label.match(/^メニュー([\d,]+)件$/)
      if (match && Number(match[1].replace(/,/g, '')) > names.length) {
        throw failure('掲載件数と読み取れたメニュー件数が一致しません。一部だけの登録を防ぐため取り込みを中止しました。', 422)
      }
    })
    return { salonId: target.salonId, salonName, sourceUrl: target.url, items, sourceWarnings }
  }
}

module.exports = { createMenuParser }
