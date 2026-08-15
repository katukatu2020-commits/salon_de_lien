import { AlertTriangle } from "lucide-react";

export function CouponFieldWarning({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        表示調整の確認
      </div>
      <ul className="mt-2 grid gap-1">
        {warnings.map((warning) => (
          <li key={warning}>・{warning}</li>
        ))}
      </ul>
    </div>
  );
}
