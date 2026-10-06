import assert from "node:assert/strict";
import { test } from "node:test";
import * as source from "../src/lib/customer-kana";
// Runtime patches use the same behavior until the accumulated runtime is rebuilt.
const runtime = require("../scripts/aws/runtime-patches/customer-kana-search-v707/customer-kana.cjs");
test("customer kana source and deployed helper stay equivalent", () => {
  const rows = [{ id: "hana", lastNameKana: "ヤマモト", firstNameKana: "ハナ" }, { id: "none" }];
  assert.equal(source.CUSTOMER_KANA_QUERY, runtime.CUSTOMER_KANA_QUERY);
  for (const query of ["ヤマモトハナ", "やまもと　はな", "ﾔﾏﾓﾄ ﾊﾅ", "ハナ", "", "山本", "%"]) {
    assert.deepEqual(source.matchingCustomerKanaIds(rows, query), runtime.matchingCustomerKanaIds(rows, query));
  }
  for (const row of rows) {
    assert.equal(source.customerKana(row), runtime.customerKana(row));
    assert.equal(source.formatCustomerNameWithKana("山本 はな", source.customerKana(row)), runtime.formatCustomerNameWithKana("山本 はな", runtime.customerKana(row)));
  }
  assert.deepEqual(source.matchingCustomerKanaIds(rows, "ヤマモトハナ"), ["hana"]);
  assert.equal(source.formatCustomerNameWithKana("山本 はな", source.customerKana(rows[1])), "山本 はな");
});
