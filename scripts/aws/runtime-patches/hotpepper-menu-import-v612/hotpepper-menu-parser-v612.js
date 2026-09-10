'use strict'

const crypto = require('node:crypto')
const dns = require('node:dns').promises
const https = require('node:https')
const path = require('node:path')
const { createRequire } = require('node:module')

const requireFromRuntime = createRequire(path.join(__dirname, 'hotpepper-deps/package.json'))
const { load } = requireFromRuntime('cheerio')

const MAX_HTML_BYTES = 3 * 1024 * 1024
const MAX_MENUS = 200

function failure(message, status = 400) {
  return Object.assign(new Error(message), { status })
}

function clean(value, maxLength = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function menuPageUrl(value, expectedSalonId) {
  let url
  try {
    url = new URL(String(value || '').trim())
  } catch {
    throw failure('ホットペッパーのメニュー表URLを入力してください。')
  }

  const match = url.pathname.match(/^\/sln(H\d{9})\/coupon\/CT00\/?$/)
  if (
    url.protocol !== 'https:'
    || url.hostname !== 'beauty.hotpepper.jp'
    || url.port
    || url.username
    || url.password
    || !match
    || (expectedSalonId && expectedSalonId !== match[1])
  ) {
    throw failure('同じ店舗のホットペッパー「メニュー」ページ（/coupon/CT00/）を指定してください。')
  }

  url.pathname = `/sln${match[1]}/coupon/CT00/`
  url.search = ''
  url.hash = ''
  return { url: url.href, salonId: match[1] }
}

function publicIpv4(address) {
  const parts = String(address || '').split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b, c] = parts
  return !(
    a === 0
    || a === 10
    || a === 127
    || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && [18, 19, 51].includes(b))
    || (a === 203 && b === 0 && c === 113)
  )
}

function parsePrice(value) {
  const display = clean(value, 80)
  const match = display.match(/[\d０-９][\d０-９,，]*/)
  if (!match) return null
  const normalized = match[0]
    .normalize('NFKC')
    .replace(/[,，]/g, '')
  const priceYen = Number.parseInt(normalized, 10)
  if (!Number.isInteger(priceYen) || priceYen < 0 || priceYen > 10_000_000) return null
  return {
    priceYen,
    priceDisplay: display,
    priceIsMinimum: /[～~〜]|から/.test(display),
  }
}

function estimateDuration(categories, title) {
  const values = [
    ['縮毛矯正', 150],
    ['ストレート', 150],
    ['パーマ', 90],
    ['カラー', 90],
    ['カット', 60],
    ['ヘアセット', 60],
    ['トリートメント', 30],
    ['ヘッドスパ', 30],
    ['その他メニュー', 60],
  ]
  const source = categories.length ? categories : [title]
  const matched = new Set()
  let minutes = 0
  for (const label of source) {
    for (const [keyword, duration] of values) {
      if (String(label).includes(keyword) && !matched.has(keyword)) {
        matched.add(keyword)
        minutes += duration
      }
    }
  }
  if (!minutes) minutes = 60
  return Math.max(15, Math.min(360, Math.round(minutes / 5) * 5))
}

