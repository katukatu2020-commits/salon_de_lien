import { notFound } from "next/navigation";
import ProductReviewPage from "@/app/review/product/[token]/page";
import { hashProductReviewToken } from "@/lib/products/product-review";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserProductReviewPageProps = {
  params: {
    token: string;
    reviewToken: string;
  };
};

export default async function UserProductReviewPage({ params }: UserProductReviewPageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  const reviewRequest = await prisma.productReviewRequest.findUnique({
    where: {
      tokenHash: hashProductReviewToken(params.reviewToken)
    },
    select: {
      productProposal: {
        select: {
          customerId: true
        }
      }
    }
  });

  if (!reviewRequest || reviewRequest.productProposal.customerId !== portal.customerId) {
    notFound();
  }

  return ProductReviewPage({
    params: {
      token: params.reviewToken
    },
    searchParams: {
      inApp: "1"
    },
    portalToken: params.token
  });
}
