import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCustomerRegistrationName,
  resolveCustomerProfileName
} from "../src/lib/customer-registration-name";

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

test("prefills profile fields from structured names", () => {
  assert.deepEqual(
    resolveCustomerProfileName({
      fullName: "旧姓 旧名",
      lastName: "山田",
      firstName: "花子",
      lastNameKana: "ﾔﾏﾀﾞ",
      firstNameKana: "はなこ"
    }),
    {
      lastName: "山田",
      firstName: "花子",
      lastNameKana: "ヤマダ",
      firstNameKana: "ハナコ"
    }
  );
});

test("prefills legacy profile names without inventing kana", () => {
  assert.deepEqual(resolveCustomerProfileName({ fullName: "山本 公正" }), {
    lastName: "山本",
    firstName: "公正",
    lastNameKana: "",
    firstNameKana: ""
  });
  assert.deepEqual(resolveCustomerProfileName({ fullName: "単独名" }), {
    lastName: "単独名",
    firstName: "",
    lastNameKana: "",
    firstNameKana: ""
  });
  assert.deepEqual(resolveCustomerProfileName({ fullName: "中島 弾正ナカジマ ダンジョウ" }), {
    lastName: "中島",
    firstName: "弾正",
    lastNameKana: "",
    firstNameKana: ""
  });
});