function parseMenuPage(html, source) {
  const target = menuPageUrl(source)
  const $ = load(String(html || ''))
  const salonName = clean($('.detailTitle').first().text(), 160)
  if (!salonName) throw failure('店舗情報を読み取れませんでした。URLと掲載ページの状態を確認してください。', 422)

  const items = []
  const sourceWarnings = []
  const seen = new Set()

  $('table.menuTbl').each((index, element) => {
    if (items.length >= MAX_MENUS) return
    const table = $(element)
    const name = clean(table.find('.couponMenuName').first().text(), 140)
    const price = parsePrice(table.find('.couponMenuName').first().parent().find('.fs16.fgGray').first().text())
      || parsePrice(table.find('.fs16.fgGray').first().text())
    if (!name || !price) {
      sourceWarnings.push(`${index + 1}行目は名称または価格を確認できなかったため除外しました。`)
      return
    }

    const categories = []
    table.find('.couponMenuIcon').each((_, categoryElement) => {
      const category = clean($(categoryElement).text(), 40)
      if (category && !categories.includes(category)) categories.push(category)
    })
    const category = clean(categories.join('・') || 'その他', 80)
    const description = clean(table.find('.mT10.fgGray.fs11.wbba').first().text(), 1200)
    const durationMinutes = estimateDuration(categories, name)

    let setMenuId = ''
    table.find('a[href]').each((_, link) => {
      if (setMenuId) return
      try {
        const candidate = new URL($(link).attr('href'), target.url).searchParams.get('setmenuId') || ''
        if (/^SN\d+$/.test(candidate)) setMenuId = candidate
      } catch {}
    })
    const sourceKey = setMenuId
      ? `hotpepper:${target.salonId}:${setMenuId}`
      : `hotpepper:${target.salonId}:menu-${crypto.createHash('sha256').update(`${name}\n${price.priceYen}`).digest('hex').slice(0, 24)}`
    if (seen.has(sourceKey)) return
    seen.add(sourceKey)

    items.push({
      sourceKey,
      sourceUrl: target.url,
      name,
      category,
      description,
      durationMinutes,
      durationEstimated: true,
      priceYen: price.priceYen,
      priceDisplay: price.priceDisplay,
      priceIsMinimum: price.priceIsMinimum,
      sourceOrder: items.length,
    })
  })

  if (!items.length) {
    throw failure('通常メニューを読み取れませんでした。ホットペッパーの「メニュー」ページを指定してください。', 422)
  }
  if ($('table.menuTbl').length > MAX_MENUS) {
    throw failure(`一度に取り込める上限（${MAX_MENUS}件）を超えています。`, 422)
  }

  return {
    salonId: target.salonId,
    salonName,
    sourceUrl: target.url,
    items,
    sourceWarnings,
  }
}

async function retrieveMenuPage(value) {
  const target = menuPageUrl(value)
  return new Promise((resolve, reject) => {
    const request = https.get(target.url, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        'User-Agent': 'ORIMIA-MenuImport/1.0 (+https://salon-de-lien.com/)',
        Accept: 'text/html',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'ja-JP,ja;q=0.9',
      },
      lookup(hostname, options, callback) {
        dns.lookup(hostname, { all: true, family: 4 }).then(addresses => {
          if (!addresses.length || addresses.some(item => !publicIpv4(item.address))) {
            throw failure('公開ページへ安全に接続できませんでした。', 422)
          }
          callback(null, options.all ? addresses : addresses[0].address, 4)
        }).catch(callback)
      },
    }, response => {
      if (response.statusCode !== 200) {
        response.resume()
        reject(failure(`掲載元から取得できませんでした（HTTP ${response.statusCode}）。時間をおいて再試行してください。`, [403, 429].includes(response.statusCode) ? 429 : 422))
        return
      }
      const contentType = String(response.headers['content-type'] || '')
      if (!/^text\/html(?:;|$)/i.test(contentType)) {
        response.resume()
        reject(failure('掲載元のデータ形式を確認できませんでした。', 422))
        return
      }
      const chunks = []
      let size = 0
      response.on('data', chunk => {
        size += chunk.length
        if (size > MAX_HTML_BYTES) response.destroy(failure('掲載ページのサイズが上限を超えています。', 413))
        else chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    request.on('error', error => reject(error.status ? error : failure('掲載元との通信を完了できませんでした。再試行してください。', 422)))
  })
}

module.exports = {
  MAX_MENUS,
  clean,
  estimateDuration,
  failure,
  menuPageUrl,
  parseMenuPage,
  parsePrice,
  publicIpv4,
  retrieveMenuPage,
}
