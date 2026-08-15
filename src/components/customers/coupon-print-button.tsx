"use client";

import { Printer } from "lucide-react";
import { useTransition } from "react";

export function CouponPrintButton({ markPrintedAction }: { markPrintedAction: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markPrintedAction();
          window.print();
        });
      }}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900 disabled:cursor-wait disabled:opacity-70 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {isPending ? "印刷準備中" : "印刷する"}
    </button>
  );
}
