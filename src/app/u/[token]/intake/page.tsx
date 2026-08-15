import { notFound } from "next/navigation";
import { CustomerRegistrationLinkPage } from "@/components/customer-app/customer-registration-link-page";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserIntakePageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    source?: string;
    campaign?: string;
    referrer?: string;
    referrerName?: string;
  };
};

export default async function UserIntakePage({ params, searchParams }: UserIntakePageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  const customer = await prisma.customer.findFirst({
    where: {
      id: portal.customerId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!customer) {
    notFound();
  }

  return (
    <CustomerRegistrationLinkPage searchParams={{
      ...searchParams,
      referrer: customer.id,
      referrerName: customer.name
    }} />
  );
}
