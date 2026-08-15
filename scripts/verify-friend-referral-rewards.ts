import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import {
  applyReferralCheckoutDiscountInTransaction,
  completeReferralFirstVisitInTransaction
} from "../src/lib/points/point-service";

const ROLLBACK_MARKER = "__ROLLBACK_REFERRAL_REWARD_VERIFICATION__";

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.findFirstOrThrow({ select: { id: true } });
        const referrer = await tx.customer.create({
          data: {
            organizationId: organization.id,
            name: "紹介報酬検証・紹介者",
            pointAccount: { create: {} }
          },
          select: { id: true }
        });
        const referredCustomer = await tx.customer.create({
          data: {
            organizationId: organization.id,
            name: "紹介報酬検証・紹介された方",
            referredByCustomerId: referrer.id,
            pointAccount: { create: {} }
          },
          select: { id: true }
        });
        const nonce = `${Date.now()}-${Math.random()}`;
        await tx.referral.create({
          data: {
            referrerCustomerId: referrer.id,
            referredCustomerId: referredCustomer.id,
            tokenHash: `verification-${nonce}`,
            code: `VERIFY-${nonce}`,
            status: "registered"
          }
        });
        const referredDiscount = await applyReferralCheckoutDiscountInTransaction(
          tx,
          referredCustomer.id,
          5_000
        );
        await tx.serviceSale.create({
          data: {
            customerId: referredCustomer.id,
            title: "紹介初回会計の検証",
            amount: 5_000 - referredDiscount.amount
          }
        });

        const first = await completeReferralFirstVisitInTransaction(tx, referredCustomer.id);
        const retry = await completeReferralFirstVisitInTransaction(tx, referredCustomer.id);
        const referredRetryDiscount = await applyReferralCheckoutDiscountInTransaction(
          tx,
          referredCustomer.id,
          5_000
        );
        const referrerDiscount = await applyReferralCheckoutDiscountInTransaction(
          tx,
          referrer.id,
          5_000
        );
        const referrerRetryDiscount = await applyReferralCheckoutDiscountInTransaction(
          tx,
          referrer.id,
          5_000
        );
        const referrerAccount = await tx.customerPointAccount.findUniqueOrThrow({
          where: { customerId: referrer.id }
        });
        const referredAccount = await tx.customerPointAccount.findUniqueOrThrow({
          where: { customerId: referredCustomer.id }
        });
        const transactions = await tx.pointTransaction.findMany({
          where: { customerId: { in: [referrer.id, referredCustomer.id] } },
          select: { customerId: true, amount: true, sourceType: true }
        });

        assert.equal(referredDiscount.discount?.rate, 20);
        assert.equal(referredDiscount.amount, 1_000);
        assert.equal(first.referrerAwardedPoints, 0);
        assert.equal(first.referredAwardedPoints, 0);
        assert.equal(retry.awardedPoints, 0);
        assert.equal(referredRetryDiscount.amount, 0);
        assert.equal(referrerDiscount.discount?.rate, 15);
        assert.equal(referrerDiscount.amount, 750);
        assert.equal(referrerRetryDiscount.amount, 0);
        assert.equal(referrerAccount.availablePoints, 0);
        assert.equal(referredAccount.availablePoints, 0);
        assert.equal(transactions.length, 0);

        console.log(JSON.stringify({ referredDiscount, first, retry, referrerDiscount, balances: {
          referrer: referrerAccount.availablePoints,
          referredCustomer: referredAccount.availablePoints
        }, transactions }, null, 2));

        throw new Error(ROLLBACK_MARKER);
      },
      { timeout: 15_000 }
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_MARKER) throw error;
    console.log("Verification data was rolled back successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
