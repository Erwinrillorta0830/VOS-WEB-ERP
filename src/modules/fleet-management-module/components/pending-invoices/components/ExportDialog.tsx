// modules/fleet-management-module/components/pending-invoices/components/ExportDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PendingInvoiceOptions } from "../types";
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
  const x = Number(n ?? 0);
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type ExportRow = {
  invoice_no: string;
  dispatch_date: string;
  customer: string;
  salesman: string;
  dispatch_plan: string;
  status: string;
  product: string;
  unit: string;
  qty: number;
  net: number;
};
function dateOnly(v: unknown) {
  if (!v) return "";
  const s = String(v);
  // Fast path if already ISO string
  if (s.includes("T")) return s.split("T")[0];
  // If it's already YYYY-MM-DD, keep it
  return s;
}


function normalizeApiRows(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

function toExportRows(rows: any[]): ExportRow[] {
  return rows.map((r) => ({
    invoice_no: String(r.invoice_no ?? ""),
    dispatch_date: String(dateOnly(r.dispatch_date)),
    customer: String(r.customer ?? ""),
    salesman: String(r.salesman ?? ""),
    dispatch_plan: r.dispatch_plan && r.dispatch_plan !== "unlinked" ? String(r.dispatch_plan) : "",
    status: String(r.status ?? ""),
    product: String(r.product_name ?? ""),
    unit: String(r.product_unit ?? ""),
    qty: toNum(r.product_quantity),
    net: toNum(r.product_net_amount),
  }));
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
      // lightweight week window (today-3 to today+3)
      setDateFrom(yyyyMMdd(subDays(now, 3)));
      setDateTo(yyyyMMdd(addDays(now, 3)));
    }
  }, [preset]);
  
  async function loadItemizedRows(): Promise<ExportRow[]> {
    const p = new URLSearchParams();

    // ✅ IMPORTANT: only send filters when user selected a specific value
    if (status !== "All") p.set("status", status);
    if (salesmanId !== "All") p.set("salesmanId", salesmanId);
    if (customerCode !== "All") p.set("customerCode", customerCode);

    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);

    const url = `/api/pending-invoices/itemized?${p.toString()}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Failed to load itemized rows for export");
    }

    const json = await res.json();
    const rawRows = normalizeApiRows(json);
    return toExportRows(rawRows);
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

    const head = [[
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
    ]];

    const body =
      rows.length > 0
        ? rows.map((r) => [
            r.invoice_no,
            r.dispatch_date,
            r.customer,
            r.salesman,
            r.dispatch_plan,
            r.status,
            r.product,
            r.unit,
            r.qty ? String(r.qty) : "0",
            money(r.net),
          ])
        : [["No data found for the selected filters.", "", "", "", "", "", "", "", "", ""]];

    autoTable(doc, {
      startY: 80,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20 },
      theme: "grid",
      columnStyles: {
        8: { halign: "right" },
        9: { halign: "right" },
      },
    });

    const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.net) ? r.net : 0), 0);
    doc.setFontSize(10);
    doc.text(`Total: ${money(total)}`, 40, doc.internal.pageSize.getHeight() - 30);

    doc.save(`pending-invoices-${dateFrom}-to-${dateTo}.pdf`);
  }

  async function exportExcel() {
    const rows = await loadItemizedRows();

    const header = [
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
    ];

    const aoa: any[][] = [header];

    if (rows.length > 0) {
      for (const r of rows) {
        aoa.push([
          r.invoice_no,
          r.dispatch_date,
          r.customer,
          r.salesman,
          r.dispatch_plan,
          r.status,
          r.product,
          r.unit,
          r.qty,
          r.net,
        ]);
      }
    } else {
      aoa.push(["No data found for the selected filters.", "", "", "", "", "", "", "", "", 0]);
    }

    const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.net) ? r.net : 0), 0);
    aoa.push([]);
    aoa.push(["", "", "", "", "", "", "", "", "TOTAL", total]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // ✅ Make it readable (prevents “looks empty” issues)
    (ws as any)["!cols"] = [
      { wch: 14 }, // Invoice No
      { wch: 12 }, // Date
      { wch: 28 }, // Customer
      { wch: 20 }, // Salesman
      { wch: 18 }, // Dispatch Plan
      { wch: 14 }, // Status
      { wch: 34 }, // Product
      { wch: 10 }, // Unit
      { wch: 8 },  // Qty
      { wch: 12 }, // Net
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PendingInvoices");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `pending-invoices-${dateFrom}-to-${dateTo}.xlsx`
    );
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
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">To</div>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
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
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
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
