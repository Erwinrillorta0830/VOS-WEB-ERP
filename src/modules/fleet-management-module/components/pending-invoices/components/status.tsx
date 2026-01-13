// src/modules/pending-invoices/components/status.tsx
import type { PendingStatus } from "../types";
import { cn } from "@/lib/utils";

export function statusPillClass(status: PendingStatus) {
  switch (status) {
    case "Unlinked":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "For Dispatch":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Inbound":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Cleared":
      return "bg-green-50 text-green-700 border-green-200";
  }
}

export function StatusPill({ status }: { status: PendingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold",
        statusPillClass(status)
      )}
    >
      {status}
    </span>
  );
}
