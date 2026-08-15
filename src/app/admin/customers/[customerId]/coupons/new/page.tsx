import { redirect } from "next/navigation";

type RemovedAdminCouponPageProps = {
  params: {
    customerId: string;
  };
};

export default function RemovedAdminCouponPage({ params }: RemovedAdminCouponPageProps) {
  redirect(`/admin/customers/${params.customerId}`);
}
