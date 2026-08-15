import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const loginIds = ["tanizaki", "watanabe", "asano", "kobayashi", "kaori"];

try {
  const accounts = await prisma.appUser.findMany({
    where: { loginId: { in: loginIds } },
    select: {
      loginId: true,
      displayName: true,
      email: true,
      passwordHash: true,
      role: true
    },
    orderBy: { loginId: "asc" }
  });
  if (accounts.length !== loginIds.length || accounts.some((account) => !account.passwordHash)) {
    throw new Error("Local staff accounts are incomplete");
  }
  const asciiJson = JSON.stringify(accounts).replace(/[\u007f-\uffff]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  process.stdout.write(asciiJson);
} finally {
  await prisma.$disconnect();
}
