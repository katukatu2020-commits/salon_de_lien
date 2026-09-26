  async function availableStores(session) {
    await ensureSchema()
    return customerStoreDirectoryV670.availableStores(prisma, session)
  }

  async function stores(req, res) {
    const session = await currentCustomer(req)
    await ensureSchema()
    if (req.method === 'GET') {
      const rows = await availableStores(session)
      return json(res, 200, {
        stores: rows,
        groups: customerStoreDirectoryV670.groupStores(rows),
        storeCount: rows.length,
        registrationRequired: false,
      })
    }
    if (!sameOrigin(req)) throw new CustomerLinkError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    if (data.action === 'link' || data.action === 'unlink') {
      throw new CustomerLinkError('店舗の登録・解除は不要になりました。公開店舗一覧から利用する店舗を選んでください。', 410)
    }
    if (data.action === 'switch') {
      const organizationId = String(data.organizationId || '').trim()
      if (!organizationId || organizationId.length > 191 || !await customerStoreDirectoryV670.storeIsPublished(prisma, organizationId)) {
        throw new CustomerLinkError('この店舗は現在ORIMIAで公開されていません。', 404)
      }
      let links = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!links[0]) {
        const linked = await linkMemberToOrganization(session.userId, organizationId)
        if (!linked.alreadyLinked) await notifyLinkedCustomer(organizationId, linked.customerId, linked.name)
        links = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      }
      if (!links[0]) throw new CustomerLinkError('店舗の利用準備を完了できませんでした。もう一度お試しください。', 503)
      const users = await prisma.$queryRawUnsafe('SELECT "loginId","email" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE LIMIT 1', session.userId)
      const selected = await require('./customer-session-v591.js').resolveCustomerSession(prisma, { ...session, customerId: links[0].customerId, organizationId })
      if (!selected) throw new CustomerLinkError('この店舗は現在利用できません。', 409)
      const signed = signCustomerSession(selected, users[0]?.loginId || users[0]?.email, selected.customerId, organizationId)
      res.setHeader('Set-Cookie', `lien_customer_session=${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${signed.maxAge}`)
      return json(res, 200, { ok: true, redirect: '/u/home' })
    }
    throw new CustomerLinkError('操作内容を確認してください。')
  }
