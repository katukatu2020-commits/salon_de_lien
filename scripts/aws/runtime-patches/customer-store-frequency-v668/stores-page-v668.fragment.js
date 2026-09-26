  async function storesPage(req, res, url) {
    const session = await currentCustomer(req)
    const rows = await availableStores(session)
    const cards = rows.map(store => {
      const visitCount = Number(store.visitCount || 0)
      const status = store.available === false ? '登録済み（店舗に確認してください）' : store.current ? '現在利用中の店舗' : '登録済み'
      const primaryAction = store.available === false
        ? '<span class="registered-store-current registered-store-unavailable">現在利用できません</span>'
        : store.current
          ? '<span class="registered-store-current">利用中</span>'
          : `<button class="registered-store-switch" type="button" data-switch-store="${escapeHtml(store.organizationId)}">切り替える</button>`
      return `<article class="registered-store-card ${store.current ? 'current' : ''}">
        <span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async"></span>
        <div class="registered-store-copy"><strong>${escapeHtml(store.name)}</strong><p>${status}</p><span class="registered-store-frequency">来店 ${visitCount.toLocaleString('ja-JP')}回</span></div>
        <div class="registered-store-card-actions">${primaryAction}<button class="registered-store-remove" type="button" data-remove-store="${escapeHtml(store.organizationId)}" data-store-name="${escapeHtml(store.name)}" data-last-store="${rows.length === 1 ? 'true' : 'false'}">登録を解除</button></div>
      </article>`
    }).join('')
    const initialCode = storeCodeFromQuery(url.searchParams.get('store'))
    const removalNotice = url.searchParams.get('removed') === '1'
      ? '<p class="registered-store-notice" role="status">店舗の登録を解除しました。続けて利用する場合は、新しい店舗を登録してください。</p>'
      : url.searchParams.get('storeRequired') === '1'
        ? '<p class="registered-store-notice" role="status">利用する店舗を登録してください。</p>'
        : ''
    const body = `<section class="page-title registered-store-title"><div><h1>登録済みの店舗</h1><p>利用する美容室の切り替えや、新しい店舗の追加ができます。</p></div><span class="registered-store-count" aria-label="登録店舗数">${rows.length}店舗</span></section>${removalNotice}
      <section class="registered-store-section" data-store-count="${rows.length}">
        <div class="registered-store-list">${cards || '<p class="registered-store-empty">登録済みの店舗はありません。</p>'}</div>
        <form id="register-store-form" class="registered-store-form" data-store-count="${rows.length}">
          <div class="registered-store-form-heading"><div><label for="store-code">新しい店舗を登録</label><p>店舗のQRコードを読み取るか、店舗識別コードを入力してください。</p></div><span>${rows.length}店舗登録中</span></div>
          <div class="registered-store-actions"><button class="scan-store-qr" id="scan-store-qr" type="button">カメラでQRを読み取る</button><div class="registered-store-code-row"><input id="store-code" name="storeCode" autocomplete="off" maxlength="32" value="${escapeHtml(initialCode)}" placeholder="例：LIEN-SALON"><button type="submit">店舗を確認</button></div></div>
          <output id="store-result" aria-live="polite"></output><div id="store-preview"></div>
        </form>
      </section>
      <style>
        .registered-store-title{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-title p{margin:8px 0 0;color:var(--muted);font-size:12px}.registered-store-count{display:grid;min-width:72px;min-height:42px;place-items:center;border:1px solid var(--line);border-radius:999px;background:#fff;color:#765e55;font-size:13px;font-weight:800}.registered-store-section{max-width:840px;margin:auto;padding:18px}.registered-store-list{display:grid;gap:12px}.registered-store-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:16px}.registered-store-card.current{border-color:#dca8b5;background:#fff8fa}.registered-store-mark{display:grid;width:52px;height:52px;place-items:center;overflow:hidden;border-radius:8px;background:#f6e7e1}.registered-store-mark img{display:block;width:52px;height:52px;object-fit:cover}.registered-store-copy{min-width:0}.registered-store-card strong{display:block;overflow-wrap:anywhere;font-size:14px}.registered-store-card p{margin:4px 0 0;color:var(--muted);font-size:11px}.registered-store-frequency{display:inline-block;margin-top:5px;color:#a43f5f;font-size:11px;font-weight:800}.registered-store-card-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.registered-store-card button,.registered-store-form button{min-height:42px;border:0;border-radius:999px;padding:0 16px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.registered-store-switch,.registered-store-form button[type=submit]{background:var(--rose);color:#fff}.registered-store-current{display:inline-grid;min-height:34px;place-items:center;border-radius:999px;background:#edf7ef;padding:0 11px;color:#356143;font-size:11px;font-weight:700}.registered-store-unavailable{background:#f3f4f5;color:#5c6266}.registered-store-remove{border:1px solid #dfc8c2!important;background:#fff!important;color:#a24039!important}.registered-store-card button:disabled{cursor:not-allowed;opacity:.52}.registered-store-form{margin-top:18px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:18px}.registered-store-form-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.registered-store-form-heading label{font-weight:800}.registered-store-form-heading p{margin:6px 0 0;color:var(--muted);font-size:11px;line-height:1.7}.registered-store-form-heading>span{flex:0 0 auto;color:#8f4f42;font-size:11px;font-weight:800}.registered-store-actions{display:grid;gap:10px;margin-top:14px}.registered-store-code-row{display:flex;gap:8px}.registered-store-form input{min-width:0;min-height:48px;flex:1;border:1px solid #d8cbbf;border-radius:8px;background:#fff;padding:0 14px;text-transform:uppercase}.registered-store-form output{display:block;min-height:20px;margin-top:10px;color:#a02f28;font-size:11px;line-height:1.6}.scan-store-qr{width:100%;border:1px solid #d9c5bc!important;background:#fff8f5!important;color:#74433a!important}.registered-store-empty{border:1px dashed var(--line);border-radius:8px;padding:26px;color:var(--muted);text-align:center}.registered-store-notice{max-width:804px;margin:0 auto 14px;border:1px solid #c7dccd;border-radius:8px;background:#f3f9f4;padding:12px 14px;color:#315f40;font-size:11px;font-weight:700;line-height:1.7}
        @media(max-width:640px){.registered-store-title{align-items:flex-start}.registered-store-count{min-width:64px}.registered-store-card{grid-template-columns:48px minmax(0,1fr);padding:14px}.registered-store-mark,.registered-store-mark img{width:46px;height:46px}.registered-store-card-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.registered-store-card-actions>*{width:100%;text-align:center}.registered-store-code-row{display:grid}.registered-store-form-heading{align-items:flex-start}.registered-store-section{padding:14px}}
      </style>`
    return html(res, renderCustomerShell({ title: '登録済みの店舗', active: '', back: '/u/home', body }))
  }
