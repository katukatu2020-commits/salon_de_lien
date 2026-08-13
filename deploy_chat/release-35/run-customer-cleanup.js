const { PrismaClient } = require("@prisma/client");

const confirmation = "--confirm=delete-non-gmail-20260813";
if (!process.argv.includes(confirmation)) {
  throw new Error(`Refusing to run. Supply ${confirmation} after verifying the RDS snapshot.`);
}

if (!process.env.DATABASE_URL) {
  const required = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing database setting: ${key}`);
  }
  const user = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);
  const schema = encodeURIComponent(process.env.DB_SCHEMA || "public");
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=${schema}`;
}

const prisma = new PrismaClient();
const organizationId = process.env.DEFAULT_ORGANIZATION_ID || "org_salon_de_lien";
const ishiiCustomerId = "demo-reservation-customer-001";
const demoCustomerId = "demo-customer-ui-20260813";

async function scalar(tx, sql, ...values) {
  const rows = await tx.$queryRawUnsafe(sql, ...values);
  return Number(rows[0].count);
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const gmailBefore = await scalar(
      tx,
      `SELECT COUNT(DISTINCT c.id)::int AS count
         FROM "Customer" c
        WHERE c."organizationId" = $1
          AND EXISTS (
            SELECT 1 FROM "Appointment" a
             WHERE a."customerId" = c.id AND a.source LIKE 'gmail:%'
          )`,
      organizationId
    );
    const ishiiBefore = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "Customer"
        WHERE "organizationId" = $1
          AND (id = $2 OR replace(replace(name, ' ', ''), '　', '') = '石井ひなた')`,
      organizationId,
      ishiiCustomerId
    );

    if (gmailBefore < 1) throw new Error("Safety check failed: no Gmail-ingested customers found.");
    if (ishiiBefore !== 1) throw new Error(`Safety check failed: expected one 石井ひなた, found ${ishiiBefore}.`);

    await tx.$executeRawUnsafe(
      `CREATE TEMP TABLE customer_cleanup_ids ON COMMIT DROP AS
       SELECT c.id
         FROM "Customer" c
        WHERE c."organizationId" = $1
          AND c.id <> $2
          AND replace(replace(c.name, ' ', ''), '　', '') <> '石井ひなた'
          AND NOT EXISTS (
            SELECT 1 FROM "Appointment" a
             WHERE a."customerId" = c.id AND a.source LIKE 'gmail:%'
          )`,
      organizationId,
      ishiiCustomerId
    );

    const deleteCandidates = await scalar(tx, `SELECT COUNT(*)::int AS count FROM customer_cleanup_ids`);
    if (deleteCandidates < 1 || deleteCandidates > 500) {
      throw new Error(`Safety check failed: delete candidate count is ${deleteCandidates}.`);
    }

    const appointmentsToDelete = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "Appointment"
        WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`
    );
    const appUsersToDelete = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "AppUser"
        WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`
    );

    await tx.$executeRawUnsafe(`DELETE FROM "AppUser" WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "CustomerRegistrationInvite" WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "SmsSendLog" WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "Referral" WHERE "referrerCustomerId" IN (SELECT id FROM customer_cleanup_ids) OR "referredCustomerId" IN (SELECT id FROM customer_cleanup_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "CustomerRealName" WHERE "customerId" IN (SELECT id FROM customer_cleanup_ids)`);
    const deleted = await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE id IN (SELECT id FROM customer_cleanup_ids)`);

    await tx.$executeRawUnsafe(
      `INSERT INTO "Customer"
         (id, "organizationId", name, memo, "staffAssignmentType", "createdAt", "updatedAt")
       VALUES ($1, $2, 'デモ 顧客', '画面確認用の仮データです。実在する顧客ではありません。', 'free', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         memo = EXCLUDED.memo,
         phone = NULL,
         "phoneVerifiedAt" = NULL,
         "staffAssignmentType" = EXCLUDED."staffAssignmentType",
         "deletedAt" = NULL,
         "updatedAt" = NOW()`,
      demoCustomerId,
      organizationId
    );

    const totalAfter = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "Customer" WHERE "organizationId" = $1`,
      organizationId
    );
    const gmailAfter = await scalar(
      tx,
      `SELECT COUNT(DISTINCT c.id)::int AS count
         FROM "Customer" c
        WHERE c."organizationId" = $1
          AND EXISTS (
            SELECT 1 FROM "Appointment" a
             WHERE a."customerId" = c.id AND a.source LIKE 'gmail:%'
          )`,
      organizationId
    );
    const ishiiAfter = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "Customer"
        WHERE "organizationId" = $1
          AND (id = $2 OR replace(replace(name, ' ', ''), '　', '') = '石井ひなた')`,
      organizationId,
      ishiiCustomerId
    );
    const demoAfter = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count FROM "Customer"
        WHERE "organizationId" = $1 AND id = $2 AND "deletedAt" IS NULL`,
      organizationId,
      demoCustomerId
    );
    const unexpectedAfter = await scalar(
      tx,
      `SELECT COUNT(*)::int AS count
         FROM "Customer" c
        WHERE c."organizationId" = $1
          AND c.id <> $2
          AND c.id <> $3
          AND replace(replace(c.name, ' ', ''), '　', '') <> '石井ひなた'
          AND NOT EXISTS (
            SELECT 1 FROM "Appointment" a
             WHERE a."customerId" = c.id AND a.source LIKE 'gmail:%'
          )`,
      organizationId,
      ishiiCustomerId,
      demoCustomerId
    );

    if (gmailAfter !== gmailBefore || ishiiAfter !== 1 || demoAfter !== 1 || unexpectedAfter !== 0) {
      throw new Error(
        `Post-cleanup check failed: Gmail ${gmailBefore}->${gmailAfter}, Ishii ${ishiiAfter}, demo ${demoAfter}, unexpected ${unexpectedAfter}.`
      );
    }
    if (totalAfter !== gmailAfter + 2) {
      throw new Error(`Post-cleanup total mismatch: total ${totalAfter}, expected ${gmailAfter + 2}.`);
    }

    return {
      deletedCustomers: Number(deleted),
      deletedAppointments: appointmentsToDelete,
      deletedCustomerLogins: appUsersToDelete,
      gmailCustomers: gmailAfter,
      totalCustomers: totalAfter,
      retainedIshii: ishiiAfter,
      createdDemo: demoAfter,
    };
  }, { maxWait: 10000, timeout: 120000 });

  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
