import fs from "node:fs";

const servicePath = "/app/customer-withdrawal-v309.js";

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  return source.replace(oldValue, newValue);
}

let service = fs.readFileSync(servicePath, "utf8");

service = replaceOnce(
  service,
  `    // Repair legacy withdrawals that left another customer login active.
    await prisma.$executeRawUnsafe('UPDATE "AppUser" u SET "active"=FALSE, "updatedAt"=NOW() FROM "Customer" c WHERE u."customerId"=c."id" AND c."deletedAt" IS NOT NULL AND u."active"=TRUE')`,
  `    // Release credentials from past withdrawals while retaining the customer,
    // appointments, payments, points, and other business history.
    await prisma.$executeRawUnsafe(\`UPDATE "AppUser" u
      SET "active"=FALSE,
          "email"='withdrawn+' || u."id" || '@customer.salon-de-lien.local',
          "loginId"=NULL,
          "passwordHash"=NULL,
          "updatedAt"=NOW()
      FROM "Customer" c
      WHERE u."customerId"=c."id" AND c."deletedAt" IS NOT NULL AND u."role"='CUSTOMER'
        AND (u."active"=TRUE OR u."loginId" IS NOT NULL OR u."passwordHash" IS NOT NULL
          OR u."email" <> 'withdrawn+' || u."id" || '@customer.salon-de-lien.local')\`)
    await prisma.$executeRawUnsafe(\`DELETE FROM "CustomerPhoneIdentity" p USING "Customer" c
      WHERE p."customerId"=c."id" AND c."deletedAt" IS NOT NULL\`)`,
  "legacy withdrawn credential cleanup",
);

service = replaceOnce(
  service,
  `      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE, "updatedAt"=NOW() WHERE "customerId"=$1', row.customerId)`,
  `      await tx.$executeRawUnsafe(\`UPDATE "AppUser"
        SET "active"=FALSE,
            "email"='withdrawn+' || "id" || '@customer.salon-de-lien.local',
            "loginId"=NULL,
            "passwordHash"=NULL,
            "updatedAt"=NOW()
        WHERE "customerId"=$1 AND "role"='CUSTOMER'\`, row.customerId)
      await tx.$executeRawUnsafe('DELETE FROM "CustomerPhoneIdentity" WHERE "customerId"=$1', row.customerId)`,
  "withdrawal credential release",
);

fs.writeFileSync(servicePath, service);
console.log("customer withdrawal re-registration v410 patched");
