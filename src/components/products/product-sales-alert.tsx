import { AlertTriangle } from "lucide-react";

type ProductSalesAlertProps = {
  recentPurchaseCount: number;
  compact?: boolean;
};

export function ProductSalesAlert({ recentPurchaseCount, compact = false }: ProductSalesAlertProps) {
  if (recentPurchaseCount > 0) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#e8a7a1] bg-[#fff3f1] font-semibold text-[#9f2d25] ${
        compact ? "gap-1.5 px-2 py-1 text-[11px]" : "gap-2 px-2.5 py-1.5 text-xs"
      }`}
      aria-label="販売停滞。直近90日の購入がありません"
      title="直近90日の購入がありません"
    >
      <span className="lien-sales-alert-lamp" aria-hidden="true">
        <AlertTriangle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
      </span>
      販売停滞
    </span>
  );
}
