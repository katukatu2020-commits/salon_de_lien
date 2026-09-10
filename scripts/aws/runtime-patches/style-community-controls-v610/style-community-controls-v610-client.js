(() => {
  'use strict'
  if (window.__orimiaStyleCommunityControlsV610) return
  window.__orimiaStyleCommunityControlsV610 = true

  const LIST_PATH = '/u/community'
  const SORT_OPTIONS = [
    ['latest', '新しい順'],
    ['likes', 'いいねが多い順'],
    ['oldest', '古い順'],
  ]
  const GENDER_OPTIONS = [
    ['', 'すべて'],
    ['女性', '女性'],
    ['男性', '男性'],
    ['ユニセックス', 'ユニセックス'],
  ]
  let listRoot = null
  let listRequest = 0
  let scanQueued = false

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character])
  }

  function normalizedPath() {
    return location.pathname.replace(/\/+$/, '') || '/'
  }

  async function request(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...((options && options.headers) || {}) },
      ...(options || {}),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '操作を完了できませんでした。')
    return payload
  }

  function selectMarkup(name, label, value, options) {
    const rows = options.map(option => '<option value="' + esc(option[0]) + '" ' +
      (String(option[0]) === String(value) ? 'selected' : '') + '>' + esc(option[1]) + '</option>').join('')
    return '<label class="orimia-style-filter-field-v610"><span>' + esc(label) + '</span>' +
      '<select name="' + esc(name) + '">' + rows + '</select></label>'
  }

  function readListFilters() {
    const params = new URLSearchParams(location.search)
    const requestedSort = params.get('sort') || 'latest'
    return {
      sort: SORT_OPTIONS.some(option => option[0] === requestedSort) ? requestedSort : 'latest',
      stylist: params.get('stylist') || '',
      gender: params.get('gender') || '',
      liked: params.get('liked') === '1',
      page: Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1),
    }
  }

  function writeListFilters(filters, push) {
    const url = new URL(location.href)
    for (const name of ['sort', 'stylist', 'gender', 'liked', 'page', 'course', 'age']) url.searchParams.delete(name)
    if (filters.sort && filters.sort !== 'latest') url.searchParams.set('sort', filters.sort)
    if (filters.stylist) url.searchParams.set('stylist', filters.stylist)
    if (filters.gender) url.searchParams.set('gender', filters.gender)
    if (filters.liked) url.searchParams.set('liked', '1')
    if (filters.page > 1) url.searchParams.set('page', String(filters.page))
    history[push === false ? 'replaceState' : 'pushState']({}, '', url)
  }

  function legacyFilterSection() {
    return [...document.querySelectorAll('section')].find(section => (
      section.querySelectorAll('select').length >= 3
      && section.textContent.includes('絞り込み・並び順')
    )) || null
  }

  function mountList() {
    if (normalizedPath() !== LIST_PATH || (listRoot && listRoot.isConnected)) return
    const legacyFilter = legacyFilterSection()
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
    const legacyGrid = legacyFilter.nextElementSibling
    legacyFilter.classList.add('orimia-style-list-legacy-hidden-v610')
    legacyGrid.classList.add('orimia-style-list-legacy-hidden-v610')
    listRoot = document.createElement('section')
    listRoot.className = 'orimia-style-community-v610'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    listRoot.innerHTML = '<div class="orimia-style-list-loading-v610" role="status">スタイルを読み込んでいます。</div>'
    legacyFilter.before(listRoot)
    loadList()
  }

  function includeSelectedOption(options, value) {
    if (!value || options.some(option => option[0] === value)) return options
    return [...options, [value, value]]
  }

  function cardMarkup(post, index) {
    const lazy = index > 5 ? ' loading="lazy"' : ''
    const liked = post.liked
      ? '<span class="orimia-style-liked-badge-v610" aria-label="いいね済み">♥</span>'
      : ''
    return '<a class="orimia-style-card-v610" href="/u/community/' + encodeURIComponent(post.id) +
      '" aria-label="' + esc(post.title) + 'の詳細を開く">' +
      '<img src="' + esc(post.coverPhotoUrl) + '" alt="' + esc(post.title) + '"' + lazy + ' decoding="async">' +
      liked + '</a>'
  }

  function renderList(payload) {
    if (!listRoot || !listRoot.isConnected) return
    const filters = payload.filters
    const stylistOptions = [['', 'すべて'], ...(payload.options && payload.options.stylists || []).map(option => [option.value, option.label])]
    const first = payload.totalCount ? (payload.page - 1) * payload.pageSize + 1 : 0
    const last = Math.min(payload.page * payload.pageSize, payload.totalCount)
    const cards = payload.posts.length
      ? '<div class="orimia-style-grid-v610">' + payload.posts.map(cardMarkup).join('') + '</div>'
      : '<div class="orimia-style-empty-v610"><strong>条件に合うスタイルはありません</strong><span>絞り込み条件を変更してください。</span></div>'
    const pager = payload.totalPages > 1
      ? '<nav class="orimia-style-pager-v610" aria-label="スタイル一覧のページ">' +
          '<button type="button" data-page-v610="' + (payload.page - 1) + '" ' + (payload.page <= 1 ? 'disabled' : '') + '>前へ</button>' +
          '<span>' + payload.page + ' / ' + payload.totalPages + '</span>' +
          '<button type="button" data-page-v610="' + (payload.page + 1) + '" ' + (payload.page >= payload.totalPages ? 'disabled' : '') + '>次へ</button>' +
        '</nav>'
      : ''

    listRoot.innerHTML =
      '<div class="orimia-style-filter-toolbar-v610">' +
        '<div class="orimia-style-filter-heading-v610"><strong>絞り込み・並び順</strong><button type="button" data-reset-v610>リセット</button></div>' +
        '<div class="orimia-style-filter-grid-v610">' +
          selectMarkup('sort', '並び順', filters.sort, SORT_OPTIONS) +
          selectMarkup('stylist', 'スタイリスト', filters.stylist, includeSelectedOption(stylistOptions, filters.stylist)) +
          selectMarkup('gender', '性別', filters.gender, GENDER_OPTIONS) +
          '<label class="orimia-style-liked-filter-v610"><input type="checkbox" name="liked" ' + (filters.likedOnly ? 'checked' : '') +
            '><span aria-hidden="true">♡</span><strong>いいねした投稿のみ</strong></label>' +
        '</div>' +
      '</div>' +
      '<div class="orimia-style-result-meta-v610"><span>' + payload.totalCount + '件</span><span>' +
        (payload.totalCount ? first + '〜' + last + '件を表示' : '') + '</span></div>' +
      cards + pager

    listRoot.querySelectorAll('select,input[name="liked"]').forEach(control => {
      control.addEventListener('change', () => {
        const next = {
          sort: listRoot.querySelector('[name="sort"]').value,
          stylist: listRoot.querySelector('[name="stylist"]').value,
          gender: listRoot.querySelector('[name="gender"]').value,
          liked: listRoot.querySelector('[name="liked"]').checked,
          page: 1,
        }
        writeListFilters(next)
        loadList()
      })
    })
    const reset = listRoot.querySelector('[data-reset-v610]')
    if (reset) reset.addEventListener('click', () => {
      writeListFilters({ sort: 'latest', stylist: '', gender: '', liked: false, page: 1 })
      loadList()
    })
    listRoot.querySelectorAll('[data-page-v610]').forEach(button => button.addEventListener('click', () => {
      if (button.disabled) return
      const next = readListFilters()
      next.page = Number(button.dataset.pageV610 || 1)
      writeListFilters(next)
      loadList()
      listRoot.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    }))
  }

  async function loadList() {
    if (!listRoot || !listRoot.isConnected || normalizedPath() !== LIST_PATH) return
    const requestId = ++listRequest
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v610')
    try {
      const params = new URLSearchParams()
      if (filters.sort !== 'latest') params.set('sort', filters.sort)
      if (filters.stylist) params.set('stylist', filters.stylist)
      if (filters.gender) params.set('gender', filters.gender)
      if (filters.liked) params.set('liked', '1')
      if (filters.page > 1) params.set('page', String(filters.page))
      const payload = await request('/api/lien-style-community-v610?' + params)
      if (requestId !== listRequest) return
      if (payload.page !== filters.page) {
        writeListFilters({
          sort: payload.filters.sort,
          stylist: payload.filters.stylist,
          gender: payload.filters.gender,
          liked: payload.filters.likedOnly,
          page: payload.page,
        }, false)
      }
      renderList(payload)
    } catch (error) {
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
      listRoot.innerHTML = '<div class="orimia-style-list-error-v610" role="alert">' +
        '<strong>スタイルを読み込めませんでした。</strong><span>' +
        esc(error instanceof Error ? error.message : '時間をおいて試してください。') +
        '</span><button type="button">再読み込み</button></div>'
      const retry = listRoot.querySelector('button')
      if (retry) retry.addEventListener('click', loadList)
    } finally {
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v610')
    }
  }

  function editorPostId() {
    const match = normalizedPath().match(/^\/admin\/community\/([^/]+)$/)
    if (!match) return ''
    try { return decodeURIComponent(match[1]) } catch { return '' }
  }

  function editorMenuRows(style, options) {
    const selected = new Set((style.menus || []).map(menu => String(menu.id)))
    if (!options.menus.length) return '<p class="orimia-style-empty-v602">店舗のメニュー管理で先にメニューを登録してください。</p>'
    return options.menus.map(menu => {
      const facts = [
        menu.category,
        menu.durationMinutes ? menu.durationMinutes + '分' : '',
        menu.priceYen ? Number(menu.priceYen).toLocaleString('ja-JP') + '円' : '',
      ].filter(Boolean).join(' ・ ')
      return '<label class="orimia-style-menu-option-v602"><input type="checkbox" name="menuIds" value="' +
        esc(menu.id) + '" ' + (selected.has(String(menu.id)) ? 'checked' : '') +
        '><span><strong>' + esc(menu.name) + '</strong><small>' + esc(facts) + '</small></span></label>'
    }).join('')
  }

  function fileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('写真を読み込めませんでした。'))
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
      reader.readAsDataURL(file)
    })
  }

  async function openEditor(postId) {
    if (document.querySelector('.orimia-style-dialog-v610')) return
    let payload
    try {
      payload = await request('/api/lien-style-editor-v610?postId=' + encodeURIComponent(postId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'スタイル情報を読み込めませんでした。')
      return
    }

    const style = payload.post.style
    const options = payload.options
    const dialog = document.createElement('dialog')
    dialog.className = 'orimia-style-dialog-v602 orimia-style-dialog-v610'
    dialog.setAttribute('aria-labelledby', 'orimia-style-dialog-title-v610')
    const preview = style.stylist.avatarUrl
      ? '<img src="' + esc(style.stylist.avatarUrl) + '" alt="現在のスタイリスト写真">'
      : '<span aria-hidden="true">写真未登録</span>'
    const staffOptions = options.staff.map(staff =>
      '<option value="' + esc(staff.key) + '" ' +
      (style.stylist.linked && style.stylist.key === staff.key ? 'selected' : '') + '>' +
      esc(staff.name) + (staff.role ? ' ・ ' + esc(staff.role) : '') + '</option>'
    ).join('')
    const genderOptions = GENDER_OPTIONS.map(option =>
      '<option value="' + esc(option[0]) + '" ' + (style.gender === option[0] ? 'selected' : '') + '>' +
      (option[0] ? esc(option[1]) : '指定なし') + '</option>'
    ).join('')

    dialog.innerHTML =
      '<form method="dialog">' +
        '<header><div><p class="orimia-style-kicker-v602">STYLE PROFILE</p>' +
          '<h2 id="orimia-style-dialog-title-v610">スタイル情報を編集</h2></div>' +
          '<button type="button" data-close-v610 aria-label="閉じる">×</button></header>' +
        '<div class="orimia-style-dialog-body-v602">' +
          '<label class="orimia-style-field-v602"><span>スタイル名</span><input name="styleName" maxlength="160" required value="' + esc(style.title) + '"></label>' +
          '<label class="orimia-style-field-v602"><span>担当スタイリスト</span><select name="staffKey">' +
            '<option value="">取込元の担当者情報を使用</option>' + staffOptions + '</select></label>' +
          '<label class="orimia-style-field-v602"><span>性別</span><select name="gender">' + genderOptions + '</select></label>' +
          '<fieldset class="orimia-style-photo-editor-v610"><legend>スタイリスト写真</legend>' +
            '<div class="orimia-style-photo-row-v610"><div class="orimia-style-photo-preview-v610" data-photo-preview-v610>' + preview + '</div>' +
              '<div><label class="orimia-style-photo-picker-v610">写真を選択<input type="file" name="stylistPhoto" accept="image/jpeg,image/png,image/webp"></label>' +
                '<small>JPG・PNG・WebP / 5MB以下</small>' +
                (style.stylist.avatarUrl ? '<label class="orimia-style-photo-remove-v610"><input type="checkbox" name="removeStylistPhoto"> 現在の写真を削除</label>' : '') +
              '</div></div></fieldset>' +
          '<label class="orimia-style-field-v602"><span>スタイリストコメント</span><textarea name="stylistComment" maxlength="4000" rows="5">' + esc(style.comment) + '</textarea></label>' +
          '<fieldset class="orimia-style-menu-options-v602"><legend>メニュー内容</legend><div>' + editorMenuRows(style, options) + '</div></fieldset>' +
          '<p class="orimia-style-dialog-feedback-v602" role="status" aria-live="polite"></p>' +
        '</div>' +
        '<footer><button type="button" data-cancel-v610>キャンセル</button><button type="submit" class="is-primary">保存</button></footer>' +
      '</form>'
    document.body.append(dialog)

    const form = dialog.querySelector('form')
    const fileInput = form.elements.stylistPhoto
    const removeInput = form.elements.removeStylistPhoto
    const previewNode = dialog.querySelector('[data-photo-preview-v610]')
    let objectUrl = ''
    const close = () => dialog.close()
    dialog.querySelector('[data-close-v610]').addEventListener('click', close)
    dialog.querySelector('[data-cancel-v610]').addEventListener('click', close)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
    dialog.addEventListener('close', () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      dialog.remove()
    }, { once: true })
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0]
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        fileInput.value = ''
        dialog.querySelector('[role="status"]').textContent = '写真は5MB以下のJPG・PNG・WebPで選択してください。'
        return
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(file)
      previewNode.innerHTML = '<img src="' + esc(objectUrl) + '" alt="選択中のスタイリスト写真">'
      if (removeInput) removeInput.checked = false
      dialog.querySelector('[role="status"]').textContent = ''
    })
    if (removeInput) removeInput.addEventListener('change', () => {
      if (!removeInput.checked) return
      fileInput.value = ''
      previewNode.innerHTML = '<span aria-hidden="true">削除します</span>'
    })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      const submit = form.querySelector('button[type="submit"]')
      const feedback = form.querySelector('[role="status"]')
      const data = new FormData(form)
      submit.disabled = true
      feedback.textContent = '保存しています。'
      try {
        const file = fileInput.files && fileInput.files[0]
        const body = {
          styleName: data.get('styleName'),
          staffKey: data.get('staffKey'),
          gender: data.get('gender'),
          stylistComment: data.get('stylistComment'),
          menuIds: data.getAll('menuIds'),
          removeStylistPhoto: Boolean(removeInput && removeInput.checked),
        }
        if (file) body.photo = { mimeType: file.type, data: await fileAsBase64(file) }
        await request('/api/lien-style-editor-v610?postId=' + encodeURIComponent(postId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        feedback.textContent = '保存しました。'
        location.reload()
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : '保存できませんでした。'
        submit.disabled = false
      }
    })
    dialog.showModal()
  }

  function bindEditorButton() {
    const postId = editorPostId()
    if (!postId) return
    document.querySelectorAll('[data-orimia-style-edit-v602]').forEach(button => {
      if (button.dataset.orimiaStyleEditV610 === 'true') return
      const replacement = button.cloneNode(true)
      replacement.dataset.orimiaStyleEditV610 = 'true'
      replacement.textContent = 'スタイル情報を編集'
      button.replaceWith(replacement)
      replacement.addEventListener('click', () => openEditor(postId))
    })
  }

  function scan() {
    scanQueued = false
    if (normalizedPath() === LIST_PATH) mountList()
    bindEditorButton()
  }

  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true })
  addEventListener('popstate', () => {
    scheduleScan()
    if (normalizedPath() === LIST_PATH) loadList()
  })
  addEventListener('pageshow', event => {
    scheduleScan()
    if (event.persisted && normalizedPath() === LIST_PATH) loadList()
  })
  scan()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
})()
