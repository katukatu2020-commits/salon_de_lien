(() => {
  'use strict'
  if (window.__orimiaStyleAdminControlsV618) return
  window.__orimiaStyleAdminControlsV618 = true

  const LIST_PATH = '/admin/community'
  const SORT_OPTIONS = [
    ['latest', '新しい順'],
    ['likes', 'いいねが多い順'],
    ['oldest', '古い順'],
  ]
  const GENDER_OPTIONS = [
    ['', 'すべて'],
    ['女性', '女性'],
    ['男性', '男性'],
    ['その他', 'その他'],
  ]
  let listRoot = null
  let listRequest = 0
  let scanQueued = false
  let editorOpening = false

  const icons = {
    filters: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"></path><circle cx="8" cy="6" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="12" cy="18" r="1"></circle></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>',
    images: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-5-5L5 21"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>',
  }

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
    return '<label class="orimia-admin-style-filter-field-v618"><span>' + esc(label) + '</span>' +
      '<select name="' + esc(name) + '">' + rows + '</select></label>'
  }

  function readListFilters() {
    const params = new URLSearchParams(location.search)
    const requestedSort = params.get('sort') || 'latest'
    return {
      sort: SORT_OPTIONS.some(option => option[0] === requestedSort) ? requestedSort : 'latest',
      staffKey: params.get('staff') || '',
      course: params.get('course') || '',
      gender: params.get('gender') || '',
      page: Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1),
    }
  }

  function writeListFilters(filters, push) {
    const url = new URL(location.href)
    for (const name of ['sort', 'staff', 'stylist', 'course', 'gender', 'age', 'page']) url.searchParams.delete(name)
    if (filters.sort && filters.sort !== 'latest') url.searchParams.set('sort', filters.sort)
    if (filters.staffKey) url.searchParams.set('staff', filters.staffKey)
    if (filters.course) url.searchParams.set('course', filters.course)
    if (filters.gender) url.searchParams.set('gender', filters.gender)
    if (filters.page > 1) url.searchParams.set('page', String(filters.page))
    history[push === false ? 'replaceState' : 'pushState']({}, '', url)
  }

  function legacyFilterSections() {
    return [...document.querySelectorAll('section')].filter(section => (
      !section.classList.contains('orimia-style-admin-v618')
      && section.querySelectorAll('select').length >= 3
      && section.textContent.includes('絞り込み・並び順')
    ))
  }

  function suppressLegacyLists() {
    const filters = legacyFilterSections()
    for (const filter of filters) {
      filter.classList.add('orimia-style-admin-legacy-hidden-v618')
      const grid = filter.nextElementSibling
      if (grid && grid !== listRoot) grid.classList.add('orimia-style-admin-legacy-hidden-v618')
    }
    return filters[0] || null
  }

  function mountList() {
    if (normalizedPath() !== LIST_PATH) return
    const legacyFilter = suppressLegacyLists()
    if (listRoot && listRoot.isConnected) return
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
    listRoot = document.createElement('section')
    listRoot.className = 'orimia-style-admin-v618'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    listRoot.innerHTML = '<div class="orimia-admin-style-loading-v618" role="status">スタイルを読み込んでいます。</div>'
    legacyFilter.before(listRoot)
    const filters = readListFilters()
    writeListFilters(filters, false)
    loadList()
  }

  function formatDate(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
  }

  function cardMarkup(post, index) {
    const lazy = index > 5 ? ' loading="lazy"' : ''
    const facts = [post.stylistName, post.gender].filter(Boolean).map(esc).join(' ・ ')
    return '<a class="orimia-admin-style-card-v618" href="/admin/community/' + encodeURIComponent(post.id) +
      '" aria-label="' + esc(post.title) + 'の詳細を開く">' +
      '<span class="orimia-admin-style-image-v618"><img src="' + esc(post.coverPhotoUrl) + '" alt=""' + lazy + ' decoding="async"></span>' +
      '<span class="orimia-admin-style-card-copy-v618"><strong>' + esc(post.title) + '</strong>' +
      '<small>' + facts + '</small></span></a>'
  }

  function renderList(payload) {
    if (!listRoot || !listRoot.isConnected) return
    const filters = payload.filters
    const staffOptions = [['', 'すべて'], ...(payload.options?.staff || []).map(option => [option.key, option.name])]
    const courseOptions = [['', 'すべて'], ...(payload.options?.courses || []).map(option => [option.value, option.label])]
    const first = payload.totalCount ? (payload.page - 1) * payload.pageSize + 1 : 0
    const last = Math.min(payload.page * payload.pageSize, payload.totalCount)
    const cards = payload.posts.length
      ? '<div class="orimia-admin-style-grid-v618">' + payload.posts.map(cardMarkup).join('') + '</div>'
      : '<div class="orimia-admin-style-empty-v618"><strong>条件に合うスタイルはありません</strong><span>絞り込み条件を変更してください。</span></div>'
    const pager = payload.totalPages > 1
      ? '<nav class="orimia-admin-style-pager-v618" aria-label="スタイル一覧のページ">' +
          '<button type="button" data-page-v618="' + (payload.page - 1) + '" ' + (payload.page <= 1 ? 'disabled' : '') + '>前へ</button>' +
          '<span>' + payload.page + ' / ' + payload.totalPages + '</span>' +
          '<button type="button" data-page-v618="' + (payload.page + 1) + '" ' + (payload.page >= payload.totalPages ? 'disabled' : '') + '>次へ</button>' +
        '</nav>'
      : ''

    listRoot.innerHTML =
      '<div class="orimia-admin-style-toolbar-v618">' +
        '<div class="orimia-admin-style-heading-v618"><strong>' + icons.filters + '絞り込み・並び順</strong>' +
          '<button type="button" data-reset-v618>' + icons.reset + 'リセット</button></div>' +
        '<div class="orimia-admin-style-filters-v618">' +
          selectMarkup('sort', '並び順', filters.sort, SORT_OPTIONS) +
          selectMarkup('staff', 'スタイリスト', filters.staffKey, staffOptions) +
          selectMarkup('course', 'コース', filters.course, courseOptions) +
          selectMarkup('gender', '性別', filters.gender, GENDER_OPTIONS) +
        '</div>' +
      '</div>' +
      '<div class="orimia-admin-style-result-v618"><span>' + icons.images + payload.totalCount + '件</span><span>' +
        (payload.totalCount ? first + '〜' + last + '件を表示' : '') + '</span></div>' +
      cards + pager

    listRoot.querySelectorAll('select').forEach(control => {
      control.addEventListener('change', () => {
        const next = {
          sort: listRoot.querySelector('[name="sort"]').value,
          staffKey: listRoot.querySelector('[name="staff"]').value,
          course: listRoot.querySelector('[name="course"]').value,
          gender: listRoot.querySelector('[name="gender"]').value,
          page: 1,
        }
        writeListFilters(next)
        loadList()
      })
    })
    listRoot.querySelector('[data-reset-v618]')?.addEventListener('click', () => {
      writeListFilters({ sort: 'latest', staffKey: '', course: '', gender: '', page: 1 })
      loadList()
    })
    listRoot.querySelectorAll('[data-page-v618]').forEach(button => button.addEventListener('click', () => {
      if (button.disabled) return
      const next = readListFilters()
      next.page = Number(button.dataset.pageV618 || 1)
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
    listRoot.classList.add('is-loading-v618')
    try {
      const params = new URLSearchParams()
      if (filters.sort !== 'latest') params.set('sort', filters.sort)
      if (filters.staffKey) params.set('staff', filters.staffKey)
      if (filters.course) params.set('course', filters.course)
      if (filters.gender) params.set('gender', filters.gender)
      if (filters.page > 1) params.set('page', String(filters.page))
      const payload = await request('/api/lien-style-admin-v618?' + params)
      if (requestId !== listRequest) return
      const canonical = {
        sort: payload.filters.sort,
        staffKey: payload.filters.staffKey,
        course: payload.filters.course,
        gender: payload.filters.gender,
        page: payload.page,
      }
      writeListFilters(canonical, false)
      renderList(payload)
    } catch (error) {
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
      listRoot.innerHTML = '<div class="orimia-admin-style-error-v618" role="alert"><strong>スタイルを読み込めませんでした。</strong>' +
        '<span>' + esc(error instanceof Error ? error.message : '時間をおいて試してください。') + '</span>' +
        '<button type="button">再読み込み</button></div>'
      listRoot.querySelector('button')?.addEventListener('click', loadList)
    } finally {
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v618')
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
    if (editorOpening || document.querySelector('.orimia-style-dialog-v618')) return
    editorOpening = true
    document.querySelectorAll('.orimia-style-dialog-v602').forEach(dialog => dialog.remove())
    let payload
    try {
      payload = await request('/api/lien-style-editor-v618?postId=' + encodeURIComponent(postId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'スタイル情報を読み込めませんでした。')
      editorOpening = false
      return
    }

    const style = payload.post.style
    const options = payload.options
    const activeStaffKeys = new Set(options.staff.map(staff => String(staff.key)))
    const selectedStaffKey = style.stylist.linked && activeStaffKeys.has(String(style.stylist.key)) ? String(style.stylist.key) : ''
    const staffOptions = options.staff.map(staff =>
      '<option value="' + esc(staff.key) + '" ' + (selectedStaffKey === String(staff.key) ? 'selected' : '') + '>' +
      esc(staff.name) + '</option>'
    ).join('')
    const genderOptions = [
      ['', '未設定'],
      ['女性', '女性'],
      ['男性', '男性'],
      ['その他', 'その他'],
    ].map(option => '<option value="' + esc(option[0]) + '" ' + (style.gender === option[0] ? 'selected' : '') + '>' +
      esc(option[1]) + '</option>').join('')
    const preview = style.stylist.avatarUrl
      ? '<img src="' + esc(style.stylist.avatarUrl) + '" alt="現在のスタイリスト写真">'
      : '<span aria-hidden="true">写真未登録</span>'
    const noStaff = options.staff.length === 0
    const dialog = document.createElement('dialog')
    dialog.className = 'orimia-style-dialog-v602 orimia-style-dialog-v618'
    dialog.setAttribute('aria-labelledby', 'orimia-style-dialog-title-v618')
    dialog.innerHTML =
      '<form method="dialog">' +
        '<header><div><p class="orimia-style-kicker-v602">STYLE PROFILE</p>' +
          '<h2 id="orimia-style-dialog-title-v618">スタイル情報を編集</h2></div>' +
          '<button type="button" data-close-v618 aria-label="閉じる">×</button></header>' +
        '<div class="orimia-style-dialog-body-v602">' +
          '<label class="orimia-style-field-v602"><span>スタイル名</span><input name="styleName" maxlength="160" required value="' + esc(style.title) + '"></label>' +
          '<label class="orimia-style-field-v602"><span>スタッフ</span><select name="staffKey" required>' +
            '<option value="" disabled ' + (selectedStaffKey ? '' : 'selected') + '>スタッフを選択</option>' + staffOptions + '</select></label>' +
          (noStaff ? '<p class="orimia-style-no-staff-v618" role="alert">在籍中のスタッフが登録されていません。</p>' : '') +
          '<label class="orimia-style-field-v602"><span>性別</span><select name="gender">' + genderOptions + '</select></label>' +
          '<fieldset class="orimia-style-photo-editor-v610"><legend>スタイリスト写真</legend>' +
            '<div class="orimia-style-photo-row-v610"><div class="orimia-style-photo-preview-v610" data-photo-preview-v618>' + preview + '</div>' +
              '<div><label class="orimia-style-photo-picker-v610">写真を選択<input type="file" name="stylistPhoto" accept="image/jpeg,image/png,image/webp"></label>' +
                '<small>JPG・PNG・WebP / 5MB以下</small>' +
                (style.stylist.photoOverride ? '<label class="orimia-style-photo-remove-v610"><input type="checkbox" name="removeStylistPhoto"> この投稿の写真を削除</label>' : '') +
              '</div></div></fieldset>' +
          '<label class="orimia-style-field-v602"><span>スタイリストコメント</span><textarea name="stylistComment" maxlength="4000" rows="5">' + esc(style.comment) + '</textarea></label>' +
          '<fieldset class="orimia-style-menu-options-v602"><legend>メニュー内容</legend><div>' + editorMenuRows(style, options) + '</div></fieldset>' +
          '<p class="orimia-style-dialog-feedback-v602" role="status" aria-live="polite"></p>' +
        '</div>' +
        '<footer><button type="button" data-cancel-v618>キャンセル</button><button type="submit" class="is-primary" ' + (noStaff ? 'disabled' : '') + '>保存</button></footer>' +
      '</form>'
    document.body.append(dialog)

    const form = dialog.querySelector('form')
    const fileInput = form.elements.stylistPhoto
    const removeInput = form.elements.removeStylistPhoto
    const previewNode = dialog.querySelector('[data-photo-preview-v618]')
    let objectUrl = ''
    const close = () => dialog.close()
    dialog.querySelector('[data-close-v618]').addEventListener('click', close)
    dialog.querySelector('[data-cancel-v618]').addEventListener('click', close)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
    dialog.addEventListener('close', () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      dialog.remove()
      editorOpening = false
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
    removeInput?.addEventListener('change', () => {
      if (!removeInput.checked) return
      fileInput.value = ''
      previewNode.innerHTML = '<span aria-hidden="true">削除します</span>'
    })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      const submit = form.querySelector('button[type="submit"]')
      const feedback = form.querySelector('[role="status"]')
      if (!form.reportValidity()) return
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
        await request('/api/lien-style-editor-v618?postId=' + encodeURIComponent(postId), {
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
    dialog.querySelector('input[name="styleName"]')?.focus()
  }

  function bindEditorButton() {
    const postId = editorPostId()
    if (!postId) return
    document.querySelectorAll('[data-orimia-style-edit-v602],[data-orimia-style-edit-v610]').forEach(button => {
      if (button.dataset.orimiaStyleEditV618 === 'true') return
      const replacement = button.cloneNode(true)
      replacement.removeAttribute('data-orimia-style-edit-v602')
      replacement.removeAttribute('data-orimia-style-edit-v610')
      replacement.dataset.orimiaStyleEditV618 = 'true'
      replacement.innerHTML = icons.edit + '<span>スタイル情報を編集</span>'
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

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-orimia-style-edit-v602],[data-orimia-style-edit-v610]')
    const postId = editorPostId()
    if (!button || !postId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    openEditor(postId)
  }, true)
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
