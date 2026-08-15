import { notFound } from "next/navigation";
import ProposalPage from "@/app/proposals/[id]/page";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserProposalPageProps = {
  params: {
    token: string;
    proposalId: string;
  };
};

export default async function UserProposalPage({ params }: UserProposalPageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  const suggestion = await prisma.styleSuggestion.findUnique({
    where: { id: params.proposalId },
    select: {
      customerId: true,
      customer: {
        select: {
          deletedAt: true
        }
      }
    }
  });

  if (!suggestion || suggestion.customerId !== portal.customerId || suggestion.customer.deletedAt) {
    notFound();
  }

  return ProposalPage({
    params: {
      id: params.proposalId
    },
    searchParams: {
      inApp: "1"
    },
    portalToken: params.token
  });
}
