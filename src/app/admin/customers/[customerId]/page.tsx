import CustomerDetailPage from "@/app/customers/[id]/page";

type AdminCustomerDetailPageProps = {
  params: {
    customerId: string;
  };
  searchParams?: {
    suggestionId?: string;
  };
};

export default async function AdminCustomerDetailPage({ params, searchParams }: AdminCustomerDetailPageProps) {
  return CustomerDetailPage({
    params: {
      id: params.customerId
    },
    searchParams
  });
}

