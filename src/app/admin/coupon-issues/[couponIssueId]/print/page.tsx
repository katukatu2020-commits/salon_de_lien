import CouponIssuePrintPage from "@/app/customers/[id]/coupon/print/[couponIssueId]/page";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type AdminCouponIssuePrintPageProps = {
  params: {
    couponIssueId: string;
  };
};

export default async function AdminCouponIssuePrintPage({ params }: AdminCouponIssuePrintPageProps) {
  const issue = await prisma.couponIssue.findUnique({
    where: {
      id: params.couponIssueId
    },
    select: {
      customerId: true
    }
  });

  if (!issue) {
    notFound();
  }

  return CouponIssuePrintPage({
    params: {
      id: issue.customerId,
      couponIssueId: params.couponIssueId
    }
  });
}

