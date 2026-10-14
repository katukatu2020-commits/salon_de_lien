'use strict'
const sourceUrl = 'https://beauty.hotpepper.jp/slnH000307612/coupon/CT00/'
const row = ({ name, id, price = '5,500', description = '検証用の説明', categories = [] }) => `<tr><td class="bgWhite">
  <ul>${categories.map(c => `<li class="couponMenuIcon">${c}</li>`).join('')}</ul>
  <div><p class="couponMenuName">${name}</p><p><span class="fs16 fgGray">${price}</span></p></div>
  <p class="mT10 fgGray fs11 wbba">${description}</p></td><td>
  ${id ? [0, 1].map(add => `<a href="https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000307612&amp;${id.startsWith('SN') ? 'setmenuId' : 'menuId'}=${id}&amp;addMenu=${add}">予約</a>`).join('') : ''}
</td></tr>`
const group = (category, rows) => `<div class="singleMenuHead"><p><span>${category}</span></p></div><div><table class="menuTbl"><tbody>${rows.join('')}</tbody></table></div>`
const page = (body, count) => `<h1 class="detailTitle">QA v711 Salon</h1>${count === undefined ? '' : `<p>メニュー<span class="numberOfResult">${count}</span>件</p>`}${body}`
const entries = Array.from({ length: 49 }, (_, i) => ({ name: `QA711 メニュー${String(i + 1).padStart(2, '0')}`, id: `${i < 20 ? 'SN' : 'MN'}711${String(i + 1).padStart(5, '0')}`, price: String(1000 + i * 100), description: `検証行${i + 1}`, categories: i < 20 ? ['カット', 'カラー'] : [] }))
const fixture = page(entries.slice(0, 20).map(e => `<table class="menuTbl">${row(e)}</table>`).join('') + group('カット', entries.slice(20, 23).map(row)) + group('カラー', entries.slice(23, 30).map(row)) + group('トリートメント', entries.slice(30).map(row)), 49)
module.exports = { sourceUrl, row, group, page, entries, fixture }
