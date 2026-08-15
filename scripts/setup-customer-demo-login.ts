import { PrismaClient } from "@prisma/client";
import { hashScryptPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();
const DEMO_ACCOUNTS = [
  {
    customerId: "owner-sim-customer-0014",
    loginId: "lien0014",
    password: "Lien3150!"
  },
  {
    customerId: "owner-sim-customer-0001",
    loginId: "lien0001",
    password: "Lien2026!"
  }
] as const;

async function main() {
  if (process.env.APP_ENV === "production") {
    throw new Error("本番環境ではデモ顧客ログインを作成できません。");
  }

  const issued = [];
  for (const account of DEMO_ACCOUNTS) {
    if (account.password.length < 8) throw new Error(`${account.loginId} のパスワードは8文字以上必要です。`);

    const customer = await prisma.customer.findFirst({
      where: { id: account.customerId, deletedAt: null },
      select: { id: true, name: true, organizationId: true }
    });
    if (!customer) throw new Error(`確認用顧客が見つかりません: ${account.customerId}`);

    const passwordHash = hashScryptPassword(account.password);
    await prisma.appUser.upsert({
      where: { customerId: customer.id },
      update: {
        organizationId: customer.organizationId,
        loginId: account.loginId,
        email: `${account.loginId}@customer.salon-de-lien.local`,
        passwordHash,
        role: "CUSTOMER",
        active: true
      },
      create: {
        organizationId: customer.organizationId,
        customerId: customer.id,
        loginId: account.loginId,
        email: `${account.loginId}@customer.salon-de-lien.local`,
        passwordHash,
        role: "CUSTOMER",
        active: true
      }
    });

    issued.push({ customer: customer.name, loginId: account.loginId, password: account.password, url: "/u/login" });
  }

  console.log(JSON.stringify(issued, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
