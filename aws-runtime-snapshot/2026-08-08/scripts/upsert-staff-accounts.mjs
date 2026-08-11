import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien";

function loadAccounts() {
  const raw = process.env.STAFF_ACCOUNTS_JSON;
  if (!raw) {
    throw new Error("STAFF_ACCOUNTS_JSON is required");
  }

  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("STAFF_ACCOUNTS_JSON must be a non-empty array");
  }

  return accounts.map((account) => {
    const role = account.role === "ADMIN" ? "ADMIN" : "STAFF";
    if (
      typeof account.loginId !== "string" ||
      !/^[a-z0-9._-]{4,40}$/i.test(account.loginId) ||
      typeof account.email !== "string" ||
      !account.email.includes("@") ||
      typeof account.displayName !== "string" ||
      account.displayName.trim().length === 0 ||
      typeof account.passwordHash !== "string" ||
      !account.passwordHash.startsWith("scrypt$")
    ) {
      throw new Error(`Invalid staff account payload for ${String(account.loginId ?? "unknown")}`);
    }

    return {
      loginId: account.loginId.trim().toLowerCase(),
      email: account.email.trim().toLowerCase(),
      displayName: account.displayName.trim(),
      passwordHash: account.passwordHash,
      role
    };
  });
}

async function main() {
  const accounts = loadAccounts();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });
  if (!organization) throw new Error(`Organization not found: ${organizationId}`);

  for (const account of accounts) {
    const matches = await prisma.appUser.findMany({
      where: {
        OR: [
          { loginId: { equals: account.loginId, mode: "insensitive" } },
          { email: { equals: account.email, mode: "insensitive" } }
        ]
      },
      select: { id: true }
    });
    if (matches.length > 1) {
      throw new Error(`Conflicting users found for ${account.loginId}`);
    }

    if (matches[0]) {
      await prisma.appUser.update({
        where: { id: matches[0].id },
        data: {
          organizationId,
          loginId: account.loginId,
          email: account.email,
          displayName: account.displayName,
          passwordHash: account.passwordHash,
          role: account.role,
          active: true
        }
      });
    } else {
      await prisma.appUser.create({
        data: {
          organizationId,
          loginId: account.loginId,
          email: account.email,
          displayName: account.displayName,
          passwordHash: account.passwordHash,
          role: account.role,
          active: true
        }
      });
    }

    process.stdout.write(`upserted ${account.loginId} (${account.role})\n`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
