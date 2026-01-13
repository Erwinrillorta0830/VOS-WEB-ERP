// src/app/(app)/app/pending-invoices/page.tsx
import PendingInvoicesModule from "@/modules/fleet-management-module/components/pending-invoices/PendingInvoicesModule";

export default function Page() {
  return (
    <div className="p-4 md:p-6">
      <PendingInvoicesModule />
    </div>
  );
}
