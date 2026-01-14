"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subDays, addDays, startOfYear, endOfYear } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import type { PendingInvoiceOptions } from "../types";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function yyyyMMdd(d: Date) { return format(d, "yyyy-MM-dd"); }
function money(n: number) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type Preset = "All Time" | "Yesterday" | "Today" | "Tomorrow" | "This Week" | "This Month" | "This Year" | "Custom";

export function ExportDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: PendingInvoiceOptions | null; }) {
  const [salesmanId, setSalesmanId] = React.useState<string>("All");
  const [customerCode, setCustomerCode] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");
  
  const [preset, setPreset] = React.useState<Preset>("All Time");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const [formatType, setFormatType] = React.useState<"PDF" | "Excel">("PDF");
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    const now = new Date();
    if (preset === "All Time") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "Yesterday") {
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
      setDateFrom(yyyyMMdd(subDays(now, 3)));
      setDateTo(yyyyMMdd(addDays(now, 3)));
    }
  }, [preset]);

  // ✅ UPDATED: Fetch from the MAIN list API (headers only), not itemized
  async function loadReportRows() {
    const p = new URLSearchParams();
    if (status !== "All") p.set("status", status);
    if (salesmanId !== "All") p.set("salesmanId", salesmanId);
    if (customerCode !== "All") p.set("customerCode", customerCode);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    
    // Ensure we get all rows for the report
    p.set("page", "1");
    p.set("pageSize", "100000");

    // Calling the main list API
    const res = await fetch(`/api/pending-invoices?${p.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch report data");
    const json = await res.json();
    
    return Array.isArray(json?.rows) ? json.rows : [];
  }

  async function handleExport() {
    try {
      setIsExporting(true);
      const rows = await loadReportRows();

      if (rows.length === 0) {
        alert("No data found for the selected criteria.");
        setIsExporting(false);
        return;
      }

      if (formatType === "Excel") {
        // ✅ UPDATED: Columns match the Dashboard Table
        const header = ["Invoice No", "Date", "Customer", "Salesman", "Net Amount", "Dispatch Plan", "Status"];
        const body = rows.map((r: any) => [
          r.invoice_no, 
          r.invoice_date, 
          r.customer, 
          r.salesman, 
          Number(r.net_amount),
          r.dispatch_plan === 'unlinked' ? '-' : r.dispatch_plan, 
          r.pending_status
        ]);
        
        const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
        
        // Auto-width columns for better visibility
        (ws as any)["!cols"] = [
            { wch: 15 }, // Invoice
            { wch: 12 }, // Date
            { wch: 30 }, // Customer
            { wch: 20 }, // Salesman
            { wch: 15 }, // Amount
            { wch: 20 }, // Plan
            { wch: 15 }, // Status
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PendingInvoices");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `PendingInvoices-${preset}.xlsx`);
      } else {
        // ✅ UPDATED: PDF Columns match the Dashboard Table
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }); // Landscape for better fit
        doc.setFontSize(14);
        doc.text("Pending Invoice Report", 40, 40);
        doc.setFontSize(10);
        
        const dateStr = preset === "All Time" ? "All Time" : `${dateFrom} to ${dateTo}`;
        doc.text(`Range: ${dateStr} | Status: ${status}`, 40, 55);

        const body = rows.map((r: any) => [
            r.invoice_no, 
            r.invoice_date,
            String(r.customer ?? "").substring(0, 30), // Truncate long names
            String(r.salesman ?? "").substring(0, 20),
            money(r.net_amount),
            r.dispatch_plan === 'unlinked' ? '-' : r.dispatch_plan,
            r.pending_status
        ]);

        autoTable(doc, {
            startY: 70,
            head: [["Invoice No", "Date", "Customer", "Salesman", "Net Amount", "Plan", "Status"]],
            body: body,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [20, 20, 20] }, // Black header
            columnStyles: {
                4: { halign: 'right' }, // Right align amount
            }
        });
        doc.save(`PendingInvoices-${preset}.pdf`);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  }

  // --- Render (No changes needed here) ---
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[700px] p-0 overflow-hidden gap-0 bg-white">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold text-slate-900">What needs to be printed?</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">Filters select the criteria for the printed report.</p>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Salesman</label>
                <Select value={salesmanId} onValueChange={setSalesmanId}>
                    <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Salesmen</SelectItem>
                        {options?.salesmen?.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Customer</label>
                <Select value={customerCode} onValueChange={setCustomerCode}>
                    <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Customers</SelectItem>
                        {options?.customers?.map((c) => (<SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {["All", "Unlinked", "For Dispatch", "Inbound", "Cleared"].map(s => (
                            <SelectItem key={s} value={s}>{s === "All" ? "All Statuses (Full Matrix)" : s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Date Range</label>
                <div className="flex flex-wrap gap-2">
                    {["All Time", "Today", "Tomorrow", "This Week", "This Month", "This Year", "Custom"].map(p => (
                        <Button 
                            key={p} 
                            variant={preset === p ? "default" : "outline"} 
                            onClick={() => setPreset(p as Preset)}
                            className={preset === p ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-white border-slate-200 text-slate-600"}
                            size="sm"
                        >
                            {p}
                        </Button>
                    ))}
                </div>
                {preset === "Custom" && (
                     <div className="flex gap-4 pt-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border p-2 rounded text-sm" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border p-2 rounded text-sm" />
                     </div>
                )}
            </div>
            <div className="md:col-span-2 space-y-2">
                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Format</label>
                 <div className="flex gap-4">
                     <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={formatType === "PDF"} onChange={() => setFormatType("PDF")} /> PDF</label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={formatType === "Excel"} onChange={() => setFormatType("Excel")} /> Excel</label>
                 </div>
            </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300">Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 min-w-[140px]">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}