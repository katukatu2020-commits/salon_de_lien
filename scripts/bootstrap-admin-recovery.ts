import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function deliverable(email?: string) {
  const value = email?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.endsWith(".local");
}

async function main() {
  const preferred = process.env.PASSWORD_RESET_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const gmail = process.env.GMAIL_RESERVATION_EMAIL?.trim().toLowerCase();
  const email = deliverable(preferred) ? preferred! : deliverable(configuredAdmin) ? configuredAdmin! : deliverable(gmail) ? gmail! : "";
  const passwordHash = (process.env.ADMIN_PASSWORD_HASH?.trim() || process.env.TEST_ADMIN_PASSWORD_HASH?.trim() || "")
    .replace(/\\\$/g, "$");
  const loginId = process.env.TEST_ADMIN_ID?.trim().toLowerCase() || null;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID?.trim() || "org_salon_de_lien";

  if (!email) throw new Error("PASSWORD_RESET_ADMIN_EMAILまたは実在する管理者メールを設定してください。");
  if (!passwordHash.startsWith("scrypt$")) throw new Error("管理者パスワードハッシュが未設定です。");

  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: { id: organizationId, slug: "salon-de-lien", name: "Salon de Lien" }
  });

  const existing = await prisma.appUser.findFirst({
    where: { organizationId, role: "ADMIN" },
    select: { id: true, email: true, loginId: true, passwordHash: true }
  });
  if (existing) {
    await prisma.appUser.update({
      where: { id: existing.id },
      data: {
        email: deliverable(existing.email) ? existing.email : email,
        loginId: existing.loginId || loginId,
        passwordHash: existing.passwordHash || passwordHash,
        active: true
      }
    });
  } else {
    await prisma.appUser.create({
      data: { organizationId, email, loginId, passwordHash, role: "ADMIN", active: true }
    });
  }
  console.log("Admin recovery account is ready.");
}

main().finally(() => prisma.$disconnect());
