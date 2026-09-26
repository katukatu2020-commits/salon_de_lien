  async function storesPage(req, res) {
    const session = await currentCustomer(req)
    const rows = await availableStores(session)
    const body = customerStoreDirectoryV670.renderDirectory(rows)
    return html(res, renderCustomerShell({ title: 'サロンを探す', active: '', back: '/u/home', body }))
  }
