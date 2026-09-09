'use strict'

const { load } = require('node:module').createRequire(require('node:path').join(__dirname, 'hotpepper-deps/package.json'))('cheerio')
const https = require('node:https')
const dns = require('node:dns').promises

const failure = (message, status = 400) => Object.assign(new Error(message), { status })
const clean = (value, max = 4000) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)

function pageUrl(value, salonId, detail = false) {
  let url
  try { url = new URL(value) } catch { throw failure('ホットペッパーのスタイル一覧URLを入力してください。') }
  const match = url.pathname.match(/^\/sln(H\d{9})\/style\/(?:PN([1-9]\d*)\.html|(L\d+)\.html)?$/)
  if (url.protocol !== 'https:' || url.hostname !== 'beauty.hotpepper.jp' || url.port || url.username || url.password || !match || (salonId && match[1] !== salonId) || (detail !== Boolean(match[3]))) {
    throw failure('同じ店舗のホットペッパー・スタイル一覧URLを指定してください。')
  }
  url.search = ''; url.hash = ''
  return { url: url.href, salonId: match[1], styleId: match[3] || null }
}

function imageUrl(value) {
  let url
  try { url = new URL(value) } catch { throw failure('掲載画像のURLを確認できません。') }
  if (url.protocol !== 'https:' || url.hostname !== 'imgbp.hotp.jp' || url.port || url.username || url.password || !/^\/CSP\/IMG_SRC\/\d+\/\d+\/[A-Z]\d+\/[A-Z]\d+\.(?:jpg|jpeg|png|webp)$/i.test(url.pathname)) {
    throw failure('対応していない掲載画像です。')
  }
  url.search = '?impolicy=HPB_policy_default&w=1080&h=1440'; url.hash = ''
  return url.href
}

function parseList(html, source) {
  const { salonId } = pageUrl(source)
  const $ = load(html)
  const styles = new Set(), pages = new Set()
  const salonName = clean($('.detailTitle').first().text(), 160)
  if (!salonName) throw failure('スタイル一覧を読み取れませんでした。URLまたは掲載ページの形式を確認してください。', 422)
  $('#mainContents a[href]').each((_, a) => {
    let href
    try { href = new URL($(a).attr('href'), source).href } catch { return }
    try { styles.add(pageUrl(href, salonId, true).url) } catch {}
    try { const page = pageUrl(href, salonId).url; if (page !== source) pages.add(page) } catch {}
  })
  if (!styles.size && !/0件のヘアスタイル/.test($('#mainContents').text())) throw failure('スタイル一覧の形式が変わった可能性があります。取り込みを停止しました。', 422)
  return { salonName, styles: [...styles], pages: [...pages] }
}

function parseDetail(html, source) {
  const { salonId } = pageUrl(source, undefined, true)
  const $ = load(html)
  $('br').replaceWith(' ')
  const root = $('#jsiHoverAlphaLayerScope')
  const title = clean(root.find('.stylePageTileOuter h2').first().text(), 160)
  const photos = []
  root.find('span[id^="scc"] img').each((_, img) => {
    const li = $(img).closest('li')
    const direction = li.find('.SV01').length ? 'FRONT' : li.find('.SV02').length ? 'SIDE' : li.find('.SV03').length ? 'BACK' : 'OTHER'
    const url = imageUrl($(img).attr('src'))
    if (!photos.some(photo => photo.url === url)) photos.push({ direction, url })
  })
  if (!photos.length && root.find('img[name="main"]').length) photos.push({ direction: 'OTHER', url: imageUrl(root.find('img[name="main"]').attr('src')) })
  if (!title || !photos.length || photos.length > 3) throw failure('写真またはスタイル名を読み取れませんでした。', 422)
  const heading = text => root.find('.styleDtlRightColumn .titleStyle').filter((_, el) => clean($(el).text()) === text).first()
  const stylist = root.find('.rsvStaffWrap').first()
  const profileUrl = root.find('.dtlStylistName a').attr('href') || ''
  let profile
  try { profile = profileUrl && new URL(profileUrl, source) } catch {}
  const stylistUrl = profile && profile.origin === 'https://beauty.hotpepper.jp' && new RegExp(`^/sln${salonId}/stylist/T\\d+/$`).test(profile.pathname) ? profile.origin + profile.pathname : ''
  return {
    title,
    stylistComment: clean(heading('スタイリストコメント').next('p').text()),
    menuDescription: clean(heading('メニュー内容').next('dl').text(), 2000),
    stylistName: clean(root.find('.dtlStylistName').first().text(), 100),
    stylistKana: clean(stylist.find('.wbba .fgLGray').text(), 100),
    stylistRole: clean(stylist.find('.fgPink').first().text(), 160),
    salonName: clean($('.detailTitle').first().text(), 160),
    salonArea: clean(root.find('.dtlStylistSalon p').first().text(), 160),
    stylistUrl,
    stylistPhotoUrl: root.find('.dtlStylistInfo > img').attr('src') ? imageUrl(root.find('.dtlStylistInfo > img').attr('src')) : '',
    photos,
    sourceUrl: pageUrl(source, salonId, true).url,
  }
}

function publicIpv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = parts
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19].includes(b)))
}

async function retrieve(value, kind = 'page', salonId) {
  const validated = kind === 'image' ? imageUrl(value) : pageUrl(value, salonId, /\/L\d+\.html(?:[?#]|$)/.test(value)).url
  const limit = kind === 'image' ? 5 * 1024 * 1024 : 3 * 1024 * 1024
  return new Promise((resolve, reject) => {
    const req = https.get(validated, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'ORIMIA-StyleImport/1.0 (+https://salon-de-lien.com/)', Accept: kind === 'image' ? 'image/*' : 'text/html', 'Accept-Encoding': 'identity' },
      lookup(host, options, callback) {
        dns.lookup(host, { all: true, family: 4 }).then(addresses => {
          if (!addresses.length || addresses.some(item => !publicIpv4(item.address))) throw failure('公開ページへ接続できません。', 422)
          callback(null, options.all ? addresses : addresses[0].address, 4)
        }).catch(callback)
      },
    }, res => {
      // Redirects are deliberately not followed, including redirects to login/challenge pages.
      if (res.statusCode !== 200) { res.resume(); reject(failure(`掲載元から取得できません（HTTP ${res.statusCode}）。時間をおいて確認してください。`, [403, 429].includes(res.statusCode) ? 429 : 422)); return }
      const type = String(res.headers['content-type'] || '')
      if (!(kind === 'image' ? /^image\/(jpeg|png|webp)(?:;|$)/i : /^text\/html(?:;|$)/i).test(type)) { res.resume(); reject(failure('掲載元のデータ形式が対応していません。', 422)); return }
      let size = 0
      const chunks = []
      res.on('data', chunk => { size += chunk.length; if (size > limit) res.destroy(failure('掲載データがサイズ上限を超えています。', 413)); else chunks.push(chunk) })
      res.on('error', reject)
      res.on('end', () => resolve(kind === 'image' ? { buffer: Buffer.concat(chunks), type: type.split(';')[0] } : Buffer.concat(chunks).toString('utf8')))
    })
    req.on('error', error => reject(error.status ? error : failure('掲載元との通信が完了しませんでした。再試行してください。', 422)))
  })
}

module.exports = { pageUrl, imageUrl, parseList, parseDetail, retrieve, publicIpv4, failure }
