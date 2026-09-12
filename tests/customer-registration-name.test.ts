import assert from "node:assert/strict";
import test from "node:test";
import { parseCustomerRegistrationName } from "../src/lib/customer-registration-name";

test("combines separately entered customer name fields", () => {
  assert.deepEqual(
    parseCustomerRegistrationName({
      lastName: " 山田 ",
      firstName: " 花子 ",
      lastNameKana: "ﾔﾏﾀﾞ",
      firstNameKana: "はなこ"
    }),
    {
      lastName: "山田",
      firstName: "花子",
      lastNameKana: "ヤマダ",
      firstNameKana: "ハナコ",
      fullName: "山田 花子",
      fullNameKana: "ヤマダ ハナコ"
    }
  );
});

test("rejects missing or non-kana readings", () => {
  assert.equal(
    parseCustomerRegistrationName({
      lastName: "山田",
      firstName: "花子",
      lastNameKana: "",
      firstNameKana: "ハナコ"
    }),
    null
  );
  assert.equal(
    parseCustomerRegistrationName({
      lastName: "山田",
      firstName: "花子",
      lastNameKana: "YAMADA",
      firstNameKana: "HANAKO"
    }),
    null
  );
});
