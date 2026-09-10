import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'all-dealer-order-filter-v621'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${marker}: ${label} expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

replaceExact(
  'server.js',
  'inventory-orders-common-layout-v572.js?v=620-dealer-code1',
  'inventory-orders-common-layout-v572.js?v=621-all-dealers1',
  1,
  'salon wholesale loader cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Code-History', 'v620') /* dealer-code-history-v620-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-All-Dealer-Order-Filter', 'v621') /* ${marker}-ready */`,
  1,
  'readiness header',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=620-dealer-code1',
  '/wholesale-ordering-client-v543.js?v=621-all-dealers1',
  1,
  'dealer wholesale client cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `    const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE')
    const selectedContract = activeContracts.find(contract => contract.dealerId === requestedDealerId) || activeContracts[0] || null
    const dealerId = selectedContract ? selectedContract.dealerId : null
`,
  `    const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE')
    const showingAllDealers = requestedDealerId === 'all'
    const selectedContract = showingAllDealers ? null : activeContracts.find(contract => contract.dealerId === requestedDealerId) || activeContracts[0] || null
    const dealerId = selectedContract ? selectedContract.dealerId : null
`,
  1,
  'all dealer bootstrap selection',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '    const catalogProducts = dealerId ? await prisma.$queryRawUnsafe(`SELECT p."id",p."manufacturerName",p."name",p."category",p."productCode",p."janCode",p."orderUnit",p."description",',
  '    const catalogProducts = activeContracts.length ? await prisma.$queryRawUnsafe(`SELECT p."id",p."manufacturerName",p."name",p."category",p."productCode",p."janCode",p."orderUnit",p."description",',
  1,
  'all dealer catalog eligibility',
)

