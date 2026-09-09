;(() => {
  'use strict'

  if (window.__orimiaStyleSystemV602) return

  const route = location.pathname.match(/^\/(admin|u)\/community\/([^/?#]+)\/?$/)
  if (!route) return

  const audience = route[1] === 'admin' ? 'staff' : 'customer'
  const postId = decodeURIComponent(route[2])
  let payload = null
  let loading = false
  let scheduled = false

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[character])
  const yen = value => `${new Intl.NumberFormat('ja-JP').format(Number(value || 0))}円`
  const minute = value => Number(value) > 0 ? `${Number(value)}分` : ''

  async function request(url, options) {
    const response = await fetch(url, {
      credentials:'same-origin',
      cache:'no-store',
      headers:{ 'Content-Type':'application/json', ...(options?.headers || {}) },
      ...options,
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'スタイル情報を読み込めませんでした。')
    return result
  }

  function avatar(stylist, compact = false) {
    const size = compact ? 'orimia-style-avatar-v602 is-compact' : 'orimia-style-avatar-v602'
    if (stylist.avatarUrl) {
      return `<span class="${size}"><img src="${esc(stylist.avatarUrl)}" alt="${esc(stylist.name)}" loading="lazy"><span aria-hidden="true">${esc(stylist.name.slice(0, 1))}</span></span>`
    }
    return `<span class="${size}" aria-hidden="true"><span>${esc(stylist.name.slice(0, 1))}</span></span>`
  }

  function menuLabel(style) {
    if (style.menus.length) return style.menus.map(menu => menu.name).join(' / ')
    return style.sourceMenuText || 'メニュー情報なし'
  }

  function leadMarkup(style) {
    return `<section class="orimia-style-lead-v602" aria-label="スタイルの概要">
      <p class="orimia-style-kicker-v602">SALON STYLE</p>
      <h1>${esc(style.title)}</h1>
      <div class="orimia-style-lead-grid-v602">
        <div class="orimia-style-stylist-compact-v602">${avatar(style.stylist, true)}<span><small>担当スタイリスト</small><strong>${esc(style.stylist.name)}</strong>${style.stylist.role ? `<em>${esc(style.stylist.role)}</em>` : ''}</span></div>
        <div class="orimia-style-menu-compact-v602"><small>施術メニュー</small><strong>${esc(menuLabel(style))}</strong></div>
      </div>
    </section>`
  }

  function menuMarkup(style) {
    if (!style.menus.length) {
      return `<div class="orimia-style-source-menu-v602"><strong>${esc(style.sourceMenuText || 'メニュー未設定')}</strong><span>ORIMIAのメニューと紐付けると、料金や所要時間も最新情報で表示されます。</span></div>`
    }
    return `<div class="orimia-style-menu-list-v602">${style.menus.map(menu => {
      const facts = [menu.category, minute(menu.durationMinutes), yen(menu.priceYen)].filter(Boolean)
      return `<article><div><strong>${esc(menu.name)}</strong>${menu.description ? `<p>${esc(menu.description)}</p>` : ''}</div><span>${esc(facts.join(' ・ '))}</span></article>`
    }).join('')}</div>`
  }

  function detailsMarkup(style) {
    const linkedLabel = style.stylist.linked ? 'ORIMIAスタイリスト' : '担当スタイリスト'
    return `<section class="orimia-style-details-v602" aria-label="スタイル情報">
      <header><p class="orimia-style-kicker-v602">STYLE PROFILE</p><h2>${esc(style.title)}</h2></header>
      <div class="orimia-style-stylist-v602">${avatar(style.stylist)}<div><small>${linkedLabel}</small><strong>${esc(style.stylist.name)}</strong>${style.stylist.role ? `<span>${esc(style.stylist.role)}</span>` : ''}${style.stylist.specialties ? `<p>得意な施術　${esc(style.stylist.specialties)}</p>` : ''}</div></div>
      ${style.comment ? `<section class="orimia-style-copy-v602"><h3>スタイリストコメント</h3><p>${esc(style.comment)}</p></section>` : ''}
      <section class="orimia-style-menus-v602"><h3>メニュー内容</h3>${menuMarkup(style)}</section>
      ${style.source ? `<footer><span>${esc([style.source.name, style.source.area].filter(Boolean).join(' / '))}</span><a href="${esc(style.source.url)}" target="_blank" rel="noopener noreferrer">掲載元を見る</a></footer>` : ''}
      ${audience === 'staff' ? '<button type="button" class="orimia-style-edit-v602" data-orimia-style-edit-v602>スタイル情報と紐付けを編集</button>' : ''}
    </section>`
  }

  function suppressLegacy(article) {
    article.querySelectorAll('.lien-style-metadata-v596,.lien-owner-status').forEach(node => node.remove())
    article.querySelectorAll('header span').forEach(node => {
      if (node.children.length === 0 && ['公開中', '非公開'].includes(node.textContent.trim())) node.remove()
    })
    const meta = article.querySelector('.community-feed-meta,.orimia-style-legacy-meta-v602')
    if (meta) {
      meta.hidden = true
      meta.setAttribute('aria-hidden', 'true')
      meta.style.setProperty('display', 'none', 'important')
    }
    article.querySelectorAll('.lien-owner-panel').forEach(panel => {
      if (audience === 'customer') {
        panel.remove()
        return
      }
      const top = panel.querySelector('.lien-owner-panel__top')
      if (top && !top.textContent.trim() && !panel.querySelector('.lien-owner-actions')) panel.remove()
    })
  }

  function markGallery(article) {
    const header = article.querySelector(':scope > header')
    let gallery = article.querySelector(':scope > .community-feed-media')
    if (!gallery && header?.nextElementSibling?.querySelector('a[aria-label="施術後写真を拡大表示"]')) gallery = header.nextElementSibling
    if (!gallery) return null
    const photos = [...gallery.querySelectorAll(':scope > a[aria-label="施術後写真を拡大表示"]')]
    const count = photos.length
    gallery.classList.add('orimia-style-gallery-v602')
    gallery.dataset.photoCountV602 = String(count)
    if (audience === 'customer') {
      const compact = matchMedia('(max-width: 767px)').matches
      for (const photo of photos) {
        for (const property of ['aspect-ratio', 'height', 'min-height', 'max-height']) photo.style.removeProperty(property)
        if (compact) {
          photo.style.setProperty('aspect-ratio', 'auto', 'important')
          photo.style.setProperty('height', '100%', 'important')
          photo.style.setProperty('min-height', '0', 'important')
          photo.style.setProperty('max-height', 'none', 'important')
        }
      }
    }
    return gallery
  }

  function render() {
    if (!payload?.post?.style) return
    const article = document.querySelector('.community-detail-page article, .ts-community-detail article, main article')
    if (!article) return
    const style = payload.post.style
    article.classList.add('orimia-style-detail-v602', `orimia-style-detail-${audience}-v602`)
    suppressLegacy(article)
    const gallery = markGallery(article)
    const content = article.querySelector('.community-feed-content') || article.querySelector(':scope > div:last-of-type')
    const meta = content?.querySelector('.community-feed-meta,.orimia-style-legacy-meta-v602') || content?.querySelector(':scope > div:first-child')
    if (!gallery || !content || !meta) return
    meta.classList.add('orimia-style-legacy-meta-v602')
    meta.hidden = true
    meta.setAttribute('aria-hidden', 'true')
    meta.style.setProperty('display', 'none', 'important')

    const signature = JSON.stringify(style)
    const existingLead = article.querySelector('.orimia-style-lead-v602')
    if (audience === 'customer' && existingLead?.dataset.styleSignatureV602 !== signature) {
      existingLead?.remove()
      gallery.insertAdjacentHTML('beforebegin', leadMarkup(style))
      article.querySelector('.orimia-style-lead-v602').dataset.styleSignatureV602 = signature
    } else if (audience !== 'customer') {
      existingLead?.remove()
    }

    const existingDetails = content.querySelector('.orimia-style-details-v602')
    if (existingDetails?.dataset.styleSignatureV602 !== signature) {
      existingDetails?.remove()
      meta.insertAdjacentHTML('afterend', detailsMarkup(style))
      const details = content.querySelector('.orimia-style-details-v602')
      details.dataset.styleSignatureV602 = signature
      details.querySelector('[data-orimia-style-edit-v602]')?.addEventListener('click', openEditor)
      details.querySelectorAll('.orimia-style-avatar-v602 img').forEach(image => {
        image.addEventListener('error', () => image.remove(), { once:true })
      })
    }
    suppressLegacy(article)
  }

  function editorMenuRows(style, options) {
    const selected = new Set(style.menus.map(menu => menu.id))
    if (!options.menus.length) return '<p class="orimia-style-empty-v602">店舗のメニュー管理で先にメニューを登録してください。</p>'
    return options.menus.map(menu => `<label class="orimia-style-menu-option-v602"><input type="checkbox" name="menuIds" value="${esc(menu.id)}" ${selected.has(menu.id) ? 'checked' : ''}><span><strong>${esc(menu.name)}</strong><small>${esc([menu.category, minute(menu.durationMinutes), yen(menu.priceYen)].filter(Boolean).join(' ・ '))}</small></span></label>`).join('')
  }

  function openEditor() {
    const style = payload?.post?.style
    const options = payload?.options
    if (!style || !options || document.querySelector('.orimia-style-dialog-v602')) return
    const dialog = document.createElement('dialog')
    dialog.className = 'orimia-style-dialog-v602'
    dialog.setAttribute('aria-labelledby', 'orimia-style-dialog-title-v602')
    dialog.innerHTML = `<form method="dialog">
      <header><div><p class="orimia-style-kicker-v602">STYLE CONNECTION</p><h2 id="orimia-style-dialog-title-v602">スタイル情報とORIMIAの登録情報を紐付け</h2><p>担当者とメニューは、店舗で管理している最新情報がお客様に表示されます。</p></div><button type="button" data-orimia-style-close-v602 aria-label="閉じる">×</button></header>
      <div class="orimia-style-dialog-body-v602">
        <label class="orimia-style-field-v602"><span>スタイル名</span><input name="styleName" maxlength="160" required value="${esc(style.title)}"></label>
        <label class="orimia-style-field-v602"><span>担当スタイリスト</span><select name="staffKey"><option value="">取込元の担当者情報を使用</option>${options.staff.map(staff => `<option value="${esc(staff.key)}" ${style.stylist.linked && style.stylist.key === staff.key ? 'selected' : ''}>${esc(staff.name)}${staff.role ? ` ・ ${esc(staff.role)}` : ''}</option>`).join('')}</select><small>スタッフ管理の表示名・役職・写真・紹介文と連動します。</small></label>
        <label class="orimia-style-field-v602"><span>スタイリストコメント</span><textarea name="stylistComment" maxlength="4000" rows="5">${esc(style.comment)}</textarea></label>
        <fieldset class="orimia-style-menu-options-v602"><legend>メニュー内容</legend><p>メニュー管理の登録内容から複数選択できます。</p><div>${editorMenuRows(style, options)}</div>${style.sourceMenuText ? `<small>取込元の記載　${esc(style.sourceMenuText)}</small>` : ''}</fieldset>
        <p class="orimia-style-dialog-feedback-v602" role="status" aria-live="polite"></p>
      </div>
      <footer><button type="button" data-orimia-style-cancel-v602>キャンセル</button><button type="submit" class="is-primary">保存</button></footer>
    </form>`
    document.body.append(dialog)
    const close = () => dialog.close()
    dialog.querySelector('[data-orimia-style-close-v602]').addEventListener('click', close)
    dialog.querySelector('[data-orimia-style-cancel-v602]').addEventListener('click', close)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
    dialog.addEventListener('close', () => dialog.remove(), { once:true })
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault()
      const form = event.currentTarget
      const submit = form.querySelector('button[type="submit"]')
      const feedback = form.querySelector('[role="status"]')
      const data = new FormData(form)
      submit.disabled = true
      feedback.textContent = '保存しています。'
      try {
        const result = await request(`/api/lien-style-system?audience=staff&postId=${encodeURIComponent(postId)}`, {
          method:'PATCH',
          body:JSON.stringify({
            styleName:data.get('styleName'),
            staffKey:data.get('staffKey'),
            stylistComment:data.get('stylistComment'),
            menuIds:data.getAll('menuIds'),
          }),
        })
        payload.post.style = result.style
        dialog.close()
        render()
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : '保存できませんでした。'
        submit.disabled = false
      }
    })
    dialog.showModal()
    dialog.querySelector('input[name="styleName"]').focus()
  }

  async function load() {
    if (loading || payload) return
    const article = document.querySelector('.community-detail-page article, .ts-community-detail article, main article')
    if (!article) return
    loading = true
    try {
      payload = await request(`/api/lien-style-system?audience=${audience}&postId=${encodeURIComponent(postId)}`)
      render()
    } catch (error) {
      console.warn('[style-system-integration-v602]', error instanceof Error ? error.message : error)
    } finally {
      loading = false
    }
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      if (payload) render()
      else load()
    })
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true })
  addEventListener('resize', schedule, { passive:true })
  window.__orimiaStyleSystemV602 = { release:'style-system-integration-v602', refresh:schedule }
  schedule()
})()
