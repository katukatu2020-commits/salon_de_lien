import { CustomerRegistrationLinkPage } from "@/components/customer-app/customer-registration-link-page";
import type { CustomerRegistrationSearchParams } from "@/components/customer-app/customer-registration-page";

export default function CustomerAppRegistrationPage({ searchParams }: { searchParams?: CustomerRegistrationSearchParams }) {
  return <CustomerRegistrationLinkPage searchParams={searchParams} />;
}
