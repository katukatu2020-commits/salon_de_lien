'use strict';
const assert = require('node:assert/strict');
const { seed, db, DEALER_ID } = require('./seed.cjs');
const plan = { salonId: 'org_showcase_yohaku', expectedSalonName: 'ヘアサロン 余白と前髪', confirmDedicatedDemo: true };
if (process.env.ORIMIA_ISOLATED_QA !== 'v680' || !process.env.DATABASE_URL?.includes('/orimia_qa_v680_20260926?')) throw Error('Isolated QA database required');
const password = process.env.DEMO_PASSWORD;
const q = (sql, ...p) => db.$queryRawUnsafe(sql, ...p);
const count = async () => (await q('SELECT COUNT(*)::int n FROM "WholesaleDealer" WHERE id=$1', DEALER_ID))[0].n;
const existingOrders = async () => (await q(`SELECT md5(COALESCE(string_agg(row_to_json(o)::text,'' ORDER BY id),'')) hash
  FROM "WholesaleOrder" o WHERE "dealerId"<>$1`, DEALER_ID))[0].hash;
(async () => {
  const before = await existingOrders();
  await assert.rejects(seed({ ...plan, expectedSalonName: 'WRONG SALON' }, password, false), /mismatch/);
  if (!await count()) {
    const dry = await seed(plan, password, true);
    assert.equal(dry.dryRun, true);
    assert.equal(await count(), 0, 'Dry run must roll back the entire dataset');
  }
  const saved = await seed(plan, password, false);
  const repeated = await seed(plan, password, false);
  assert.equal(repeated.alreadyPresent, true);
  assert.deepEqual(saved.orders, repeated.orders);
  assert.equal(await count(), 1);
  assert.equal(before, await existingOrders(), 'Existing orders must not change');
  const statuses = Object.fromEntries((await q('SELECT status,COUNT(*)::int n FROM "WholesaleOrder" WHERE "dealerId"=$1 GROUP BY status', DEALER_ID)).map(r => [r.status, r.n]));
  assert.deepEqual(statuses, { ACCEPTED: 2, DELIVERED: 3, ORDERED: 1, SHIPPED: 1 });
  const totals = await q(`SELECT i.id,i."totalYen"::float8 AS "totalYen",COALESCE(SUM(s."amountYen"),0)::int paid
    FROM "DealerErpInvoice" i LEFT JOIN "DealerErpSettlement" s ON s."invoiceId"=i.id
    WHERE i."dealerId"=$1 GROUP BY i.id`, DEALER_ID);
  assert.equal(totals.filter(r => r.paid === r.totalYen).length, 2);
  assert.equal(totals.filter(r => r.paid > 0 && r.paid < r.totalYen).length, 1);
  assert.equal((await q('SELECT "monthlyAmount" FROM "WholesaleDealerBilling" WHERE "dealerId"=$1', DEALER_ID))[0].monthlyAmount, 0);
  assert.equal((await q('SELECT "showDiscountRate" FROM "WholesaleDealerContract" WHERE "dealerId"=$1', DEALER_ID))[0].showDiscountRate, false);
  console.log('PASS: identity guard, full dry-run rollback, idempotency, existing orders preserved, staged orders, invoice/payment balances, free demo account, hidden rates');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
