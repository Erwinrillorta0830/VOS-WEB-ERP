"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

import { usePendingInvoices } from "./hooks/usePendingInvoices";
import { PendingInvoiceCharts } from "./components/PendingInvoiceCharts";
import { PendingInvoiceFilters } from "./components/PendingInvoiceFilters";
import { PendingInvoiceTable } from "./components/PendingInvoiceTable";
import { buildPendingInvoiceColumns } from "./components/PendingInvoiceColumns";
import { ExportReportDialog } from "./components/ExportReportDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function statusCardColor(key: "total" | "unlinked" | "forDispatch" | "inbound" | "cleared") {
  switch (key) {
    case "total": return "bg-blue-50 text-blue-700";
    case "unlinked": return "bg-slate-50 text-slate-700";
    case "forDispatch": return "bg-blue-50 text-blue-700";
    case "inbound": return "bg-orange-50 text-orange-700";
    case "cleared": return "bg-green-50 text-green-700";
  }
}

export default function PendingInvoicesModule() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filters, setFilters] = useState({
    search: "",
    status: "all" as const,
    salesmanId: "all",
    customerCode: "all",
    dateFrom: "",
    dateTo: "",
  });

  const { data, loading, error } = usePendingInvoices(page, limit, filters);

  const [exportOpen, setExportOpen] = useState(false);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [activeInvoiceNo, setActiveInvoiceNo] = useState<string | null>(null);

  const columns = useMemo(() => buildPendingInvoiceColumns({
    onOpenInvoice: (inv) => {
      setActiveInvoiceNo(inv);
      setInvoiceOpen(true);
    }
  }), []);

  const overallTotal = data?.aggregations?.totalAmount ?? 0;

  const handleFilterChange = (key: string, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };

  const handlePrint = () => {
    // Minimal “print current filtered result set”
    // You can later expand to a full matrix print page.
    window.print();
    setExportOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Pending Invoice Monitoring Dashboard</h2>
          <p className="text-slate-500">Track undelivered and uncleared printed receipts</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Total Pending Invoices</div>
              <div className="text-3xl font-bold text-blue-700">{data?.kpis?.totalPending ?? (loading ? "…" : 0)}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusCardColor("total")}`} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Unlinked</div>
              <div className="text-3xl font-bold text-slate-800">{data?.kpis?.unlinked ?? (loading ? "…" : 0)}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusCardColor("unlinked")}`} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">For Dispatch</div>
              <div className="text-3xl font-bold text-blue-700">{data?.kpis?.forDispatch ?? (loading ? "…" : 0)}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusCardColor("forDispatch")}`} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Inbound</div>
              <div className="text-3xl font-bold text-orange-600">{data?.kpis?.inbound ?? (loading ? "…" : 0)}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusCardColor("inbound")}`} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Cleared</div>
              <div className="text-3xl font-bold text-green-700">{data?.kpis?.cleared ?? (loading ? "…" : 0)}</div>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusCardColor("cleared")}`} />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <PendingInvoiceCharts
        statusCounts={data?.aggregations?.statusCounts || []}
        statusAmounts={data?.aggregations?.statusAmounts || []}
        totalAmount={data?.aggregations?.totalAmount || 0}
        loading={loading}
      />

      {/* Filters + Table */}
      <div className="bg-white border rounded-lg shadow-sm pb-4">
        <PendingInvoiceFilters
          search={filters.search}
          status={filters.status}
          salesmanId={filters.salesmanId}
          customerCode={filters.customerCode}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={handleFilterChange}
        />
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="p-4">
          <PendingInvoiceTable
            columns={columns}
            data={data?.data || []}
            loading={loading}
          />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 rounded-b-lg">
          <div className="text-sm text-slate-500">
            {data
              ? `Showing ${((page - 1) * limit) + 1} to ${Math.min(page * limit, data.meta.total)} of ${data.meta.total} results`
              : "Loading..."}
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <div className="px-4 py-1 rounded border bg-white font-mono text-sm shadow-sm">{page}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || page >= data.meta.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed Footer Total */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-3 px-6 text-sm font-semibold text-slate-800 shadow-lg z-10 flex justify-center">
        Overall Total:&nbsp;
        <span className="font-mono text-slate-900">${money(overallTotal)}</span>
      </div>

      {/* Dialogs (with DialogTitle included in each) */}
      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} onPrint={handlePrint} />

      <InvoiceDetailsDialog
        open={invoiceOpen}
        onOpenChange={(v) => {
          setInvoiceOpen(v);
          if (!v) setActiveInvoiceNo(null);
        }}
        invoiceNo={activeInvoiceNo}
      />
    </div>
  );
}
