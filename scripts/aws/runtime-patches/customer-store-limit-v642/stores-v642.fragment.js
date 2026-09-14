  async function stores(req, res, url) {
    const session = await currentCustomer(req)
    await ensureSchema()
    if (req.method === 'GET' && url.searchParams.get('lookup')) {
      const code = storeCode(url.searchParams.get('lookup'))
      const registered = await availableStores(session)
      const organizations = await prisma.$queryRawUnsafe('SELECT "id","name","publicCode" FROM "Organization" WHERE UPPER("publicCode")=$1 LIMIT 1', code)
      if (!organizations[0]) throw new CustomerLinkError('店舗が見つかりません。コードをもう一度確認してください。', 404)
      const linked = registered.some(store => store.organizationId === organizations[0].id)
      return json(res, 200, {
        store: {
          organizationId: organizations[0].id,
          name: organizations[0].name,
          publicCode: organizations[0].publicCode,
          iconUrl: `/api/lien-store-icon?organizationId=${encodeURIComponent(organizations[0].id)}`,
          alreadyLinked: linked,
        },
        storeCount: registered.length,
        maxStores: customerStoreMembershipV642.MAX_STORES,
        canLink: linked || registered.length < customerStoreMembershipV642.MAX_STORES,
      })
    }
    if (req.method === 'GET') {
      const rows = await availableStores(session)
      return json(res, 200, { stores: rows, storeCount: rows.length, maxStores: customerStoreMembershipV642.MAX_STORES })
    }
    if (!sameOrigin(req)) throw new CustomerLinkError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    if (data.action === 'link') {
      if (data.confirmed !== true) throw new CustomerLinkError('店舗内容を確認してから追加してください。')
      const code = storeCode(data.storeCode)
      const organizations = await prisma.$queryRawUnsafe('SELECT "id","name" FROM "Organization" WHERE UPPER("publicCode")=$1 LIMIT 1', code)
      if (!organizations[0]) throw new CustomerLinkError('店舗が見つかりません。', 404)
      const result = await linkMemberToOrganization(session.userId, organizations[0].id)
      if (!result.alreadyLinked) await notifyLinkedCustomer(organizations[0].id, result.customerId, result.name)
      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, maxStores: customerStoreMembershipV642.MAX_STORES })
    }
    if (data.action === 'unlink') {
      const result = await customerStoreMembershipV642.unlinkStore(prisma, session, data.organizationId)
      let redirect = '/u/stores'
      if (result.removesCurrent && result.replacement) {
        const signed = signCustomerSession(session, result.subject, result.replacement.customerId, result.replacement.organizationId)
        res.setHeader('Set-Cookie', `lien_customer_session=${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${signed.maxAge}`)
        redirect = '/u/home'
      }
      return json(res, 200, { ok: true, removed: true, switched: result.removesCurrent, redirect, storeCount: result.remainingCount, maxStores: customerStoreMembershipV642.MAX_STORES })
    }
    if (data.action === 'switch') {
      const organizationId = String(data.organizationId || '')
      const links = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!links[0]) throw new CustomerLinkError('登録済みの店舗ではありません。', 404)
      const users = await prisma.$queryRawUnsafe('SELECT "loginId","email" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE LIMIT 1', session.userId)
      const selected = await require('./customer-session-v591.js').resolveCustomerSession(prisma, { ...session, customerId: links[0].customerId, organizationId })
      if (!selected) throw new CustomerLinkError('この店舗は現在利用できません。登録済みの店舗を選び直してください。', 409)
      const signed = signCustomerSession(selected, users[0]?.loginId || users[0]?.email, selected.customerId, organizationId)
      res.setHeader('Set-Cookie', `lien_customer_session=${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${signed.maxAge}`)
      return json(res, 200, { ok: true, redirect: '/u/home' })
    }
    throw new CustomerLinkError('操作内容を確認してください。')
  }
