'use strict'

;(() => {
  const CARD_ID = 'lien-line-settings-v436'
  const STYLE_ID = 'lien-line-settings-style-v436'

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .line-v436{margin:24px 0;border:1px solid #e8ded2;border-radius:20px;background:#fff;padding:22px;box-shadow:0 13px 34px rgba(66,43,35,.07);color:#2f2a25}
      .line-v436 *{box-sizing:border-box}.line-v436-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.line-v436-title{display:flex;align-items:flex-start;gap:14px}.line-v436-mark{display:grid;width:46px;height:46px;flex:none;place-items:center;border-radius:14px;background:#06c755;color:#fff;font-size:14px;font-weight:900}.line-v436 h2{margin:0;font-size:20px;line-height:1.4}.line-v436 p{margin:6px 0 0;color:#756a62;font-size:13px;line-height:1.75}.line-v436-status{display:inline-flex;min-height:34px;align-items:center;border:1px solid #d9cec4;border-radius:999px;background:#faf7f3;padding:0 13px;color:#74675f;font-size:11px;font-weight:800;white-space:nowrap}.line-v436-status.on{border-color:#bfdcc7;background:#edf8f0;color:#2f7045}.line-v436-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:20px}.line-v436-field{display:grid;gap:7px}.line-v436-field.wide{grid-column:1/-1}.line-v436-field label{font-size:12px;font-weight:800}.line-v436-field input{width:100%;height:48px;border:1px solid #dfd3c9;border-radius:12px;background:#fff;padding:0 13px;color:#2f2a25;font:inherit;outline:none}.line-v436-field input:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.42)}.line-v436-field small{color:#8a7f76;font-size:11px;line-height:1.55}.line-v436-links{display:grid;gap:10px;margin-top:18px;border-radius:15px;background:#f8f3ed;padding:14px}.line-v436-link{display:grid;grid-template-columns:150px minmax(0,1fr) auto;align-items:center;gap:10px}.line-v436-link strong{font-size:11px}.line-v436-link code{overflow:hidden;color:#574b44;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.line-v436-copy,.line-v436-secondary,.line-v436-primary{min-height:42px;border-radius:999px;padding:0 16px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.line-v436-copy,.line-v436-secondary{border:1px solid #ded1c7;background:#fff;color:#4d413a}.line-v436-primary{border:0;background:#8f4f42;color:#fff;box-shadow:0 9px 23px rgba(143,79,66,.22)}.line-v436-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:18px}.line-v436-feedback{min-height:20px;margin-right:auto!important;font-size:12px!important}.line-v436-feedback.ok{color:#2f7045}.line-v436-feedback.error{color:#9a302a}.line-v436-guide{margin-top:20px;border-top:1px solid #eee4db;padding-top:18px}.line-v436-guide h3{margin:0;font-size:14px}.line-v436-guide ol{margin:10px 0 0;padding-left:21px;color:#6f635b;font-size:12px;line-height:1.8}.line-v436-guide a{color:#8f4f42;font-weight:800}.line-v436 button:disabled{cursor:wait;opacity:.55}
      @media(max-width:760px){.line-v436{padding:18px}.line-v436-head{display:block}.line-v436-status{margin-top:12px}.line-v436-grid{grid-template-columns:1fr}.line-v436-field.wide{grid-column:auto}.line-v436-link{grid-template-columns:1fr auto}.line-v436-link strong{grid-column:1/-1}.line-v436-link code{min-width:0}.line-v436-actions{align-items:stretch;flex-direction:column}.line-v436-feedback{order:3}.line-v436-primary,.line-v436-secondary{width:100%}}
    `
    document.head.appendChild(style)
  }

  function copy(value, feedback) {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      feedback.textContent = 'コピーしました。'
      feedback.className = 'line-v436-feedback ok'
    }).catch(() => {
      feedback.textContent = 'コピーできませんでした。URLを選択してコピーしてください。'
      feedback.className = 'line-v436-feedback error'
    })
  }

  function lineCard() {
    const section = document.createElement('section')
    section.id = CARD_ID
    section.className = 'line-v436'
    section.innerHTML = `
      <div class="line-v436-head"><div class="line-v436-title"><span class="line-v436-mark">LINE</span><div><h2>LINE公式アカウント予約</h2><p>店舗ごとのMessaging APIとLIFFを接続し、LINEから入った予約をこの店舗の予約台帳へ直接登録します。</p></div></div><span class="line-v436-status" data-line-status>未設定</span></div>
      <div class="line-v436-grid">
        <div class="line-v436-field"><label>Messaging API チャネルID</label><input name="messagingChannelId" inputmode="numeric" autocomplete="off" placeholder="例: 2001234567"></div>
        <div class="line-v436-field"><label>LINE Login チャネルID</label><input name="lineLoginChannelId" inputmode="numeric" autocomplete="off" placeholder="例: 2007654321"><small>Messaging APIと同じProvider内に作成してください。</small></div>
        <div class="line-v436-field wide"><label>LIFF ID</label><input name="liffId" autocomplete="off" placeholder="例: 2007654321-AbCdEfGh"></div>
        <div class="line-v436-field"><label>Messaging API チャネルシークレット</label><input name="channelSecret" type="password" autocomplete="new-password" placeholder="保存済みの場合は空欄で変更しません"><small data-line-secret-state></small></div>
        <div class="line-v436-field"><label>Messaging API チャネルアクセストークン</label><input name="accessToken" type="password" autocomplete="new-password" placeholder="保存済みの場合は空欄で変更しません"><small data-line-token-state></small></div>
      </div>
      <div class="line-v436-links" data-line-links hidden>
        <div class="line-v436-link"><strong>Webhook URL</strong><code data-line-webhook></code><button class="line-v436-copy" type="button" data-copy="webhook">コピー</button></div>
        <div class="line-v436-link"><strong>LIFF Endpoint URL</strong><code data-line-endpoint></code><button class="line-v436-copy" type="button" data-copy="endpoint">コピー</button></div>
        <div class="line-v436-link"><strong>予約用LIFF URL</strong><code data-line-liff></code><button class="line-v436-copy" type="button" data-copy="liff">コピー</button></div>
      </div>
      <div class="line-v436-actions"><p class="line-v436-feedback" role="status"></p><button class="line-v436-secondary" type="button" data-line-reload>接続を再確認</button><button class="line-v436-primary" type="button" data-line-save>接続情報を保存</button></div>
      <div class="line-v436-guide"><h3>LINE側で一度だけ行う設定</h3><ol><li>Messaging APIチャネルとLINE Loginチャネルを同じProvider内に用意します。</li><li>LINE LoginチャネルにLIFFアプリを追加し、上記のEndpoint URLを登録します。</li><li>Messaging APIのWebhook URLへ上記URLを登録し、「検証」後にWebhookを有効化します。</li><li>LINE公式アカウントのリッチメニュー「予約する」に、上記の予約用LIFF URLを設定します。</li></ol><p>チャネルシークレットとアクセストークンは暗号化して保存し、画面やAPIから再表示しません。</p></div>
    `
    return section
  }

  async function enhance() {
    if (location.pathname !== '/admin/settings' || document.getElementById(CARD_ID)) return
    const main = document.querySelector('main')
    if (!main) return
    injectStyle()
    const card = lineCard()
    const target = main.querySelector('[data-settings-stack], .settings-stack, section:last-of-type')
    if (target?.parentElement === main) main.insertBefore(card, target.nextSibling)
    else main.appendChild(card)
    const feedback = card.querySelector('.line-v436-feedback')
    const status = card.querySelector('[data-line-status]')
    let current = null

    function apply(data) {
      current = data
      card.querySelector('[name="messagingChannelId"]').value = data.messagingChannelId || ''
      card.querySelector('[name="lineLoginChannelId"]').value = data.lineLoginChannelId || ''
      card.querySelector('[name="liffId"]').value = data.liffId || ''
      card.querySelector('[data-line-secret-state]').textContent = data.hasChannelSecret ? '保存済み' : '未保存'
      card.querySelector('[data-line-token-state]').textContent = data.hasAccessToken ? '保存済み' : '未保存'
      status.textContent = data.connected ? `${data.bot?.displayName || 'LINE公式アカウント'} 接続済み` : '未設定'
      status.classList.toggle('on', Boolean(data.connected))
      const links = card.querySelector('[data-line-links]')
      links.hidden = !data.webhookUrl
      card.querySelector('[data-line-webhook]').textContent = data.webhookUrl || ''
      card.querySelector('[data-line-endpoint]').textContent = data.liffEndpointUrl || ''
      card.querySelector('[data-line-liff]').textContent = data.liffUrl || ''
    }

    async function load(showResult = false) {
      try {
        const response = await fetch('/api/lien-line-settings', { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw Error(data.error || 'LINE連携設定を読み込めませんでした。')
        apply(data)
        if (showResult) {
          feedback.textContent = data.connected ? 'LINE公式アカウントとの接続を確認しました。' : '接続情報はまだ保存されていません。'
          feedback.className = `line-v436-feedback ${data.connected ? 'ok' : ''}`
        }
      } catch (error) {
        feedback.textContent = error.message
        feedback.className = 'line-v436-feedback error'
      }
    }

    card.querySelector('[data-line-save]').onclick = async event => {
      const button = event.currentTarget
      button.disabled = true
      feedback.textContent = 'LINE公式アカウントを確認しています…'
      feedback.className = 'line-v436-feedback'
      try {
        const payload = Object.fromEntries(['messagingChannelId', 'lineLoginChannelId', 'liffId', 'channelSecret', 'accessToken'].map(name => [name, card.querySelector(`[name="${name}"]`).value]))
        const response = await fetch('/api/lien-line-settings', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await response.json()
        if (!response.ok) throw Error(data.error || '保存できませんでした。')
        card.querySelector('[name="channelSecret"]').value = ''
        card.querySelector('[name="accessToken"]').value = ''
        apply(data)
        feedback.textContent = 'LINE予約の接続情報を保存しました。続けてLINE側へWebhook URLとLIFF Endpoint URLを設定してください。'
        feedback.className = 'line-v436-feedback ok'
      } catch (error) {
        feedback.textContent = error.message
        feedback.className = 'line-v436-feedback error'
      } finally { button.disabled = false }
    }
    card.querySelector('[data-line-reload]').onclick = event => {
      event.currentTarget.disabled = true
      load(true).finally(() => { event.currentTarget.disabled = false })
    }
    card.querySelectorAll('[data-copy]').forEach(button => button.onclick = () => {
      const value = button.dataset.copy === 'webhook' ? current?.webhookUrl : button.dataset.copy === 'endpoint' ? current?.liffEndpointUrl : current?.liffUrl
      copy(value, feedback)
    })
    load()
  }

  const schedule = () => window.setTimeout(enhance, 80)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
})()
