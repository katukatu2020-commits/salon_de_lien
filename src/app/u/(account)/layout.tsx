import { redirect } from "next/navigation";
import { CustomerAccountShell } from "@/components/customer-app/customer-account-shell";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";

export const dynamic = "force-dynamic";

export default async function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentCustomerSession();
  if (!session) redirect("/u/login");
  return <CustomerAccountShell customerName={session.customer.name}>{children}</CustomerAccountShell>;
}
