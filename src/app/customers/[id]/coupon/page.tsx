import { redirect } from "next/navigation";

type RemovedCustomerCouponPageProps = {
  params: {
    id: string;
  };
};

export default function RemovedCustomerCouponPage({ params }: RemovedCustomerCouponPageProps) {
  redirect(`/admin/customers/${params.id}`);
}
