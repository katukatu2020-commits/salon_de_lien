import CouponPrintPage from "@/app/customers/[id]/coupons/[couponId]/print/page";

type AdminLegacyCouponPrintPageProps = {
  params: {
    customerId: string;
    couponId: string;
  };
};

export default async function AdminLegacyCouponPrintPage({ params }: AdminLegacyCouponPrintPageProps) {
  return CouponPrintPage({
    params: {
      id: params.customerId,
      couponId: params.couponId
    }
  });
}

