(() => {
  'use strict'
  if (window.__orimiaStyleAdminControlsV618) return
  window.__orimiaStyleAdminControlsV618 = true

  const LIST_PATH = '/admin/community'
  const SORT_OPTIONS = [
    ['manual', 'No順'],
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
  let listAbortController = null /* list-pagination-performance-v628 */
  let scanQueued = false
  let editorOpening = false
  let listSnapshot = null
  let listHydrationReady = false

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
    const requestedSort = params.get('sort') || 'manual'
    return {
      sort: SORT_OPTIONS.some(option => option[0] === requestedSort) ? requestedSort : 'manual',
      staffKey: params.get('staff') || '',
      course: params.get('course') || '',
      gender: params.get('gender') || '',
      page: Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1),
    }
  }

  function writeListFilters(filters, push) {
    const url = new URL(location.href)
    for (const name of ['sort', 'staff', 'stylist', 'course', 'gender', 'age', 'page']) url.searchParams.delete(name)
    if (filters.sort && filters.sort !== 'manual') url.searchParams.set('sort', filters.sort)
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

  function listContentIsCurrent() {
    return Boolean(listRoot && listRoot.isConnected &&
      listRoot.firstElementChild && listRoot.firstElementChild.hasAttribute('data-orimia-style-content-v619'))
  }

  function restoreListContent() {
    if (!listRoot || !listRoot.isConnected || listContentIsCurrent()) return
    listRoot.className = 'orimia-style-admin-v618'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    if (listSnapshot) {
      renderList(listSnapshot)
      return
    }
    listRoot.innerHTML = (
      '<div class="orimia-admin-style-loading-v618" data-orimia-style-content-v619 role="status">スタイルを読み込んでいます。</div>'
    )
    loadList()
  }

  function mountList() {
    if (normalizedPath() !== LIST_PATH) return
    const legacyFilter = suppressLegacyLists()
    if (!listRoot || !listRoot.isConnected) {
      const existingRoot = document.querySelector('.orimia-style-admin-v618')
      if (existingRoot) listRoot = existingRoot
    }
    if (listRoot && listRoot.isConnected) {
      restoreListContent()
      return
    }
    if (!legacyFilter) return
    listRoot = document.createElement('section')
    listRoot.className = 'orimia-style-admin-v618'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    listRoot.innerHTML = '<div data-orimia-style-content-v619 class="orimia-admin-style-loading-v618" role="status">スタイルを読み込んでいます。</div>'
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
    const lazy = index > 3 ? ' loading="lazy" fetchpriority="low"' : ' fetchpriority="high"'
    const facts = [post.stylistName, post.gender].filter(Boolean).map(esc).join(' ・ ')
    const engagement = 'いいね ' + Number(post.likeCount || 0) + ' ・ コメント ' + Number(post.commentCount || 0) + '件'
    return '<a class="orimia-admin-style-card-v618" data-orimia-style-post-id-v625="' + esc(post.id) +
      '" data-orimia-style-published-v625="' + (post.published ? 'true' : 'false') +
      '" data-orimia-style-display-order-v634="' + Number(post.displayOrder || 0) +
      '" href="/admin/community/' + encodeURIComponent(post.id) +
      '" aria-label="' + esc(post.title) + 'の詳細を開く">' +
      '<span class="orimia-admin-style-image-v618"><img src="' + esc(post.coverPhotoUrl) + '" alt=""' + lazy + ' decoding="async">' +
        '<span class="orimia-admin-style-order-badge-v634">No.' + Number(post.displayOrder || 0) + '</span></span>' +
      '<span class="orimia-admin-style-card-copy-v618"><strong>' + esc(post.title) + '</strong>' +
      '<small>' + facts + '</small><small class="orimia-admin-style-engagement-v634">' + engagement + '</small></span></a>'
  }

  function renderList(payload) {
    listSnapshot = payload
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
      '<div data-orimia-style-content-v619 class="orimia-admin-style-toolbar-v618">' +
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
      writeListFilters({ sort: 'manual', staffKey: '', course: '', gender: '', page: 1 })
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
        behavior: 'auto',
      })
    }))
  }

  async function loadList() {
    if (!listRoot || !listRoot.isConnected || normalizedPath() !== LIST_PATH) return
    const requestId = ++listRequest
    if (listAbortController) listAbortController.abort()
    const controller = new AbortController()
    listAbortController = controller
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v618')
    try {
      const params = new URLSearchParams()
      if (filters.sort !== 'manual') params.set('sort', filters.sort)
      if (filters.staffKey) params.set('staff', filters.staffKey)
      if (filters.course) params.set('course', filters.course)
      if (filters.gender) params.set('gender', filters.gender)
      if (filters.page > 1) params.set('page', String(filters.page))
      const payload = await request('/api/lien-style-admin-v618?' + params, { signal: controller.signal })
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
      if (error && error.name === 'AbortError') return
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
      listRoot.innerHTML = '<div data-orimia-style-content-v619 class="orimia-admin-style-error-v618" role="alert"><strong>スタイルを読み込めませんでした。</strong>' +
        '<span>' + esc(error instanceof Error ? error.message : '時間をおいて試してください。') + '</span>' +
        '<button type="button">再読み込み</button></div>'
      listRoot.querySelector('button')?.addEventListener('click', loadList)
    } finally {
      if (controller === listAbortController) listAbortController = null
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
    if (normalizedPath() === LIST_PATH && listHydrationReady) mountList()
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
  window.__orimiaReloadStyleAdminV625 = () => {
    if (normalizedPath() === LIST_PATH) loadList()
  }
  bindEditorButton()
  const activateList = () => {
    listHydrationReady = true
    scheduleScan()
  }
  const activateAfterHydrationV628 = () => requestAnimationFrame(() => requestAnimationFrame(activateList))
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateAfterHydrationV628, { once: true })
  } else {
    activateAfterHydrationV628()
  }
})()

