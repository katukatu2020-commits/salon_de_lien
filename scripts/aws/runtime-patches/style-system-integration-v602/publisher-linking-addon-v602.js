  function configureStyleLinksV602(modal) {
    const fields = modal.querySelector('.hp-manual .hp-fields')
    if (!fields || modal.querySelector('[data-style-links-v602]')) return
    const root = document.createElement('section')
    root.className = 'orimia-publish-links-v602'
    root.dataset.styleLinksV602 = '1'
    root.innerHTML = `<div><strong>ORIMIAの登録情報と紐付け</strong><p>担当者とメニューの最新情報を、お客様のスタイル詳細に表示します。</p></div><p class="orimia-publish-links-feedback-v602" role="status"> 読み込み中です。</p>`
    const titleField = modal.querySelector('[data-hp-field="title"]')?.closest('.ca-cp-field')
    if (titleField) {
      titleField.classList.add('hp-wide')
      titleField.insertAdjacentElement('afterend', root)
    }
    else fields.prepend(root)
    const style = document.createElement('style')
    style.textContent = `.orimia-publish-links-v602{display:grid;grid-column:1/-1;gap:13px;padding:16px;border:1px solid #e4d8d2;border-radius:7px;background:#fcf8f4}.orimia-publish-links-v602>div>strong{display:block;color:#403734;font-size:13px}.orimia-publish-links-v602>div>p,.orimia-publish-links-feedback-v602{margin:4px 0 0;color:#80726b;font-size:10px;line-height:1.6}.orimia-publish-link-field-v602{display:grid;gap:6px;margin:0;padding:0;border:0;color:#443b37;font-size:11px;font-weight:800}.orimia-publish-link-field-v602 select{width:100%;min-height:42px;border:1px solid #ddcfc8;border-radius:6px;background:#fff;padding:0 10px;color:#342e2b;font:inherit}.orimia-publish-menu-list-v602{display:grid;max-height:210px;overflow:auto;border-top:1px solid #e6dad4}.orimia-publish-menu-list-v602 label{display:flex;min-height:48px;align-items:center;gap:10px;border-bottom:1px solid #e6dad4;padding:7px 2px;color:#403734;font-size:11px}.orimia-publish-menu-list-v602 input{width:17px;height:17px;flex:none;accent-color:#b84865}.orimia-publish-menu-list-v602 span{display:grid;gap:1px}.orimia-publish-menu-list-v602 small{color:#887a72;font-size:9px;font-weight:500}`
    modal.append(style)
    modal.__styleLinks = () => {
      if (root.dataset.loaded !== '1') return undefined
      return {
        staffKey: root.querySelector('[data-style-staff-v602]')?.value || '',
        menuIds: [...root.querySelectorAll('[data-style-menu-v602]:checked')].map(input => input.value),
      }
    }
    fetch('/api/lien-style-system?audience=staff&scope=options', { credentials:'same-origin', cache:'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '読み込めませんでした。')
        const options = payload.options || { staff:[], menus:[] }
        root.innerHTML = `<div><strong>ORIMIAの登録情報と紐付け</strong><p>担当者とメニューの最新情報を、お客様のスタイル詳細に表示します。</p></div><label class="orimia-publish-link-field-v602"><span>担当スタイリスト</span><select data-style-staff-v602><option value="">取込元・入力内容を使用</option>${options.staff.map(staff => `<option value="${esc(staff.key)}">${esc(staff.name)}${staff.role ? ` ・ ${esc(staff.role)}` : ''}</option>`).join('')}</select></label><fieldset class="orimia-publish-link-field-v602"><legend>メニュー</legend><div class="orimia-publish-menu-list-v602">${options.menus.length ? options.menus.map(menu => `<label><input type="checkbox" value="${esc(menu.id)}" data-style-menu-v602><span>${esc(menu.name)}<small>${esc([menu.category, menu.durationMinutes ? `${menu.durationMinutes}分` : '', Number.isFinite(menu.priceYen) ? `${new Intl.NumberFormat('ja-JP').format(menu.priceYen)}円` : ''].filter(Boolean).join(' ・ '))}</small></span></label>`).join('') : '<p>登録済みメニューはありません。</p>'}</div></fieldset>`
        root.dataset.loaded = '1'
        for (const key of ['stylistName', 'stylistKana', 'stylistRole', 'menuDescription']) {
          const legacyField = modal.querySelector(`[data-hp-field="${key}"]`)?.closest('.ca-cp-field')
          if (legacyField) legacyField.hidden = true
        }
        const staffSelect = root.querySelector('[data-style-staff-v602]')
        staffSelect.addEventListener('change', () => {
          const staff = options.staff.find(item => item.key === staffSelect.value)
          const name = modal.querySelector('[data-hp-field="stylistName"]')
          const kana = modal.querySelector('[data-hp-field="stylistKana"]')
          const role = modal.querySelector('[data-hp-field="stylistRole"]')
          if (name) name.value = staff?.name || ''
          if (kana) kana.value = ''
          if (role) role.value = staff?.role || ''
        })
        root.querySelectorAll('[data-style-menu-v602]').forEach(input => input.addEventListener('change', () => {
          const selected = [...root.querySelectorAll('[data-style-menu-v602]:checked')].map(node => options.menus.find(menu => menu.id === node.value)?.name).filter(Boolean)
          const description = modal.querySelector('[data-hp-field="menuDescription"]')
          if (description) description.value = selected.join(' + ')
        }))
      })
      .catch(error => {
        root.querySelector('[role="status"]').textContent = error instanceof Error ? error.message : '登録情報を読み込めませんでした。'
      })
  }
