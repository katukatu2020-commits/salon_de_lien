import CustomerPortalPage from "@/app/app/[id]/page";
import { notFound } from "next/navigation";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserPortalPageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    feedback?: string;
    reviewPoints?: string;
    pointExpiresAt?: string;
  };
};

export default async function UserPortalPage({ params, searchParams }: UserPortalPageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  return CustomerPortalPage({
    params: {
      id: portal.customerId
    },
    searchParams,
    portalToken: params.token
  });
}
