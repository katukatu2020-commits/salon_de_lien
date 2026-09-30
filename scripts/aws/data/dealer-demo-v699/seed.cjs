'use strict';
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const { createWholesaleOrderingService, WholesaleError } = require('/app/wholesale-ordering-v543');
const { createDealerErp } = require('/app/dealer-erp-v678');
const { createDealerSalesTeam } = require('/app/dealer-sales-team-v671');
const { createConsolidation } = require('/app/order-consolidation-v692');
const PREFIX = 'orimia_demo_v699';
const DEALER_ID = 'dealer_' + PREFIX;
const LOGIN = 'orimia.demo.dealer';
const MARKER = PREFIX + '_complete';
const db = new PrismaClient();
const hashPassword = (_crypto, password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return 'scrypt$' + salt + '$' + crypto.scryptSync(password, salt, 64).toString('hex');
};
const jstDay = value => new Date(new Date(value).getTime() + 32400000).toISOString().slice(0, 10);
const shiftDay = (day, days) => new Date(Date.parse(day + 'T12:00:00+09:00') + days * 86400000).toISOString().slice(0, 10);

async function seed(plan, password, dryRun) {
  if (!plan.salonId || !plan.expectedSalonName || plan.confirmDedicatedDemo !== true) throw Error('Explicit salon identity and dedicated-demo confirmation required');
  if (!password || password.length < 16) throw Error('A new demo password of at least 16 characters is required');
  let result;
  try {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('orimia-demo-v699',0))");
      const q = (sql, ...p) => tx.$queryRawUnsafe(sql, ...p);
      const ex = (sql, ...p) => tx.$executeRawUnsafe(sql, ...p);
      const one = async (sql, ...p) => (await q(sql, ...p))[0];
      const salon = await one('SELECT id,name,"publicCode" FROM "Organization" WHERE id=$1', plan.salonId);
      if (!salon || salon.name !== plan.expectedSalonName || !salon.publicCode) throw Error('Salon identity/code mismatch; no changes applied');
      const existing = await one('SELECT id,name,"loginId" FROM "WholesaleDealer" WHERE id=$1 OR "loginId"=$2', DEALER_ID, LOGIN);
      if (existing) {
        const marker = await one('SELECT result FROM "DealerErpCommand" WHERE "dealerId"=$1 AND key=$2', DEALER_ID, MARKER);
        if (existing.id !== DEALER_ID || !marker || marker.result.salonId !== salon.id) throw Error('Existing account is not this demo; refusing to overwrite');
        result = { ...marker.result, alreadyPresent: true };
        return;
      }
      // Reuse the production services inside one outer transaction, including their nested commands.
      const transactional = new Proxy(tx, { get(target, key) {
        if (key === '$transaction') return async fn => fn(transactional);
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      const wholesale = createWholesaleOrderingService({ prisma: transactional, crypto,
        adminSessionProvider: async () => null,
        dealerAuthMailSender: async () => { throw Error('Demo seeding must not send mail'); } });
      const team = createDealerSalesTeam({ prisma: transactional, crypto, helpers: { hashPassword } });
      const erp = createDealerErp({ prisma: transactional, crypto, helpers: {} });
      const consolidation = createConsolidation({ db: transactional, crypto, erp, ErrorClass: WholesaleError });
      await ex(`INSERT INTO "WholesaleDealer" (id,name,"loginId",email,"passwordHash","dealerCode","representativeName",address)
        VALUES ($1,'ORIMIA デモディーラー',$2,'dealer-demo@example.invalid',$3,'DEMO-V699','デモ管理者','デモ専用・実際の取引ではありません')`, DEALER_ID, LOGIN, hashPassword(crypto, password));
      let session = await team.extendSession({ id: DEALER_ID, name: 'ORIMIA デモディーラー', representativeName: 'デモ管理者' }, {});
      assert.equal(session.role, 'ADMIN');
      const act = (name, payload, suffix) => erp.command(session, name, { ...payload, key: PREFIX + '_' + suffix });
      await wholesale.getDealerBilling(DEALER_ID);
      await ex('UPDATE "WholesaleDealerBilling" SET "monthlyAmount"=0,"displayName"=\'デモ専用（課金対象外）\' WHERE "dealerId"=$1', DEALER_ID);
      const branch = await team.saveBranch(session, { name: 'デモ岡山営業所' });
      const branch2 = await team.saveBranch(session, { name: 'デモ物流センター' });
      await team.saveMember(session, { id: session.memberId, name: 'デモ管理者', role: 'ADMIN', branchId: branch.id });
      session = { ...session, branchId: branch.id };
      const sales = await team.saveMember(session, { name: 'デモ営業担当', loginId: 'orimia.demo.sales', role: 'STAFF', branchId: branch.id });
      const warehouseMember = await team.saveMember(session, { name: 'デモ倉庫担当', loginId: 'orimia.demo.warehouse', role: 'STAFF', branchId: branch2.id });
      // Secondary accounts are listed for role demos but cannot log in until the admin issues a password.
      await ex('UPDATE "DealerSalesMember" SET active=FALSE WHERE id=ANY($1::text[])', [sales.id, warehouseMember.id]);
      await act('procurement-permission', { memberId: warehouseMember.id, canProcure: true }, 'warehouse_permission');
      const linked = await wholesale.registerSalonContract(session, { salonCode: salon.publicCode });
      assert.equal(linked.organization.id, salon.id);
      await team.assign(session, { id: linked.contract.id, memberId: session.memberId, branchId: branch.id, closingDay: 31 });
      await act('terms', { organizationId: salon.id, paymentDay: 31, paymentMonths: 1, note: '【デモ】月末締め・翌月末払い。架空の取引・入金記録です。' }, 'terms');
      await act('discount-visibility', { organizationId: salon.id, showDiscountRate: false }, 'hidden_rates');
      await act('order-cutoff', { cutoffTime: '11:00', expectedUpdatedAt: null }, 'cutoff');
      await act('shipping-policy', { feeYen: 600, freeThresholdYen: 10000, version: 0 }, 'shipping');
      const suppliers = [];
      for (const [n, name] of ['デモ美容メーカー直送', 'デモ業務用品仕入先'].entries()) suppliers.push(await act('supplier-save', { name, code: 'DEMO-SUP-' + (n + 1), note: 'デモ専用・送信しない' }, 'supplier_' + n));
      const catalog = [
        ['デモヘアケア', 'シャンプー', 'モイストシャンプー 500mL', 2400],
        ['デモヘアケア', 'シャンプー', 'スカルプシャンプー 500mL', 2800],
        ['デモヘアケア', 'トリートメント', 'リペアトリートメント 500g', 3000],
        ['デモヘアケア', 'トリートメント', '集中ケアマスク 200g', 2600],
        ['デモカラー', 'カラー剤', 'ナチュラルブラウン 80g', 1000],
        ['デモカラー', 'カラー剤', 'アッシュブラウン 80g', 1000],
        ['デモカラー', 'カラー剤', 'ベージュブラウン 80g', 1000],
        ['デモカラー', '処理剤', 'カラーオキシ 1000mL', 1600],
        ['デモスタイリング', 'オイル', 'ヘアオイル 100mL', 2200],
        ['デモスタイリング', 'ワックス', 'スタイリングワックス 80g', 1800],
        ['デモ業務用品', '消耗品', 'カラーカップ', 500],
        ['デモ業務用品', '消耗品', 'カラー手袋 100枚', 1200],
      ];
      const products = [];
      for (const [i, [manufacturerName, category, name, price]] of catalog.entries()) {
        const code = 'DEMO-' + String(i + 1).padStart(3, '0');
        const { product } = await wholesale.createDealerProduct(session, { manufacturerName, category, name: '【デモ】' + name, productCode: code, wholesalePrice: price, suggestedRetailPrice: price, orderUnit: 1, description: '架空の商品・価格です。実際の発送はありません。' });
        products.push(product);
        await act('supplier-assign', { productId: product.id, supplierId: suppliers[i < 10 ? 0 : 1].id, supplierProductCode: 'SUP-' + code, manufacturerProductCode: 'MFR-' + code, unitCost: Math.round(price * 0.45) }, 'assign_' + i);
      }
      await wholesale.updateContractProductPricing(session, linked.contract.id, { items: products.map(p => ({ dealerProductId: p.id, enabled: true, discountRate: 20 })) });
      const warehouse = await act('warehouse', { name: 'デモ岡山倉庫', branchId: branch.id, location: 'A棚・ヘアケア' }, 'warehouse');
      const colorShelf = await act('location', { warehouseId: warehouse.id, name: 'B棚・カラー／業務用品' }, 'shelf');
      const locations = products.map((_, i) => i < 4 || i === 8 || i === 9 ? warehouse.locationId : colorShelf.id);
      for (const [i, p] of products.entries()) await act('stock', { locationId: locations[i], productId: p.id, kind: 'RECEIPT', quantity: i === 11 ? 3 : 24, minimum: 6, reason: '【デモ】初期在庫・実在庫ではありません' }, 'stock_' + i);
      const today = jstDay(new Date()), month = today.slice(0, 7);
      const lastMonth = shiftDay(month + '-01', -1).slice(0, 7);
      for (const m of [lastMonth, month]) {
        await team.saveGoal(session, { memberId: session.memberId, month: m, salesTargetYen: 150000, acquisitionTarget: 3 });
        await act('branch-goal', { branchId: branch.id, month: m, salesTargetYen: 150000, acquisitionTarget: 3 }, 'goal_' + m);
      }
      const scenarios = [
        { label: '01 先月・納品／入金済み', day: lastMonth + '-20', stage: 'paid', lines: [[0, 6], [2, 6]] },
        { label: '02 今月・納品／入金済み', day: today, stage: 'paid', lines: [[0, 8], [8, 5], [10, 6]] },
        { label: '03 納品済み・一部入金', day: shiftDay(today, -1), stage: 'partial', lines: [[1, 5], [3, 4], [9, 4]] },
        { label: '04 出荷済み・納品待ち', day: shiftDay(today, -2), stage: 'shipped', lines: [[4, 10], [7, 2]] },
        { label: '05 メーカー発注済み・入荷待ち', day: shiftDay(today, -3), stage: 'procured', lines: [[5, 12], [11, 5]] },
        { label: '06 受注済み・メーカー未発注', day: shiftDay(today, -4), stage: 'accepted', lines: [[6, 12], [7, 3]] },
        { label: '07 新規注文・締切前に編集可能', day: today, stage: 'ordered', lines: [[0, 2], [10, 2]] },
      ];
      const records = [];
      for (const [i, scenario] of scenarios.entries()) {
        const cutoffAt = new Date(Math.min(Date.parse(scenario.day + 'T11:00:00+09:00'), Date.now() - 60000));
        const at = new Date(Math.min(Date.parse(scenario.day + 'T09:00:00+09:00'), cutoffAt.getTime() - 60000));
        const payload = { dealerId: DEALER_ID, lines: scenario.lines.map(([p, quantity]) => ({ dealerProductId: products[p].id, quantity })), salonNote: '【デモ】' + scenario.label + '。実際の発注・請求ではありません。', key: PREFIX + '_order_' + i };
        const [created] = await consolidation.create({ organizationId: salon.id, userId: PREFIX, displayName: 'デモ注文担当' }, payload);
        const orderId = created.id, orderNo = 'DEMO-' + String(i + 1).padStart(2, '0') + '-' + scenario.day.replaceAll('-', '');
        await ex('UPDATE "WholesaleOrder" SET "orderNo"=$2 WHERE id=$1 AND "dealerId"=$3', orderId, orderNo, DEALER_ID);
        if (scenario.stage !== 'ordered') {
          await ex('UPDATE "WholesaleOrder" SET "orderedAt"=$2,"createdAt"=$2,"businessDate"=$3::date,"consolidationClosesAt"=$4 WHERE id=$1 AND "dealerId"=$5', orderId, at, scenario.day, cutoffAt, DEALER_ID);
          await ex('UPDATE "WholesaleOrderAmendment" SET "cutoffAt"=$2 WHERE "orderId"=$1', orderId, cutoffAt);
          await act('order-accept', { orderId }, 'accept_' + i);
        }
        const record = { label: scenario.label, orderId, orderNo };
        if (!['ordered', 'accepted'].includes(scenario.stage)) {
          const preview = await erp.flow.preview(session, new URLSearchParams({ order: orderId }));
          assert.equal(preview.rows.length, scenario.lines.length);
          const generated = await act('procurement-generate', { order: orderId, version: preview.version }, 'generate_' + i);
          for (const purchase of generated.purchases) {
            const exported = await erp.flow.exportPurchase(session, purchase.id);
            assert.ok(exported);
            await act('procurement-submit', { purchaseId: purchase.id, confirmed: true }, 'submit_' + purchase.id);
            if (scenario.stage !== 'procured') {
              for (const line of await q('SELECT * FROM "DealerErpPurchaseLine" WHERE "purchaseId"=$1', purchase.id)) {
                const p = products.findIndex(p => p.id === line.productId);
                await act('receive', { purchaseId: purchase.id, lineId: line.id, locationId: locations[p], quantity: line.quantity }, 'receive_' + line.id);
              }
            }
          }
          if (scenario.stage !== 'procured') {
            for (const line of await q('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=$1', orderId)) {
              const p = products.findIndex(p => p.id === line.dealerProductId);
              await act('reserve', { orderId, lineId: line.id, locationId: locations[p], quantity: line.quantity }, 'reserve_' + line.id);
            }
            const shipment = await act('ship', { orderId }, 'ship_' + i);
            if (scenario.stage !== 'shipped') {
              await act('deliver', { shipmentId: shipment.id }, 'deliver_' + i);
              const deliveredAt = new Date(Math.max(at.getTime(), Date.parse(scenario.day + 'T00:00:00+09:00')));
              await ex('UPDATE "DealerErpCharge" SET "occurredAt"=$2 WHERE "orderId"=$1 AND "dealerId"=$3', orderId, deliveredAt, DEALER_ID);
              await ex('UPDATE "DealerErpShipment" SET "deliveredAt"=$2 WHERE id=$1 AND "dealerId"=$3', shipment.id, deliveredAt, DEALER_ID);
              await ex('UPDATE "WholesaleOrder" SET "deliveredAt"=$2 WHERE id=$1 AND "dealerId"=$3', orderId, deliveredAt, DEALER_ID);
              const inv = await act('invoice', { organizationId: salon.id, closingDate: scenario.day, dueDate: shiftDay(scenario.day, 30) }, 'invoice_' + i);
              const total = Number((await one('SELECT "totalYen" FROM "DealerErpInvoice" WHERE id=$1', inv.id)).totalYen);
              const amount = scenario.stage === 'partial' ? Math.floor(total / 2) : total;
              const payment = await act('payment', { organizationId: salon.id, reference: 'DEMO-PAY-' + i, paidDate: scenario.day, amountYen: amount, note: '【デモ】手動入金例・実際の送金ではありません' }, 'payment_' + i);
              await act('settle', { invoiceId: inv.id, paymentId: payment.id, amountYen: amount }, 'settle_' + i);
              record.invoiceId = inv.id; record.invoiceTotalYen = total; record.paidYen = amount;
            }
          }
        }
        records.push(record);
      }
      await act('activity', { memberId: session.memberId, organizationId: salon.id, kind: 'VISIT', title: '【デモ】商品提案の訪問予定', startsAt: today + 'T14:00:00+09:00', endsAt: today + 'T15:00:00+09:00', visibility: 'DEALER', status: 'PLANNED', note: 'デモ用・訪問予約ではありません', result: '' }, 'activity');
      const amounts = await q('SELECT status,COUNT(*)::int count FROM "WholesaleOrder" WHERE "dealerId"=$1 GROUP BY status', DEALER_ID);
      assert.equal(amounts.reduce((sum, r) => sum + r.count, 0), 7);
      assert.equal((await one('SELECT COUNT(*)::int count FROM "DealerErpInvoice" WHERE "dealerId"=$1', DEALER_ID)).count, 3);
      const invalidStock = await q('SELECT id FROM "DealerErpStock" WHERE "dealerId"=$1 AND ("onHand"<0 OR reserved<0 OR reserved>"onHand")', DEALER_ID);
      assert.equal(invalidStock.length, 0);
      result = { dealerId: DEALER_ID, dealerName: 'ORIMIA デモディーラー', loginId: LOGIN, salonId: salon.id, salonName: salon.name, catalogCount: products.length, orders: records, statuses: amounts, createdAt: new Date().toISOString(), dryRun };
      await ex('INSERT INTO "DealerErpCommand" ("dealerId",key,"actorId",action,hash,result) VALUES ($1,$2,$3,\'demo-seed\',$4,$5::jsonb)', DEALER_ID, MARKER, session.memberId, crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex'), JSON.stringify(result));
      if (dryRun) throw Object.assign(new Error('Rollback completed dry run'), { demoDryRun: true });
    }, { timeout: 180000, maxWait: 10000 });
  } catch (error) { if (!error.demoDryRun) throw error; }
  return result;
}

if (require.main === module) {
  const plan = JSON.parse(process.env.DEMO_PLAN_JSON || '{}');
  seed(plan, process.env.DEMO_PASSWORD, process.env.DEMO_APPLY !== 'YES')
    .then(result => console.log('DEMO_RESULT_V699 ' + JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
module.exports = { seed, db, DEALER_ID };
