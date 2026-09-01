;(() => {
  if (window.__productInsightsV515) return
  window.__productInsightsV515 = true

  let timer = 0
  let request = null
  let payloadCache = null
  let payloadPromise = null

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])

  function icon(name) {
    const paths = {
      chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      star: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
      arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      arrowLeft: '<path d="M19 12H5m6 6-6-6 6-6"/>',
      package: '<path d="m16.5 9.4-9-5.2M21 8l-9 5-9-5m9 5v10M19 5.7 5 13.4M5 8.3v8.4L12 21l7-4.3V8.3L12 4z"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.package}</svg>`
  }

  function addStyles() {
    if (document.getElementById('product-insights-v515-styles')) return
    const style = document.createElement('style')
    style.id = 'product-insights-v515-styles'
    style.textContent = `
      [data-sp-insights-hidden="1"]{display:none!important}
      .sp-insights{display:grid;gap:18px;border:1px solid #e8d9d2;border-radius:8px;background:#fffdfb;padding:22px;color:#332824;box-shadow:0 12px 30px rgba(71,43,35,.06)}
      .sp-insights .sp-demographics-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.sp-insights .sp-demographics-title{display:flex;min-width:0;align-items:flex-start;gap:12px}.sp-insights .sp-demographics-symbol{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:8px;background:#f9e9ed;color:#b84764}.sp-insights .sp-demographics-symbol svg{width:21px;height:21px}.sp-insights h2{margin:0;font-family:inherit;font-size:19px;font-weight:800;line-height:1.45;letter-spacing:0}.sp-insights .sp-demographics-head p{max-width:760px;margin:5px 0 0;color:#7d6e67;font-size:11px;line-height:1.75}.sp-insights .sp-demographics-period{display:inline-flex;min-height:31px;align-items:center;border:1px solid #ded0c9;border-radius:999px;background:#fff;padding:0 11px;color:#74665f;font-size:10px;font-weight:800;white-space:nowrap}
      .sp-insights .sp-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.sp-insight-product{display:grid;min-width:0;overflow:hidden;border:1px solid #e8ddd7;border-radius:8px;background:#fff;color:inherit;text-decoration:none;box-shadow:0 7px 20px rgba(67,43,35,.04);transition:border-color .18s,box-shadow .18s,transform .18s}.sp-insight-product:hover{border-color:#d2aaa1;box-shadow:0 13px 28px rgba(80,47,38,.09);transform:translateY(-1px)}.sp-insight-product:focus-visible{outline:3px solid rgba(191,90,115,.24);outline-offset:2px}.sp-insight-product-main{display:grid;gap:14px;padding:16px}.sp-insight-product-top{display:grid;grid-template-columns:76px minmax(0,1fr) 32px;align-items:start;gap:12px}.sp-insight-media{position:relative;display:grid;width:76px;height:76px;place-items:center;overflow:hidden;border:1px solid #eee3de;border-radius:8px;background:#faf7f5;color:#bfa9a0}.sp-insight-media svg{width:27px;height:27px}.sp-insight-media img{position:absolute;inset:0;width:100%;height:100%;background:#fff;object-fit:contain}.sp-insight-identity{min-width:0;padding-top:1px}.sp-insight-maker{display:block;overflow:hidden;color:#8b7a72;font-size:9px;font-weight:700;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.sp-insight-product h3{margin:4px 0 0;overflow-wrap:anywhere;font-family:inherit;font-size:15px;font-weight:800;line-height:1.5;letter-spacing:0}.sp-insight-category{display:block;margin-top:5px;color:#9a8a82;font-size:9px}.sp-insight-arrow{display:grid;width:31px;height:31px;place-items:center;border:1px solid #e7d7d0;border-radius:50%;background:#fff;color:#9b5146;transition:.18s}.sp-insight-arrow svg{width:15px;height:15px}.sp-insight-product:hover .sp-insight-arrow{border-color:#ad6255;background:#9d5144;color:#fff;transform:translateX(1px)}
      .sp-insight-metrics{display:grid;grid-template-columns:1fr 1.35fr;gap:16px;border-top:1px solid #f0e7e3;border-bottom:1px solid #f0e7e3;padding:12px 0}.sp-insight-metric{display:grid;min-width:0;align-content:start;gap:4px}.sp-insight-metric+.sp-insight-metric{border-left:1px solid #eee4df;padding-left:16px}.sp-insight-metric-label{color:#8c7b73;font-size:9px;font-weight:800}.sp-insight-sales{display:flex;align-items:baseline;gap:5px}.sp-insight-sales strong{font-size:22px;font-variant-numeric:tabular-nums;line-height:1}.sp-insight-sales span{color:#8c7b73;font-size:9px}.sp-insight-rating{display:flex;min-width:0;flex-wrap:wrap;align-items:center;gap:7px}.sp-insight-score{font-size:18px;font-weight:850;font-variant-numeric:tabular-nums;line-height:1}.sp-insight-stars{display:inline-flex;align-items:center;gap:1px;color:#d7cbc5}.sp-insight-stars svg{width:13px;height:13px;fill:transparent}.sp-insight-stars svg.filled{fill:#d7ae51;color:#d7ae51}.sp-insight-review-count{color:#7e6e66;font-size:9px;font-weight:750;white-space:nowrap}.sp-insight-unrated{color:#93857e;font-size:11px;font-weight:800}
      .sp-insight-highlights{display:flex;flex-wrap:wrap;gap:6px}.sp-insight-highlight{display:inline-flex;min-height:27px;align-items:center;gap:5px;border-radius:999px;background:#f8f3f0;padding:0 9px;color:#604e47;font-size:9px;font-weight:800}.sp-insight-highlight svg{width:13px;height:13px;color:#ae5368}.sp-insights .sp-bars{display:grid;gap:7px}.sp-insights .sp-bars-title{color:#766760;font-size:9px;font-weight:850}.sp-insights .sp-bar{display:grid;grid-template-columns:58px minmax(0,1fr) 42px;align-items:center;gap:7px;color:#65544d;font-size:9px}.sp-insights .sp-bar-track{height:7px;overflow:hidden;border-radius:999px;background:#f0e9e5}.sp-insights .sp-bar-fill{display:block;height:100%;border-radius:999px;background:#bf5a73}.sp-insights .sp-bars.gender .sp-bar-fill{background:#4c8a79}.sp-insights .sp-bar-value{text-align:right;font-variant-numeric:tabular-nums}.sp-insight-no-sales{color:#8d7f78;font-size:10px;line-height:1.6}.sp-insight-empty{display:grid;min-height:150px;place-items:center;border:1px dashed #e4d5ce;border-radius:8px;color:#8f817a;font-size:11px;text-align:center}.sp-insight-loading{display:grid;min-height:170px;place-items:center;color:#82726b;font-size:11px;font-weight:800}
      .sp-insight-detail-nav{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e6d7d0;border-radius:8px;background:#fff;padding:11px 13px;box-shadow:0 7px 20px rgba(67,43,35,.04)}.sp-insight-back{display:inline-flex;min-height:39px;align-items:center;gap:8px;border:0;background:transparent;color:#8e493e;font-size:11px;font-weight:850;text-decoration:none}.sp-insight-back svg{width:17px;height:17px}.sp-insight-detail-label{color:#8d7e77;font-size:10px;font-weight:800}.sp-review-product-v515{border-radius:8px!important}.sp-review-product-identity{display:grid!important;grid-template-columns:66px minmax(0,1fr);column-gap:12px;align-items:center}.sp-review-product-identity>.sp-detail-media{grid-row:1/3}.sp-review-product-identity>p,.sp-review-product-identity>h2{grid-column:2}.sp-review-product-identity>h2{margin-top:0!important}.sp-detail-media{position:relative;display:grid;width:66px;height:66px;place-items:center;overflow:hidden;border:1px solid #eadfd9;border-radius:8px;background:#faf7f5;color:#bba59c}.sp-detail-media svg{width:24px;height:24px}.sp-detail-media img{position:absolute;inset:0;width:100%;height:100%;background:#fff;object-fit:contain}
      @media(max-width:900px){.sp-insights .sp-product-grid{grid-template-columns:1fr}}
      @media(max-width:620px){.sp-insights{gap:15px;padding:15px}.sp-insights .sp-demographics-head{display:grid}.sp-insight-product-main{padding:14px}.sp-insight-product-top{grid-template-columns:68px minmax(0,1fr) 30px}.sp-insight-media{width:68px;height:68px}.sp-insight-metrics{grid-template-columns:1fr 1.2fr;gap:12px}.sp-insight-metric+.sp-insight-metric{padding-left:12px}.sp-insight-detail-nav{align-items:flex-start;flex-direction:column}.sp-insight-detail-label{padding-left:25px}.sp-review-product-identity{grid-template-columns:58px minmax(0,1fr)}.sp-detail-media{width:58px;height:58px}}
    `
    document.head.appendChild(style)
  }

  function safeImageUrl(value) {
    const text = String(value || '').trim()
    if (!text) return ''
    if (text.startsWith('/') && !text.startsWith('//')) return text
    try {
      const url = new URL(text, location.origin)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
    } catch {
      return ''
    }
  }

  function imageMarkup(product, detail = false) {
    const source = safeImageUrl(product?.imageUrl)
    const className = detail ? 'sp-detail-media' : 'sp-insight-media'
    return `<span class="${className}" ${detail ? 'data-sp-detail-media="1"' : ''}>${icon('package')}${source ? `<img src="${esc(source)}" alt="${esc(product.name)}の商品画像" loading="lazy" data-sp-product-image>` : ''}</span>`
  }

  function starsMarkup(value) {
    const rating = Number(value)
    const rounded = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0
    return `<span class="sp-insight-stars" aria-label="5点満点中${Number.isFinite(rating) ? rating.toFixed(1) : '未評価'}">${Array.from({ length: 5 }, (_, index) => icon('star').replace('<svg ', `<svg class="${index < rounded ? 'filled' : ''}" `)).join('')}</span>`
  }

  function barsMarkup(groups, tone) {
    const populated = (groups || []).filter(group => Number(group.quantity) > 0)
    if (!populated.length) return ''
    const max = Math.max(...populated.map(group => Number(group.quantity)))
    return `<div class="sp-bars ${tone || ''}"><span class="sp-bars-title">${tone === 'gender' ? '性別' : '年代'}</span>${populated.map(group => {
      const value = Number(group.quantity)
      const width = Math.max(6, Math.round(value / max * 100))
      return `<div class="sp-bar"><span>${esc(group.label)}</span><span class="sp-bar-track"><span class="sp-bar-fill" style="width:${width}%"></span></span><span class="sp-bar-value">${value.toLocaleString('ja-JP')}点</span></div>`
    }).join('')}</div>`
  }

  function productHref(product) {
    const params = new URLSearchParams({
      section: 'feedback',
      manufacturer: String(product.manufacturerName || ''),
      productName: String(product.name || ''),
      insightProduct: String(product.id || ''),
    })
    return `/admin/products?${params.toString()}`
  }

  function ratingMarkup(product) {
    const average = Number(product.averageRating)
    const count = Math.max(0, Number(product.reviewCount || 0))
    if (!count || !Number.isFinite(average)) return '<span class="sp-insight-unrated">未評価</span><span class="sp-insight-review-count">0件</span>'
    return `<strong class="sp-insight-score">${average.toFixed(1)}</strong>${starsMarkup(average)}<span class="sp-insight-review-count">${count.toLocaleString('ja-JP')}件</span>`
  }

  function productMarkup(product) {
    const total = Math.max(0, Number(product.totalQuantity || 0))
    const customers = Math.max(0, Number(product.customerCount || 0))
    return `<a class="sp-insight-product" href="${esc(productHref(product))}" aria-label="${esc(product.name)}の販売分析とレビューを表示"><div class="sp-insight-product-main"><div class="sp-insight-product-top">${imageMarkup(product)}<div class="sp-insight-identity"><span class="sp-insight-maker">${esc(product.manufacturerName || 'メーカー未設定')}</span><h3>${esc(product.name)}</h3><span class="sp-insight-category">${esc(product.category || 'カテゴリ未設定')}</span></div><span class="sp-insight-arrow" title="レビュー詳細を表示">${icon('arrowRight')}</span></div><div class="sp-insight-metrics"><div class="sp-insight-metric"><span class="sp-insight-metric-label">販売実績</span><div class="sp-insight-sales"><strong>${total.toLocaleString('ja-JP')}</strong><span>点 / ${customers.toLocaleString('ja-JP')}名</span></div></div><div class="sp-insight-metric"><span class="sp-insight-metric-label">顧客評価</span><div class="sp-insight-rating">${ratingMarkup(product)}</div></div></div>${total ? `<div class="sp-insight-highlights"><span class="sp-insight-highlight">${icon('users')}中心年代 ${esc(product.dominantAge || '未登録')}</span><span class="sp-insight-highlight">${icon('chart')}中心性別 ${esc(product.dominantGender || '未登録')}</span></div>${barsMarkup(product.ageGroups)}${barsMarkup(product.genders, 'gender')}` : '<div class="sp-insight-no-sales">会計済みの購入データはまだありません。レビューがある場合は詳細から確認できます。</div>'}</div></a>`
  }

  function pageRoot() {
    const main = document.querySelector('main')
    return main?.querySelector(':scope > div') || main
  }

  function reviewSection(root) {
    return [...(root?.children || [])].find(child => child.matches?.('section') && child.querySelector(':scope > article h2')) || null
  }

  function setHidden(element, hidden) {
    if (!element) return
    if (hidden) {
      element.hidden = true
      element.dataset.spInsightsHidden = '1'
    } else if (element.dataset.spInsightsHidden === '1') {
      element.hidden = false
      delete element.dataset.spInsightsHidden
    }
  }

  function hideLegacySummary(root) {
    for (const child of [...root.children]) {
      if (child.matches?.('[data-sp-demographics],[data-sp-insight-detail-nav]')) continue
      if (child.querySelector?.('form select[name="productName"]')) setHidden(child, true)
      else if (child.textContent.includes('回答者数') && child.textContent.includes('対象商品')) setHidden(child, true)
      else if ([...child.querySelectorAll?.('h3') || []].some(title => title.textContent.trim() === '回答者の年齢層')) setHidden(child, true)
    }
  }

  function updatePageCopy(root, detail) {
    const heading = [...root.querySelectorAll('h1,h2')].find(element => ['メーカー向け商品レビュー', '商品分析・レビュー', '商品レビュー詳細'].includes(element.textContent.trim()))
    if (!heading) return
    heading.textContent = detail ? '商品レビュー詳細' : '商品分析・レビュー'
    const description = heading.parentElement?.querySelector('p')
    if (description) description.textContent = detail ? '選択した商品の評価内容とお客様の声を確認します。' : '商品ごとの販売傾向と顧客評価を、ひとつの画面で比較できます。'
  }

  function attachImageFallbacks(container) {
    for (const image of container.querySelectorAll('img[data-sp-product-image]')) {
      image.addEventListener('error', () => image.remove(), { once: true })
    }
  }

  function placeSection(section, root, reviews) {
    if (reviews) root.insertBefore(section, reviews)
    else if (!section.isConnected) root.appendChild(section)
  }

  async function loadPayload() {
    if (payloadCache) return payloadCache
    if (payloadPromise) return payloadPromise
    request?.abort()
    request = new AbortController()
    payloadPromise = fetch('/api/lien-product-demographics', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: request.signal,
    }).then(async response => {
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '商品分析を読み込めませんでした。')
      payloadCache = payload
      return payload
    }).finally(() => { payloadPromise = null })
    return payloadPromise
  }

  async function renderList(root, reviews) {
    let section = root.querySelector(':scope > [data-sp-demographics]') || document.querySelector('[data-sp-demographics]')
    if (!section) {
      section = document.createElement('section')
      section.dataset.spDemographics = '1'
    }
    section.hidden = false
    section.className = 'sp-demographics sp-insights'
    placeSection(section, root, reviews)
    setHidden(reviews, true)
    if (section.dataset.spInsightsRoute === location.href && section.querySelector('.sp-product-grid')) return
    section.dataset.spInsightsRoute = location.href
    section.innerHTML = '<div class="sp-insight-loading">商品ごとの販売傾向と評価を読み込んでいます…</div>'
    try {
      const payload = await loadPayload()
      if (!section.isConnected || new URLSearchParams(location.search).has('insightProduct')) return
      const products = Array.isArray(payload.products) ? payload.products : []
      section.innerHTML = `<header class="sp-demographics-head"><div class="sp-demographics-title"><span class="sp-demographics-symbol">${icon('chart')}</span><div><h2>商品別 販売インサイト</h2><p>販売実績、購入されたお客様の傾向、レビュー評価を商品ごとに比較できます。商品を選ぶと、詳しいレビューを確認できます。</p></div></div><span class="sp-demographics-period">全期間</span></header><div class="sp-product-grid">${products.length ? products.map(productMarkup).join('') : '<div class="sp-insight-empty">集計対象の商品がありません。</div>'}</div>`
      attachImageFallbacks(section)
    } catch (error) {
      if (error?.name === 'AbortError') return
      section.innerHTML = `<div class="sp-insight-empty" role="alert">${esc(error.message)}</div>`
      section.dataset.spInsightsRoute = ''
    }
  }

  async function renderDetail(root, reviews, selectedId) {
    let sentinel = root.querySelector(':scope > [data-sp-demographics]') || document.querySelector('[data-sp-demographics]')
    if (!sentinel) {
      sentinel = document.createElement('section')
      sentinel.dataset.spDemographics = '1'
    }
    sentinel.hidden = true
    sentinel.className = ''
    sentinel.innerHTML = ''
    placeSection(sentinel, root, reviews)
    if (!reviews) return
    setHidden(reviews, false)
    reviews.dataset.spReviewSection = '1'
    const productName = new URLSearchParams(location.search).get('productName') || ''
    const articles = [...reviews.querySelectorAll(':scope > article')]
    for (const article of articles) {
      const matches = !productName || article.querySelector('h2')?.textContent.trim() === productName
      article.hidden = !matches
      if (matches) article.classList.add('sp-review-product-v515')
    }
    let navigation = root.querySelector(':scope > [data-sp-insight-detail-nav]')
    if (!navigation) {
      navigation = document.createElement('div')
      navigation.className = 'sp-insight-detail-nav'
      navigation.dataset.spInsightDetailNav = '1'
      navigation.innerHTML = `<a class="sp-insight-back" href="/admin/products?section=feedback">${icon('arrowLeft')}<span>商品別 販売インサイトへ戻る</span></a><span class="sp-insight-detail-label">顧客レビュー詳細</span>`
      root.insertBefore(navigation, sentinel)
    }
    try {
      const payload = await loadPayload()
      const product = payload.products?.find(item => String(item.id) === String(selectedId))
      const article = articles.find(item => !item.hidden)
      const heading = article?.querySelector('h2')
      const identity = heading?.parentElement
      if (product && identity && !identity.querySelector('[data-sp-detail-media]')) {
        identity.classList.add('sp-review-product-identity')
        identity.insertAdjacentHTML('afterbegin', imageMarkup(product, true))
        attachImageFallbacks(identity)
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('[product-insights-v515] detail image could not be loaded', error)
    }
  }

  async function enhance() {
    addStyles()
    const active = location.pathname === '/admin/products' && new URLSearchParams(location.search).get('section') === 'feedback'
    if (!active) {
      request?.abort()
      document.querySelector('[data-sp-demographics]')?.remove()
      document.querySelector('[data-sp-insight-detail-nav]')?.remove()
      document.querySelectorAll('[data-sp-insights-hidden="1"]').forEach(element => setHidden(element, false))
      return
    }
    const root = pageRoot()
    if (!root) return
    const reviews = reviewSection(root)
    const selectedId = new URLSearchParams(location.search).get('insightProduct')
    hideLegacySummary(root)
    updatePageCopy(root, Boolean(selectedId))
    if (selectedId) await renderDetail(root, reviews, selectedId)
    else {
      root.querySelector('[data-sp-insight-detail-nav]')?.remove()
      await renderList(root, reviews)
    }
  }

  function schedule() {
    window.clearTimeout(timer)
    timer = window.setTimeout(enhance, 90)
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      schedule()
      return result
    }
  }
  window.addEventListener('popstate', schedule)
  window.addEventListener('pageshow', schedule)
  document.addEventListener('DOMContentLoaded', schedule)
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  schedule()
})()
