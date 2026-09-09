  function appendStyleMetadataV596(panel, post, meta) {
    if (!post.metadata || !Object.values(post.metadata).some(Boolean)) return
    const fields = { title:['スタイル名',160], stylistName:['担当スタイリスト',100], stylistKana:['ふりがな',100], stylistRole:['役職',160], stylistComment:['スタイリストコメント',4000], menuDescription:['メニュー内容',2000] }
    const section = document.createElement('section')
    section.className = 'lien-style-metadata-v596'
    const render = () => {
      const attribution = meta?.querySelector('.lucide-user-round')?.parentElement
      if (attribution) {
        const previousName = attribution.textContent.trim().replace(/^(担当|投稿者)\s*/, '')
        for (const node of [...attribution.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove()
        attribution.append(document.createTextNode(post.metadata.stylistName ? '担当 ' + post.metadata.stylistName : '投稿者 ' + previousName))
      }
      section.replaceChildren()
      section.style.cssText = 'display:grid;gap:12px;border-top:1px solid #e4dbd6;padding-top:14px;min-width:0;'
      for (const [key, [label]] of Object.entries(fields)) {
        if (key === 'stylistName') {
          const stylist = document.createElement('div'); stylist.style.cssText = 'display:flex;gap:12px;align-items:center;min-width:0'
          if (post.metadata.stylistPhotoUrl && /^(https?:\/\/|\/(?!\/))/.test(post.metadata.stylistPhotoUrl)) {
            const portrait = document.createElement('img'); portrait.src = post.metadata.stylistPhotoUrl; portrait.alt = post.metadata.stylistName || '担当スタイリスト'; portrait.style.cssText = 'width:64px;height:80px;flex:none;object-fit:cover;border-radius:4px'; stylist.append(portrait)
          }
          const info = document.createElement('div'); info.style.cssText = 'min-width:0;overflow-wrap:anywhere'
          for (const field of ['stylistRole','stylistName','stylistKana']) {
            if (!post.metadata[field]) continue
            const text = document.createElement('p'); text.textContent = post.metadata[field]; text.style.cssText = `margin:3px 0;font-size:${field === 'stylistName' ? 15 : 11}px;color:${field === 'stylistName' ? '#352e2b' : '#817168'};line-height:1.5`; info.append(text)
          }
          stylist.append(info); section.append(stylist)
          continue
        }
        if (['stylistKana','stylistRole'].includes(key)) continue
        if (!post.metadata[key]) continue
        const line = document.createElement('div')
        const heading = document.createElement('strong'); heading.textContent = label; heading.style.cssText = 'display:block;font-size:11px;color:#85736a;margin-bottom:4px'
        const text = document.createElement(key === 'title' ? 'h3' : 'p'); text.textContent = post.metadata[key]; text.style.cssText = `margin:0;font-size:${key === 'title' ? 18 : 13}px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;color:#352e2b`
        if (key !== 'title') line.append(heading)
        line.append(text); section.append(line)
      }
      if (post.metadata.sourceUrl && /^https:\/\/beauty\.hotpepper\.jp\/slnH\d{9}\/style\/L\d+\.html$/.test(post.metadata.sourceUrl)) {
        const salon = document.createElement('p'); salon.textContent = [post.metadata.salonName, post.metadata.salonArea].filter(Boolean).join(' / '); salon.style.cssText = 'margin:0;font-size:12px;color:#76675f'; section.append(salon)
        const link = document.createElement('a'); link.href = post.metadata.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'ホットペッパー掲載元'; link.style.cssText = 'font-size:12px;color:#9b4058'; section.append(link)
      }
      if (post.canEdit && audience === 'staff') {
        const edit = actionButton('スタイル情報を編集', pencilIcon)
        edit.addEventListener('click', () => {
          const dialog = document.createElement('dialog')
          dialog.setAttribute('aria-label', 'スタイル情報を編集')
          dialog.style.cssText = 'width:min(580px,calc(100vw - 32px));max-height:85dvh;overflow:auto;border:1px solid #d9cbc4;border-radius:8px;padding:22px;background:#fff;color:#352e2b'
          const form = document.createElement('form'); form.style.cssText = 'display:grid;gap:14px'
          const heading = document.createElement('h2'); heading.textContent = 'スタイル情報を編集'; heading.style.cssText = 'font-size:20px;margin:0 0 8px'; form.append(heading)
          for (const [key, [label, max]] of Object.entries(fields)) {
            const wrapper = document.createElement('label'); wrapper.textContent = label; wrapper.style.cssText = 'font-size:12px;font-weight:700'
            const input = document.createElement(max > 1000 ? 'textarea' : 'input'); input.name = key; input.value = post.metadata[key] || ''; input.maxLength = max; input.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;font:inherit;border:1px solid #d9cbc4;border-radius:6px'; if (max > 1000) input.rows = 4
            wrapper.append(input); form.append(wrapper)
          }
          const feedback = document.createElement('p'); feedback.setAttribute('role','status'); feedback.style.cssText = 'font-size:12px;color:#a03954;margin:0'
          const actions = document.createElement('div'); actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px'
          const cancel = actionButton('キャンセル', ''); const save = actionButton('保存', pencilIcon); save.type = 'submit'
          cancel.addEventListener('click', () => dialog.close())
          actions.append(cancel,save); form.append(feedback,actions); dialog.append(form); document.body.append(dialog)
          dialog.addEventListener('close', () => dialog.remove())
          form.addEventListener('submit', async event => {
            event.preventDefault(); save.disabled = true
            try {
              const metadata = Object.fromEntries(new FormData(form))
              const result = await requestJson(`/api/lien-content-management?audience=${audience}`, { method:'PATCH', body:JSON.stringify({ target:'post', action:'metadata', postId:post.id, metadata }) })
              post.metadata = { ...post.metadata, ...result.metadata }; render(); dialog.close()
            } catch (error) { feedback.textContent = error.message; save.disabled = false }
          })
          dialog.showModal()
        })
        section.append(edit)
      }
    }
    render(); panel.append(section)
  }
