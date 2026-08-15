import { prisma } from "../src/lib/prisma";

async function main() {
  const now = new Date();
  const accounts = await prisma.customerPointAccount.findMany({
    select: {
      id: true,
      customerId: true,
      availablePoints: true,
      transactions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { balanceAfter: true }
      }
    }
  });

  const lots = await prisma.pointLot.groupBy({
    by: ["customerId"],
    where: { remainingAmount: { gt: 0 }, expiresAt: { gt: now } },
    _sum: { remainingAmount: true }
  });
  const lotBalanceByCustomer = new Map(
    lots.map((lot) => [lot.customerId, lot._sum.remainingAmount ?? 0])
  );

  const mismatches = accounts.flatMap((account) => {
    const lotBalance = lotBalanceByCustomer.get(account.customerId) ?? 0;
    const latestLedgerBalance = account.transactions[0]?.balanceAfter ?? 0;
    if (account.availablePoints === lotBalance && account.availablePoints === latestLedgerBalance) {
      return [];
    }
    return [{
      accountId: account.id,
      customerId: account.customerId,
      cachedBalance: account.availablePoints,
      activeLotBalance: lotBalance,
      latestLedgerBalance
    }];
  });

  console.log(JSON.stringify({
    checkedAt: now.toISOString(),
    accountCount: accounts.length,
    mismatchCount: mismatches.length,
    mismatches
  }, null, 2));

  if (mismatches.length > 0) process.exitCode = 1;
}

main().finally(async () => {
  await prisma.$disconnect();
});
