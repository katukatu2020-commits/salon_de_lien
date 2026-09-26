  function contractPanel() {
    const active = salon.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
    const pending = salon.data.contracts.filter(function (contract) { return contract.status === 'PENDING' })
    const code = salon.data.organization.publicCode
    return '<section class="wo-contract-band ' + (active.length ? 'connected' : '') + '"><div class="wo-contract-copy">' + icon('link') + '<div><p class="wo-section-label">DEALER CONNECTION</p><h2>連携中のディーラー</h2>' +
      (code ? '<p class="wo-salon-code-v686">店舗コード <strong>' + esc(code) + '</strong><button type="button" data-action="copy-salon-code" aria-label="店舗コードをコピー" title="店舗コードをコピー">' + icon('copy') + '</button></p>' : '') + '</div></div>' +
      (active.length ? '<div class="wo-contract-list">' + active.map(function (contract) { return '<span><strong>' + esc(contract.dealerName) + '</strong><small>ディーラー固有コード ' + esc(contract.dealerCode) + '</small><a href="/admin/dealer-messages?dealer=' + encodeURIComponent(contract.dealerId) + '">チャットを開く</a></span>' }).join('') + '</div>' : '<p>連携先はまだありません。</p>') +
      (pending.length ? '<div class="wo-pending-note">' + icon('alert') + '<span>' + pending.map(function (contract) { return esc(contract.dealerName) }).join('、') + ' の承認待ちです。</span></div>' : '') + '</section>'
  }