/* style-admin-post-controls-v625 */
;(() => {
  'use strict'

  if (window.__orimiaStyleAdminPostControlsV625) return
  window.__orimiaStyleAdminPostControlsV625 = true

  const LIST_PATH = '/admin/community'
  const API = '/api/lien-content-management?audience=staff'
  const ORDER_API = '/api/lien-style-order-v634'
  let scanQueued = false
  let detailLoading = ''

  const icons = {
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"></path><path d="M6.7 6.7A10.8 10.8 0 0 0 2.1 12a10.8 10.8 0 0 0 15.2 5.3"></path><path d="M10.7 5.2A10.8 10.8 0 0 1 21.9 12a10.8 10.8 0 0 1-2.1 3.3"></path><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>',
  }

  function normalizedPath() {
    return location.pathname.replace(/\/+$/, '') || '/'
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...((options && options.body) ? { 'Content-Type': 'application/json' } : {}),
        ...((options && options.headers) || {}),
      },
      ...(options || {}),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '操作を完了できませんでした。')
    return payload
  }

  function showToast(message) {
    document.querySelector('[data-orimia-style-toast-v625]')?.remove()
    const toast = document.createElement('div')
    toast.className = 'orimia-style-toast-v625'
    toast.dataset.orimiaStyleToastV625 = 'true'
    toast.setAttribute('role', 'status')
    toast.textContent = message
    document.body.append(toast)
    requestAnimationFrame(() => toast.classList.add('is-visible-v625'))
    window.setTimeout(() => {
      toast.classList.remove('is-visible-v625')
      window.setTimeout(() => toast.remove(), 180)
    }, 2400)
  }

  function publishedFromCard(card) {
    return card.dataset.orimiaStylePublishedV625 === 'true'
  }

  function applyListCardState(wrapper, published) {
    const card = wrapper.querySelector(':scope > .orimia-admin-style-card-v618')
    const button = wrapper.querySelector('[data-orimia-style-visibility-v625]')
    const badge = wrapper.querySelector('[data-orimia-style-private-badge-v625]')
    if (!card || !button || !badge) return

    card.dataset.orimiaStylePublishedV625 = published ? 'true' : 'false'
    wrapper.dataset.orimiaStylePublishedV625 = published ? 'true' : 'false'
    wrapper.classList.toggle('is-private-v625', !published)
    badge.hidden = published
    button.classList.toggle('is-publish-v625', !published)
    button.innerHTML = (published ? icons.eyeOff : icons.eye) +
      '<span>' + (published ? '非公開にする' : '公開する') + '</span>'
    button.setAttribute('aria-label', published ? 'この投稿を非公開にする' : 'この投稿を公開する')
    card.setAttribute('aria-disabled', published ? 'false' : 'true')
    if (published) {
      card.removeAttribute('tabindex')
      card.setAttribute('aria-label', card.dataset.orimiaStyleOriginalLabelV625 || 'スタイル詳細を開く')
    } else {
      card.setAttribute('tabindex', '-1')
      if (!String(card.getAttribute('aria-label') || '').startsWith('非公開の投稿。')) {
        card.setAttribute('aria-label', '非公開の投稿。一覧から公開すると詳細を開けます')
      }
    }
  }

  function openDeleteDialog(postId, onDeleted) {
    if (document.querySelector('.orimia-style-delete-dialog-v625')) return
    const dialog = document.createElement('dialog')
    dialog.className = 'orimia-style-delete-dialog-v625'
    dialog.setAttribute('aria-labelledby', 'orimia-style-delete-title-v625')
    dialog.innerHTML = '<form method="dialog">' +
      '<header><h2 id="orimia-style-delete-title-v625">スタイル投稿を削除しますか？</h2>' +
        '<p>スタイル共有から非表示になります。来店履歴と施術写真の原本は残ります。</p></header>' +
      '<label class="orimia-style-delete-check-v625"><input type="checkbox" name="confirmed">' +
        '<span>この投稿を削除することを確認しました</span></label>' +
      '<p class="orimia-style-delete-feedback-v625" role="status" aria-live="polite"></p>' +
      '<footer><button type="button" data-cancel-v625>キャンセル</button>' +
        '<button type="submit" class="is-danger-v625" disabled>' + icons.trash + '<span>削除する</span></button></footer>' +
      '</form>'
    document.body.append(dialog)

    const form = dialog.querySelector('form')
    const checkbox = form.elements.confirmed
    const submit = form.querySelector('button[type="submit"]')
    const feedback = form.querySelector('[role="status"]')
    const close = () => dialog.close()
    checkbox.addEventListener('change', () => { submit.disabled = !checkbox.checked })
    dialog.querySelector('[data-cancel-v625]').addEventListener('click', close)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
    dialog.addEventListener('close', () => dialog.remove(), { once: true })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!checkbox.checked) return
      submit.disabled = true
      checkbox.disabled = true
      feedback.textContent = '削除しています。'
      try {
        await requestJson(API, {
          method: 'DELETE',
          body: JSON.stringify({ target: 'post', postId }),
        })
        dialog.close()
        onDeleted?.()
        showToast('スタイル投稿を削除しました。')
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : '削除できませんでした。'
        submit.disabled = false
        checkbox.disabled = false
      }
    })
    dialog.showModal()
    checkbox.focus()
  }

  function enhanceListCard(card) {
    if (card.closest('.orimia-admin-style-managed-card-v625')) return
    const postId = String(card.dataset.orimiaStylePostIdV625 || '').trim()
    if (!postId) return
    card.dataset.orimiaStyleOriginalLabelV625 = card.getAttribute('aria-label') || 'スタイル詳細を開く'

    const wrapper = document.createElement('article')
    wrapper.className = 'orimia-admin-style-managed-card-v625'
    wrapper.dataset.orimiaStylePostIdV625 = postId
    card.before(wrapper)
    wrapper.append(card)

    const image = card.querySelector('.orimia-admin-style-image-v618')
    const badge = document.createElement('span')
    badge.className = 'orimia-admin-style-private-badge-v625'
    badge.dataset.orimiaStylePrivateBadgeV625 = 'true'
    badge.innerHTML = icons.eyeOff + '<span>非公開</span>'
    image?.append(badge)

    const actions = document.createElement('div')
    actions.className = 'orimia-admin-style-actions-v625'
    const orderForm = document.createElement('form')
    orderForm.className = 'orimia-admin-style-order-form-v634'
    orderForm.setAttribute('aria-label', '表示順を変更')
    const orderLabel = document.createElement('label')
    orderLabel.innerHTML = '<span>No.</span>'
    const orderInput = document.createElement('input')
    orderInput.type = 'number'
    orderInput.name = 'displayOrder'
    orderInput.min = '1'
    orderInput.step = '1'
    orderInput.required = true
    orderInput.inputMode = 'numeric'
    orderInput.value = String(Number(card.dataset.orimiaStyleDisplayOrderV634 || 1))
    orderInput.setAttribute('aria-label', '表示するNo')
    orderLabel.append(orderInput)
    const orderSubmit = document.createElement('button')
    orderSubmit.type = 'submit'
    orderSubmit.textContent = '移動'
    orderForm.append(orderLabel, orderSubmit)
    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.dataset.orimiaStyleVisibilityV625 = 'true'
    visibility.className = 'orimia-admin-style-visibility-v625'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.dataset.orimiaStyleDeleteV625 = 'true'
    remove.className = 'orimia-admin-style-delete-v625'
    remove.setAttribute('aria-label', 'スタイル投稿を削除')
    remove.title = '削除'
    remove.innerHTML = icons.trash
    actions.append(orderForm, visibility, remove)
    wrapper.append(actions)

    orderForm.addEventListener('submit', async event => {
      event.preventDefault()
      const requestedOrder = Number(orderInput.value)
      if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
        orderInput.setCustomValidity('1以上の整数を入力してください。')
        orderInput.reportValidity()
        return
      }
      orderInput.setCustomValidity('')
      orderInput.disabled = true
      orderSubmit.disabled = true
      try {
        const moved = await requestJson(ORDER_API, {
          method: 'PATCH',
          body: JSON.stringify({ postId, displayOrder: requestedOrder }),
        })
        orderInput.value = String(moved.displayOrder)
        card.dataset.orimiaStyleDisplayOrderV634 = String(moved.displayOrder)
        const badge = card.querySelector('.orimia-admin-style-order-badge-v634')
        if (badge) badge.textContent = 'No.' + moved.displayOrder
        const url = new URL(location.href)
        url.searchParams.delete('sort')
        url.searchParams.delete('page')
        history.replaceState({}, '', url)
        showToast('No.' + moved.displayOrder + 'へ移動しました。')
        if (typeof window.__orimiaReloadStyleAdminV625 === 'function') window.__orimiaReloadStyleAdminV625()
      } catch (error) {
        showToast(error instanceof Error ? error.message : '表示順を変更できませんでした。')
      } finally {
        orderInput.disabled = false
        orderSubmit.disabled = false
      }
    })

    card.addEventListener('click', event => {
      if (publishedFromCard(card)) return
      event.preventDefault()
      event.stopPropagation()
      showToast('非公開中の投稿です。公開すると詳細を開けます。')
    })
    visibility.addEventListener('click', async () => {
      const nextPublished = !publishedFromCard(card)
      visibility.disabled = true
      remove.disabled = true
      try {
        await requestJson(API, {
          method: 'PATCH',
          body: JSON.stringify({ target: 'post', action: 'visibility', postId, published: nextPublished }),
        })
        applyListCardState(wrapper, nextPublished)
        showToast(nextPublished ? 'スタイル投稿を公開しました。' : 'スタイル投稿を非公開にしました。')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
      } finally {
        visibility.disabled = false
        remove.disabled = false
      }
    })
    remove.addEventListener('click', () => openDeleteDialog(postId, () => {
      wrapper.remove()
      if (typeof window.__orimiaReloadStyleAdminV625 === 'function') window.__orimiaReloadStyleAdminV625()
    }))

    applyListCardState(wrapper, publishedFromCard(card))
  }

  function enhanceList() {
    if (normalizedPath() !== LIST_PATH) return
    const root = document.querySelector('.orimia-style-admin-v618')
    if (!root) return
    root.querySelectorAll('.orimia-admin-style-card-v618[data-orimia-style-post-id-v625]').forEach(enhanceListCard)
  }

  function buildDetailPanel(postId, post) {
    const panel = document.createElement('section')
    panel.className = 'orimia-style-detail-controls-v625'
    panel.dataset.orimiaStyleDetailControlsV625 = postId
    panel.setAttribute('aria-label', '投稿の公開管理')

    const state = document.createElement('span')
    state.className = 'orimia-style-detail-status-v625'
    const actions = document.createElement('div')
    actions.className = 'orimia-style-detail-actions-v625'
    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.className = 'orimia-style-detail-visibility-v625'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'orimia-style-detail-delete-v625'
    remove.innerHTML = icons.trash + '<span>投稿を削除</span>'
    actions.append(visibility, remove)
    panel.append(state, actions)

    const renderState = () => {
      state.classList.toggle('is-private-v625', !post.published)
      state.textContent = post.published ? '公開中' : '非公開'
      visibility.classList.toggle('is-publish-v625', !post.published)
      visibility.innerHTML = (post.published ? icons.eyeOff : icons.eye) +
        '<span>' + (post.published ? '非公開にする' : '公開する') + '</span>'
    }
    visibility.addEventListener('click', async () => {
      const nextPublished = !post.published
      visibility.disabled = true
      remove.disabled = true
      try {
        await requestJson(API, {
          method: 'PATCH',
          body: JSON.stringify({ target: 'post', action: 'visibility', postId, published: nextPublished }),
        })
        post.published = nextPublished
        renderState()
        showToast(nextPublished ? 'スタイル投稿を公開しました。' : 'スタイル投稿を非公開にしました。')
        if (!nextPublished) window.setTimeout(() => location.assign(LIST_PATH), 220)
        else {
          visibility.disabled = false
          remove.disabled = false
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
        visibility.disabled = false
        remove.disabled = false
      }
    })
    remove.addEventListener('click', () => openDeleteDialog(postId, () => {
      window.setTimeout(() => location.assign(LIST_PATH), 220)
    }))
    renderState()
    return panel
  }

  async function enhanceDetail() {
    const match = normalizedPath().match(/^\/admin\/community\/([^/]+)$/)
    if (!match) return
    let postId = ''
    try { postId = decodeURIComponent(match[1]) } catch { return }
    if (!postId || detailLoading === postId) return
    const details = document.querySelector('.orimia-style-detail-staff-v602 .orimia-style-details-v602, main .orimia-style-details-v602')
    if (!details || document.querySelector('[data-orimia-style-detail-controls-v625="' + CSS.escape(postId) + '"]')) return

    detailLoading = postId
    try {
      const payload = await requestJson(API + '&postId=' + encodeURIComponent(postId))
      if (normalizedPath() !== '/admin/community/' + encodeURIComponent(postId)) return
      const currentDetails = document.querySelector('.orimia-style-detail-staff-v602 .orimia-style-details-v602, main .orimia-style-details-v602')
      if (!currentDetails || document.querySelector('[data-orimia-style-detail-controls-v625]')) return
      currentDetails.insertAdjacentElement('afterend', buildDetailPanel(postId, payload.post))
    } catch {
      // The surrounding page owns its not-found and authentication states.
    } finally {
      if (detailLoading === postId) detailLoading = ''
    }
  }

  function scan() {
    scanQueued = false
    enhanceList()
    document.querySelectorAll('.orimia-style-detail-controls-v625').forEach(panel => panel.remove())
  }

  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true })
  addEventListener('popstate', scheduleScan)
  addEventListener('pageshow', scheduleScan)
  scheduleScan()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
})()

/* style-detail-management-removal-v626 */
;(() => {
  'use strict'

  if (window.__orimiaStyleDetailManagementRemovalV626) return
  window.__orimiaStyleDetailManagementRemovalV626 = true

  let scanQueued = false

  function isStaffStyleDetail() {
    return /^\/admin\/community\/[^/]+\/?$/.test(location.pathname) &&
      Boolean(document.querySelector('.orimia-style-detail-staff-v602, .orimia-style-details-v602'))
  }

  function removeLegacyManagement() {
    scanQueued = false
    if (!isStaffStyleDetail()) return
    document.querySelectorAll('[aria-label="投稿管理"]').forEach(panel => panel.remove())
  }

  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(removeLegacyManagement)
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  addEventListener('pageshow', scheduleScan)
  addEventListener('popstate', scheduleScan)
  scheduleScan()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
  }
})()
