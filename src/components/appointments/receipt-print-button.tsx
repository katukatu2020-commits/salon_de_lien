"use client";

import { Printer } from "lucide-react";

export function ReceiptPrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2f2a25] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#171411] ${className}`}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      mC-Print3で印刷
    </button>
  );
}
