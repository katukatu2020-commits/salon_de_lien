import CarePlanPage from "@/app/care/[id]/page";
import { notFound } from "next/navigation";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserCarePageProps = {
  params: {
    token: string;
  };
};

export default async function UserCarePage({ params }: UserCarePageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  return CarePlanPage({
    params: {
      id: portal.customerId
    },
    searchParams: {
      inApp: "1"
    },
    portalToken: params.token
  });
}
