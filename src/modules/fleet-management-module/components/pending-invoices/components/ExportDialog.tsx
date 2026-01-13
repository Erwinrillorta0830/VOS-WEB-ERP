// modules/fleet-management-module/components/pending-invoices/components/ExportDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PendingInvoiceOptions, PendingStatus } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, endOfMonth, endOfYear, format, startOfMonth, startOfYear, subDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Preset = "Yesterday" | "Today" | "Tomorrow" | "This Week" | "This Month" | "This Year" | "Custom";

function yyyyMMdd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ExportDialog({
  open,
  onClose,
  options,
}: {
  open: boolean;
  onClose: () => void;
  options: PendingInvoiceOptions | null;
}) {
  const [salesmanId, setSalesmanId] = React.useState<string>("All");
  const [customerCode, setCustomerCode] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");
  const [preset, setPreset] = React.useState<Preset>("This Month");

  const [dateFrom, setDateFrom] = React.useState<string>(() => yyyyMMdd(startOfMonth(new Date())));
  const [dateTo, setDateTo] = React.useState<string>(() => yyyyMMdd(endOfMonth(new Date())));

  const [formatType, setFormatType] = React.useState<"PDF" | "Excel">("PDF");
  const [paper, setPaper] = React.useState<"a4" | "letter" | "legal">("a4");

  React.useEffect(() => {
    const now = new Date();
    if (preset === "Yesterday") {
      setDateFrom(yyyyMMdd(subDays(now, 1)));
      setDateTo(yyyyMMdd(subDays(now, 1)));
    } else if (preset === "Today") {
      setDateFrom(yyyyMMdd(now));
      setDateTo(yyyyMMdd(now));
    } else if (preset === "Tomorrow") {
      setDateFrom(yyyyMMdd(addDays(now, 1)));
      setDateTo(yyyyMMdd(addDays(now, 1)));
    } else if (preset === "This Month") {
      setDateFrom(yyyyMMdd(startOfMonth(now)));
      setDateTo(yyyyMMdd(endOfMonth(now)));
    } else if (preset === "This Year") {
      setDateFrom(yyyyMMdd(startOfYear(now)));
      setDateTo(yyyyMMdd(endOfYear(now)));
    } else if (preset === "This Week") {
      // lightweight week window (today-3 to today+3); adjust if you need ISO week.
      setDateFrom(yyyyMMdd(subDays(now, 3)));
      setDateTo(yyyyMMdd(addDays(now, 3)));
    }
  }, [preset]);

  async function loadItemizedRows() {
    const p = new URLSearchParams();
    p.set("status", status);
    p.set("salesmanId", salesmanId);
    p.set("customerCode", customerCode);
    p.set("dateFrom", dateFrom);
    p.set("dateTo", dateTo);

    const res = await fetch(`/api/pending-invoices/itemized?${p.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load itemized rows for export");
    const json = await res.json();
    return (json.rows ?? []) as any[];
  }

  async function exportPdf() {
    const rows = await loadItemizedRows();

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: paper });

    doc.setFontSize(14);
    doc.text("Pending Invoice Report", 40, 40);

    doc.setFontSize(10);
    doc.text(
      `Filters: Salesman=${salesmanId}, Customer=${customerCode}, Status=${status}, Range=${dateFrom} to ${dateTo}`,
      40,
      58
    );

    const body = rows.map((r) => [
      r.invoice_no,
      r.dispatch_date ?? "",
      r.customer ?? "",
      r.salesman ?? "",
      r.dispatch_plan && r.dispatch_plan !== "unlinked" ? r.dispatch_plan : "",
      r.status ?? "",
      r.product_name ?? "",
      r.product_unit ?? "",
      r.product_quantity ?? 0,
      money(Number(r.product_net_amount ?? 0)),
    ]);

    autoTable(doc, {
      startY: 80,
      head: [[
        "Invoice No",
        "Date",
        "Customer",
        "Salesman",
        "Dispatch Plan",
        "Status",
        "Product",
        "Unit",
        "Qty",
        "Net",
      ]],
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20 },
      theme: "grid",
      columnStyles: {
        8: { halign: "right" },
        9: { halign: "right" },
      },
    });

    const total = rows.reduce((sum, r) => sum + Number(r.product_net_amount ?? 0), 0);
    doc.setFontSize(10);
    doc.text(`Total: ${money(total)}`, 40, doc.internal.pageSize.getHeight() - 30);

    doc.save(`pending-invoices-${dateFrom}-to-${dateTo}.pdf`);
  }

  async function exportExcel() {
    const rows = await loadItemizedRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PendingInvoices");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `pending-invoices-${dateFrom}-to-${dateTo}.xlsx`);
  }

  async function handleExport() {
    if (formatType === "PDF") return exportPdf();
    return exportExcel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle>What needs to be printed?</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">SALESMAN</div>
            <Select value={salesmanId} onValueChange={setSalesmanId}>
              <SelectTrigger><SelectValue placeholder="All Salesmen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Salesmen</SelectItem>
                {(options?.salesmen ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">CUSTOMER</div>
            <Select value={customerCode} onValueChange={setCustomerCode}>
              <SelectTrigger><SelectValue placeholder="All Customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Customers</SelectItem>
                {(options?.customers ?? []).map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground">STATUS</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                {["All", "Unlinked", "For Dispatch", "Inbound", "Cleared"].map((s) => (
                  <SelectItem key={s} value={s}>{s === "All" ? "All Statuses (Full Matrix)" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              If a specific status is selected, only that set will be exported.
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground">DATE RANGE</div>
            <div className="flex flex-wrap gap-2">
              {(["Yesterday", "Today", "Tomorrow", "This Week", "This Month", "This Year", "Custom"] as Preset[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={preset === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset(p)}
                >
                  {p}
                </Button>
              ))}
            </div>

            {preset === "Custom" && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 pt-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">From</div>
                  <input className="w-full rounded-md border px-3 py-2 text-sm" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">To</div>
                  <input className="w-full rounded-md border px-3 py-2 text-sm" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">FORMAT</div>
            <Select value={formatType} onValueChange={(v) => setFormatType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="Excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">PAPER SIZE</div>
            <Select value={paper} onValueChange={(v) => setPaper(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">Export is portrait.</div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport}>Print Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
