"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { PendingInvoiceRow } from "../types";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function badgeClass(status: PendingInvoiceRow["status"]) {
  switch (status) {
    case "Unlinked": return "bg-slate-100 text-slate-700 border-slate-200";
    case "For Dispatch": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Inbound": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Cleared": return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function buildPendingInvoiceColumns(params: {
  onOpenInvoice: (invoiceNo: string) => void;
}): ColumnDef<PendingInvoiceRow>[] {
  const { onOpenInvoice } = params;

  return [
    {
      accessorKey: "invoice_no",
      header: "INVOICE NO",
      cell: ({ row }) => {
        const inv = row.getValue("invoice_no") as string;
        return (
          <button
            type="button"
            onClick={() => onOpenInvoice(inv)}
            className="text-blue-600 hover:underline font-semibold"
          >
            {inv}
          </button>
        );
      },
    },
    {
      accessorKey: "invoice_date",
      header: "INVOICE DATE",
      cell: ({ row }) => <div className="text-slate-700">{String(row.getValue("invoice_date") ?? "-")}</div>,
    },
    {
      accessorKey: "customer",
      header: "CUSTOMER",
      cell: ({ row }) => <div className="font-medium text-slate-800">{String(row.getValue("customer") ?? "-")}</div>,
    },
    {
      accessorKey: "salesman",
      header: "SALESMAN",
      cell: ({ row }) => <div className="text-slate-700">{String(row.getValue("salesman") ?? "-")}</div>,
    },
    {
      accessorKey: "net_amount",
      header: () => <div className="text-right">NET AMOUNT</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold text-slate-900">
          ${money(Number(row.getValue("net_amount") || 0))}
        </div>
      ),
    },
    {
      accessorKey: "dispatch_plan",
      header: "DISPATCH PLAN",
      cell: ({ row }) => {
        const v = String(row.getValue("dispatch_plan") ?? "");
        return <div className="text-slate-700">{v === "unlinked" ? "—" : v}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => {
        const s = row.getValue("status") as PendingInvoiceRow["status"];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${badgeClass(s)}`}>
            {s}
          </span>
        );
      },
    },
  ];
}
