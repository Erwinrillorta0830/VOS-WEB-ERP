// modules/fleet-management-module/components/pending-invoices/PendingInvoicesModule.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Pending Invoice Monitoring Dashboard</div>
        <div className="text-sm text-muted-foreground">Track undelivered and uncleared printed receipts</div>
      </div>

      {data?.kpis && <DashboardCards kpis={data.kpis} />}

      {data?.kpis && <StatusCharts kpis={data.kpis} />}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">Pending Invoice Monitoring</CardTitle>
          </div>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <FiltersBar filters={filters} setFilters={setFilters} options={options} />

          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

          {!loading && data && (
            <>
              <PendingInvoicesTable rows={data.rows} onOpenInvoice={(inv) => setDetailsInvoiceNo(inv)} />

              <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
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

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} options={options} />

      <InvoiceDetailsDialog
        open={!!detailsInvoiceNo}
        invoiceNo={detailsInvoiceNo}
        onClose={() => setDetailsInvoiceNo(null)}
      />
    </div>
  );
}
