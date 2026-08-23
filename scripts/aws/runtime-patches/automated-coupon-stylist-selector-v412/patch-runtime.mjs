import fs from "node:fs";

const pagePath = "/app/.next/server/app/admin/customers/messages/page.js";
const actionsPath = "/app/.next/server/chunks/9845.js";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceDelimitedOnce(source, start, end, replacement, label) {
  const first = source.indexOf(start);
  if (first < 0) throw new Error(`Missing patch start: ${label}`);
  if (source.indexOf(start, first + start.length) >= 0) {
    throw new Error(`Patch start is not unique: ${label}`);
  }
  const last = source.indexOf(end, first + start.length);
  if (last < 0) throw new Error(`Missing patch end: ${label}`);
  return source.slice(0, first) + replacement + source.slice(last + end.length);
}

const stylistCandidatesSql = `SELECT DISTINCT ON ("staffName") "id","staffName" FROM (SELECT "staffKey" AS "id",BTRIM("staffName") AS "staffName",0 AS "sourceOrder","createdAt" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE AND "staffKey"<>'free' UNION ALL SELECT u."id",BTRIM(u."displayName"),1,u."createdAt" FROM "AppUser" u WHERE u."organizationId"=$1 AND u."active"=TRUE AND u."role"::text IN ('ADMIN','STAFF') AND NULLIF(BTRIM(u."displayName"),'') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "StaffBookingSetting" s WHERE s."organizationId"=$1 AND (s."staffKey"=u."loginId" OR BTRIM(s."staffName")=BTRIM(u."displayName")) AND (s."active"=FALSE OR s."onLeave"=TRUE))) AS candidates WHERE "staffName"<>'' AND LOWER("staffName")<>'free' AND "staffName" NOT IN ('フリー','指名なし') ORDER BY "staffName","sourceOrder","createdAt"`;

const escapeForCompiledSingleQuote = (value) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");

let page = fs.readFileSync(pagePath, "utf8");
page = replaceDelimitedOnce(
  page,
  `f._.$queryRawUnsafe('SELECT "staffKey" AS "id","staffName" FROM "StaffBookingSetting"`,
  `', s.organizationId)`,
  `f._.$queryRawUnsafe('${escapeForCompiledSingleQuote(stylistCandidatesSql)}', s.organizationId)`,
  "automated coupon stylist candidates",
);
page = replaceOnce(
  page,
  "/automated-coupon-fields-v330.js",
  "/automated-coupon-fields-v412.js?v=412",
  "automated coupon client asset",
);
fs.writeFileSync(pagePath, page);

let actions = fs.readFileSync(actionsPath, "utf8");
const validatedStylistSql = `${stylistCandidatesSql.replace(
  ' ORDER BY "staffName","sourceOrder","createdAt"',
  '',
)} AND "staffName"=$2 LIMIT 1`;
actions = replaceDelimitedOnce(
  actions,
  `u._.$queryRawUnsafe('SELECT "staffName" FROM "StaffBookingSetting"`,
  `', t.organizationId, l)`,
  `u._.$queryRawUnsafe('${escapeForCompiledSingleQuote(validatedStylistSql)}', t.organizationId, l)`,
  "automated coupon stylist validation",
);
fs.writeFileSync(actionsPath, actions);

console.log("automated coupon stylist selector v412 runtime patch applied");
