// modules/fleet-management-module/components/pending-invoices/components/PendingInvoicesTable.tsx
"use client";

import * as React from "react";
import type { PendingInvoiceRow } from "../types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: PendingInvoiceRow["pending_status"] }) {
  const map: Record<string, string> = {
    Unlinked: "bg-muted text-foreground border",
    "For Dispatch": "bg-blue-50 text-blue-700 border-blue-200",
    Inbound: "bg-orange-50 text-orange-700 border-orange-200",
    Cleared: "bg-green-50 text-green-700 border-green-200",
  };
  return <Badge variant="outline" className={map[status]}>{status}</Badge>;
}

export function PendingInvoicesTable({
  rows,
  onOpenInvoice,
}: {
  rows: PendingInvoiceRow[];
  onOpenInvoice: (invoiceNo: string) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">INVOICE NO</TableHead>
            <TableHead className="w-[170px]">INVOICE DATE</TableHead>
            <TableHead>CUSTOMER</TableHead>
            <TableHead className="w-[220px]">SALESMAN</TableHead>
            <TableHead className="w-[160px] text-right">NET AMOUNT</TableHead>
            <TableHead className="w-[220px]">DISPATCH PLAN</TableHead>
            <TableHead className="w-[140px]">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.invoice_no}>
              <TableCell>
                <button
                  onClick={() => onOpenInvoice(r.invoice_no)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {r.invoice_no}
                </button>
              </TableCell>
              <TableCell>{r.invoice_date ?? "-"}</TableCell>
              <TableCell>{r.customer ?? "-"}</TableCell>
              <TableCell>{r.salesman ?? "-"}</TableCell>
              <TableCell className="text-right">{money(r.net_amount)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.dispatch_plan && r.dispatch_plan !== "unlinked" ? r.dispatch_plan : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.pending_status} />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
