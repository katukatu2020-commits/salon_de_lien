import FeedbackPage from "@/app/feedback/[id]/page";
import { notFound } from "next/navigation";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserFeedbackPageProps = {
  params: {
    token: string;
  };
};

export default async function UserFeedbackPage({ params }: UserFeedbackPageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  return FeedbackPage({
    params: {
      id: portal.customerId
    },
    searchParams: {
      inApp: "1"
    },
    portalToken: params.token
  });
}
