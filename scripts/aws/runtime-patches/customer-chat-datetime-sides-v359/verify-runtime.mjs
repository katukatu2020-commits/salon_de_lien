import fs from 'node:fs'

const source = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')

const required = [
  'function chatDateKey(value)',
  'function chatDateLabel(value)',
  'function chatTimeLabel(value)',
  'function renderChatMessage(message, index, messages, thread)',
  'lien-chat-v294__date',
  'lien-chat-v294__message-row',
  "data-sender=\"${mine ? 'customer' : 'staff'}\"",
  "messages.map((message, index, list) => renderChatMessage(message, index, list, thread)).join('')",
  "timeZone: 'Asia/Tokyo'",
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`missing customer chat marker: ${marker}`)
}

if (source.includes("messages.map(message => `<div class=\"lien-chat-v294__message")) {
  throw new Error('legacy customer chat message renderer remains')
}

console.log('customer chat date/time and side layout verified')
