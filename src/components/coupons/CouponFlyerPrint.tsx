import { CouponFlyerPreview } from "@/components/coupons/CouponFlyerPreview";
import type { CouponIssueDisplayData } from "@/lib/coupons/coupon-validation";

export function CouponFlyerPrint({ issue }: { issue: CouponIssueDisplayData }) {
  return <CouponFlyerPreview issue={issue} />;
}