replaceExact(
  'wholesale-ordering-v543.js',
  'WHERE l."dealerProductId"=p."id" AND o."organizationId"=$1 AND o."dealerId"=$2 AND o."status"<>\'CANCELLED\'',
  'WHERE l."dealerProductId"=p."id" AND o."organizationId"=$1 AND ($2::text IS NULL OR o."dealerId"=$2) AND o."status"<>\'CANCELLED\'',
  1,
  'all dealer last order lookup',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `      WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c."status"='ACTIVE'
      ORDER BY p."manufacturerName",p."name"\`, session.organizationId, dealerId) : []`,
  `      WHERE c."organizationId"=$1 AND ($2::text IS NULL OR c."dealerId"=$2) AND c."status"='ACTIVE'
      ORDER BY p."manufacturerName",p."name",d."name"\`, session.organizationId, dealerId) : []`,
  1,
  'all dealer catalog query',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '      selectedDealerId: dealerId,',
  "      selectedDealerId: showingAllDealers ? 'all' : dealerId,",
  1,
  'all dealer selection response',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  function selectedOrder() {
    return salonOrderProducts().map(function (product) {
      return { product: product, quantity: salon.quantities.get(product.id) || 0 }
    }).filter(function (item) { return item.quantity > 0 })
  }
`,
  `  function selectedOrder() {
    return salonOrderProducts().map(function (product) {
      return { product: product, quantity: salon.quantities.get(product.id) || 0 }
    }).filter(function (item) { return item.quantity > 0 })
  }

  function orderDealerId() {
    const dealerIds = Array.from(new Set(selectedOrder().map(function (item) { return item.product.dealerId })))
    return dealerIds.length === 1 ? dealerIds[0] : ''
  }
`,
  1,
  'single dealer order helper',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "      '<button class=\"wo-button wo-button-primary wo-submit-order\" type=\"button\" data-action=\"confirm-order\" ' + (!selected.length || !salon.data.selectedDealerId ? 'disabled' : '') + '>' + icon('truck') + '発注内容を確認</button><p class=\"wo-summary-foot\">表示価格は税抜です。発注時点の契約条件で注文を確定します。</p></aside>'",
  "      '<button class=\"wo-button wo-button-primary wo-submit-order\" type=\"button\" data-action=\"confirm-order\" ' + (!selected.length || !orderDealerId() ? 'disabled' : '') + '>' + icon('truck') + '発注内容を確認</button><p class=\"wo-summary-foot\">表示価格は税抜です。発注先ごとに注文を確定します。</p></aside>'",
  1,
  'single dealer order summary',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "      (activeContracts.length > 1 ? '<label class=\"wo-dealer-select\"><span>発注先</span><select id=\"dealer-select\">' + activeContracts.map(function (contract) { return '<option value=\"' + esc(contract.dealerId) + '\" ' + (contract.dealerId === salon.data.selectedDealerId ? 'selected' : '') + '>' + esc(contract.dealerName) + '</option>' }).join('') + '</select></label>' : '') + '</header>' +",
  "      (activeContracts.length > 1 ? '<label class=\"wo-dealer-select\"><span>発注先</span><select id=\"dealer-select\"><option value=\"all\" ' + (salon.data.selectedDealerId === 'all' ? 'selected' : '') + '>すべての発注先</option>' + activeContracts.map(function (contract) { return '<option value=\"' + esc(contract.dealerId) + '\" ' + (contract.dealerId === salon.data.selectedDealerId ? 'selected' : '') + '>' + esc(contract.dealerName) + '</option>' }).join('') + '</select></label>' : '') + '</header>' +",
  1,
  'all dealer dropdown option',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  function showOrderDialog() {
    const selected = selectedOrder()
    if (!selected.length) return
    const dialog = document.getElementById('wo-dialog')
`,
  `  function showOrderDialog() {
    const selected = selectedOrder()
    const dealerId = orderDealerId()
    const contract = salon.data.contracts.find(function (item) { return item.dealerId === dealerId })
    if (!selected.length || !dealerId || !contract) return
    const dialog = document.getElementById('wo-dialog')
`,
  1,
  'order confirmation dealer resolution',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "esc(salon.data.contracts.find(function (contract) { return contract.dealerId === salon.data.selectedDealerId }).dealerName)",
  'esc(contract.dealerName)',
  1,
  'order confirmation dealer name',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  async function submitOrder(button) {
    if (salon.busy) return
    salon.busy = true
`,
  `  async function submitOrder(button) {
    if (salon.busy) return
    const dealerId = orderDealerId()
    if (!dealerId) {
      notify('発注先ごとに商品を選択してください。', 'error')
      return
    }
    salon.busy = true
`,
  1,
  'order submission dealer validation',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '        dealerId: salon.data.selectedDealerId,',
  '        dealerId: dealerId,',
  1,
  'order submission dealer id',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `      } else if (action === 'quantity-minus' || action === 'quantity-plus') {
        const stepper = target.closest('.wo-stepper')
        const id = stepper.dataset.productId
        const unit = Number(stepper.dataset.unit)
        const next = Math.max(0, Math.min(999, (salon.quantities.get(id) || 0) + (action === 'quantity-plus' ? unit : -unit)))
        salon.quantities.set(id, next)
        renderSalon()
`,
  `      } else if (action === 'quantity-minus' || action === 'quantity-plus') {
        const stepper = target.closest('.wo-stepper')
        const id = stepper.dataset.productId
        const unit = Number(stepper.dataset.unit)
        const next = Math.max(0, Math.min(999, (salon.quantities.get(id) || 0) + (action === 'quantity-plus' ? unit : -unit)))
        const product = salonOrderProducts().find(function (item) { return item.id === id })
        const currentDealerId = orderDealerId()
        if (next > 0 && product && currentDealerId && product.dealerId !== currentDealerId) {
          notify('発注先ごとに注文を分けてください。', 'error')
          return
        }
        salon.quantities.set(id, next)
        renderSalon()
`,
  1,
  'mixed dealer stepper guard',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `        const value = Math.max(0, Math.min(999, Number(event.target.value || 0)))
        salon.quantities.set(stepper.dataset.productId, value)
        const row = stepper.closest('.wo-contract-product-row')
`,
  `        const value = Math.max(0, Math.min(999, Number(event.target.value || 0)))
        const product = salonOrderProducts().find(function (item) { return item.id === stepper.dataset.productId })
        const currentDealerId = orderDealerId()
        if (value > 0 && product && currentDealerId && product.dealerId !== currentDealerId) {
          event.target.value = salon.quantities.get(stepper.dataset.productId) || 0
          notify('発注先ごとに注文を分けてください。', 'error')
          return
        }
        salon.quantities.set(stepper.dataset.productId, value)
        const row = stepper.closest('.wo-contract-product-row')
`,
  1,
  'mixed dealer quantity input guard',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `      else if (event.target.id === 'dealer-select') {
        salon.data.selectedDealerId = event.target.value
        try { await reloadSalon(event.target.value) } catch (error) { notify(error.message, 'error') }
`,
  `      else if (event.target.id === 'dealer-select') {
        salon.quantities.clear()
        salon.data.selectedDealerId = event.target.value
        try { await reloadSalon(event.target.value) } catch (error) { notify(error.message, 'error') }
`,
  1,
  'dealer filter cart reset',
)

replaceExact(
  'public/inventory-orders-common-layout-v572.js',
  '/wholesale-ordering-client-v543.js?v=620-dealer-code1',
  '/wholesale-ordering-client-v543.js?v=621-all-dealers1',
  1,
  'salon wholesale client cache key',
)

fs.writeFileSync('/tmp/all-dealer-order-filter-v621-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
