"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
// ✅ FIX: Restored Button import for Pagination
import { Button } from "@/components/ui/button"; 

import type { FiltersState } from "./types";
import { usePendingInvoices } from "./hooks/usePendingInvoices";
import { usePendingInvoiceOptions } from "./hooks/usePendingInvoiceOptions";

import { DashboardCards } from "./components/DashboardCards";
import { StatusCharts } from "./components/StatusCharts";
import { FiltersBar } from "./components/FiltersBar";
import { PendingInvoicesTable } from "./components/PendingInvoicesTable";
import { ExportDialog } from "./components/ExportDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";

export default function PendingInvoicesModule() {
  const [filters, setFilters] = React.useState<FiltersState>({
    q: "",
    status: "All",
    salesmanId: "All",
    customerCode: "All",
    page: 1,
    pageSize: 25,
  });

  const { data, loading, error } = usePendingInvoices(filters);
  const { data: options } = usePendingInvoiceOptions();

  const [exportOpen, setExportOpen] = React.useState(false);
  const [detailsInvoiceNo, setDetailsInvoiceNo] = React.useState<string | null>(null);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="text-2xl font-bold tracking-tight">Pending Invoice Monitoring Dashboard</div>
        <div className="text-sm text-muted-foreground mt-1">Track undelivered and uncleared printed receipts</div>
      </div>

      {data?.kpis && <DashboardCards kpis={data.kpis} />}

      {data?.kpis && <StatusCharts kpis={data.kpis} />}

      <Card className="shadow-sm border-slate-200">
        
        {/* Added 'pt-6' to top padding since header is gone */}
        <CardContent className="p-6 space-y-4">
          
          <FiltersBar 
            filters={filters} 
            setFilters={setFilters} 
            options={options} 
            onExport={() => setExportOpen(true)} 
          />

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
          {loading && <div className="text-sm text-muted-foreground py-4 text-center">Loading data...</div>}

          {!loading && data && (
            <>
              <PendingInvoicesTable rows={data.rows} onOpenInvoice={(inv) => setDetailsInvoiceNo(inv)} />

              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground border-t mt-4">
                <div>
                  Showing <span className="font-medium text-foreground">{data.rows.length}</span> of{" "}
                  <span className="font-medium text-foreground">{data.total}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page * filters.pageSize >= data.total}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExportDialog 
          open={exportOpen} 
          onClose={() => setExportOpen(false)} 
          options={options} 
      />

      <InvoiceDetailsDialog
        open={!!detailsInvoiceNo}
        invoiceNo={detailsInvoiceNo}
        onClose={() => setDetailsInvoiceNo(null)}
      />
    </div>
  );
}