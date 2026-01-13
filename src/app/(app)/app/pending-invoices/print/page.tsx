// src/app/pending-invoices/print/page.tsx
import PrintPendingInvoicesPage from "@/modules/pending-invoices/PrintPendingInvoicesPage";

export default function Page({ searchParams }: { searchParams: Record<string, any> }) {
  return <PrintPendingInvoicesPage searchParams={searchParams} />;
}
