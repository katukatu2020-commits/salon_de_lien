'use strict'

const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const field = (label, name, type, max, autocomplete) => `<label class="sg-field"><span>${label}</span><input name="${name}" type="${type}" maxlength="${max}" autocomplete="${autocomplete}" required></label>`

function renderInquiryDialog(data, prefectures) {
  return `<dialog class="sg-dialog" id="sg-create" aria-labelledby="sg-create-title"><form id="sg-create-form">
    <header><h2 id="sg-create-title">新店舗登録のご相談</h2><button type="button" class="sg-close" data-close aria-label="閉じる" title="閉じる">×</button></header>
    <p class="sg-form-note">申請元：${h(data.groupName)}</p>
    <div class="sg-fields">
      ${field('新店舗名', 'name', 'text', 100, 'organization')}
      ${field('店舗管理者名', 'ownerName', 'text', 80, 'name')}
      ${field('連絡先メール', 'email', 'email', 254, 'email')}
      ${field('電話番号', 'phone', 'tel', 24, 'tel')}
      <label class="sg-field"><span id="sg-prefecture-label">都道府県</span><select name="prefecture" aria-labelledby="sg-prefecture-label" required><option value="">選択してください</option>${prefectures.map(p => `<option>${h(p)}</option>`).join('')}</select></label>
      ${field('市区町村', 'city', 'text', 80, 'address-level2')}
      <div class="sg-full">${field('町名・番地・建物名', 'address', 'text', 200, 'street-address')}</div>
      <label class="sg-field sg-full"><span>ご相談内容（任意）</span><textarea name="message" rows="3" maxlength="2000"></textarea></label>
    </div>
    <label class="sg-consent"><input type="checkbox" name="confirmed" required> 入力した内容で運営へ新店舗登録を申請する</label>
    <p class="sg-feedback" role="status" aria-live="polite"></p>
    <footer><button type="button" class="sg-button" data-close>キャンセル</button><button class="sg-button primary" type="submit">運営に申請する</button></footer>
    </form><section id="sg-created" hidden></section></dialog>`
}
module.exports = { renderInquiryDialog }
