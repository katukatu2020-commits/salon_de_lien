import fs from 'node:fs'

const target = '/app/ui-workflows-v294.js'
let source = fs.readFileSync(target, 'utf8')

function replaceOnce(label, before, after) {
  const matches = source.split(before).length - 1
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches}`)
  }
  source = source.replace(before, after)
}

replaceOnce(
  'customer chat bubble layout',
  '.lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:10px;overflow:auto;padding:20px}.lien-chat-v294__message{max-width:min(76%,560px);align-self:flex-start;border-radius:17px 17px 17px 5px;background:#f3ede7;padding:11px 14px;font-size:13px;line-height:1.75;white-space:pre-wrap}.lien-chat-v294__message.mine{align-self:flex-end;border-radius:17px 17px 5px;background:#8f4f42;color:#fff}',
  '.lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px}.lien-chat-v294__date{display:flex;width:100%;align-items:center;justify-content:center;padding:4px 0}.lien-chat-v294__date span{border-radius:999px;background:#b8afa7;padding:4px 12px;color:#fff;font-size:11px;font-weight:600;line-height:1.4}.lien-chat-v294__message-row{display:flex;max-width:min(82%,620px);align-self:flex-end;align-items:flex-end;gap:8px;flex-direction:row-reverse}.lien-chat-v294__message-row.mine{align-self:flex-start;flex-direction:row}.lien-chat-v294__message{border-radius:17px 17px 5px 17px;background:#f3ede7;padding:11px 14px;color:#2f2a25;font-size:13px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.lien-chat-v294__message-row.mine .lien-chat-v294__message{border-radius:17px 17px 17px 5px;background:#8f4f42;color:#fff}.lien-chat-v294__message-meta{display:flex;flex:0 0 auto;flex-direction:column;align-items:flex-end;padding-bottom:2px;color:#8b7c73;font-size:10px;line-height:1.35;white-space:nowrap}.lien-chat-v294__message-row.mine .lien-chat-v294__message-meta{align-items:flex-start}.lien-chat-v294__message-read{font-size:9px}',
)

replaceOnce(
  'customer chat date/time helpers',
  '    function renderConversation(staff, payload) {',
  String.raw`    function chatDate(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    function chatDateKey(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function chatDateLabel(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function chatTimeLabel(value) {
      const date = chatDate(value)
      return date ? new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }).format(date) : ''
    }

    function renderChatMessage(message, index, messages, thread) {
      const mine = message.senderType === 'customer'
      const previous = index > 0 ? messages[index - 1] : null
      const currentDateKey = chatDateKey(message.createdAt)
      const showDate = index === 0 || currentDateKey !== chatDateKey(previous?.createdAt)
      const dateSeparator = showDate && currentDateKey
        ? <div class="lien-chat-v294__date" role="separator" aria-label="{esc(chatDateLabel(message.createdAt))}"><span>{esc(chatDateLabel(message.createdAt))}</span></div>
        : ''
      const staffReadAt = chatDate(thread?.staffLastReadAt)
      const messageAt = chatDate(message.createdAt)
      const isRead = mine && staffReadAt && messageAt && messageAt <= staffReadAt
      const readLabel = isRead ? '<span class="lien-chat-v294__message-read">既読</span>' : ''
      return {dateSeparator}<div class="lien-chat-v294__message-row {mine ? 'mine' : ''}" data-sender="{mine ? 'customer' : 'staff'}"><div class="lien-chat-v294__message">{esc(message.body)}</div><time class="lien-chat-v294__message-meta" datetime="{esc(message.createdAt || '')}">{readLabel}<span>{esc(chatTimeLabel(message.createdAt))}</span></time></div>
    }

    function renderConversation(staff, payload) {`.replaceAll('\u0001', '`').replaceAll('\u0002', '$'),
)

replaceOnce(
  'customer chat message renderer',
  "messages.map(message => `<div class=\"lien-chat-v294__message ${message.senderType === 'customer' ? 'mine' : ''}\">${esc(message.body)}</div>`).join('')",
  "messages.map((message, index, list) => renderChatMessage(message, index, list, thread)).join('')",
)

fs.writeFileSync(target, source)
