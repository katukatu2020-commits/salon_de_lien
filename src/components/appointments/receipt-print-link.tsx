import Link from "next/link";
import { Printer } from "lucide-react";

export function ReceiptPrintLink({ appointmentId, className = "" }: { appointmentId: string; className?: string }) {
  return (
    <Link
      href={`/admin/appointments/${appointmentId}/receipt`}
      target="_blank"
      rel="noreferrer"
      className={`lien-button-secondary ${className}`}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      レシートを印刷
    </Link>
  );
}
