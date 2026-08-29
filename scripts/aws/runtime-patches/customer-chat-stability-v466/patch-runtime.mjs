import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-chat-stability-v466'
const paths = {
  service: `${root}/content-management-v465.js`,
  customerChat: `${root}/ui-workflows-v294.js`,
  customerCommunity: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminCommunity: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
}

function replaceExactly(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue)
  if (first < 0 || source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${marker}: expected exactly one ${label}`)
  }
  return source.replace(oldValue, newValue)
}

let service = fs.readFileSync(paths.service, 'utf8')
service = replaceExactly(
  service,
  `if (url.pathname === '/content-edit-delete-client-v465.js' && req.method === 'GET') {`,
  `if ((url.pathname === '/content-edit-delete-client-v465.js' || url.pathname === '/content-edit-delete-client-v466.js') && req.method === 'GET') {`,
  'versioned client route',
)
service = replaceExactly(
  service,
  `fs.createReadStream('/app/content-edit-delete-client-v465.js').pipe(res)`,
  `fs.createReadStream(url.pathname.endsWith('v466.js') ? '/app/content-edit-delete-client-v466.js' : '/app/content-edit-delete-client-v465.js').pipe(res)`,
  'versioned client file',
)
fs.writeFileSync(paths.service, service)

let customerChat = fs.readFileSync(paths.customerChat, 'utf8')
customerChat = replaceExactly(
  customerChat,
  `script.src = '/content-edit-delete-client-v465.js'`,
  `script.src = '/content-edit-delete-client-v466.js'`,
  'customer chat client path',
)
customerChat = replaceExactly(
  customerChat,
  `      conversation.querySelector('[data-chat-body]')?.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessage() }
      })
    }`,
  `      conversation.querySelector('[data-chat-body]')?.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessage() }
      })
      document.dispatchEvent(new CustomEvent('lien:chat-rendered')) /* ${marker} */
    }`,
  'customer chat rendered event',
)
fs.writeFileSync(paths.customerChat, customerChat)

for (const [label, file] of Object.entries({
  customerCommunity: paths.customerCommunity,
  adminCommunity: paths.adminCommunity,
  adminChat: paths.adminChat,
})) {
  let source = fs.readFileSync(file, 'utf8')
  source = replaceExactly(source, '/content-edit-delete-client-v465.js', '/content-edit-delete-client-v466.js', `${label} client path`)
  fs.writeFileSync(file, source)
}

console.log(`${marker} runtime patched`)
