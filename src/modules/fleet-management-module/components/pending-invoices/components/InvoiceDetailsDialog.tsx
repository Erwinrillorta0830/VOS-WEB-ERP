// src/modules/pending-invoices/components/InvoiceDetailsDialog.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PendingInvoiceStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export type PendingInvoiceDetails = {
  header: {
    invoice_no: string;
    customer_name: string;
    customer_code: string;
    salesman: string;
    location: string;
    sales_type: string;
    receipt_type: string;
    price_type: string;
    date: string | null;
    due: string | null;
    dispatch_date: string | null;
    status: PendingInvoiceStatus;
    dispatch_plan: string;
  };
  lines: Array<{
    product_id: number;
    product_name: string;
    product_code: string;
    unit: string;
    qty: number;
    price: number;
    gross: number;
    disc_type: string;
    disc_amt: number;
    net_total: number;
  }>;
  summary: {
    discount: number;
    vatable: number;
    net: number;
    vat: number;
    total: number;
    balance: number;
  };
};

const money = (n: any) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

const dateOrDash = (v: any) => {
  if (!v) return "-";
  const s = String(v).trim();
  return s ? s : "-";
};

const statusBadge = (s: PendingInvoiceStatus) => {
  const cls =
    s === "Cleared"
      ? "bg-emerald-600 text-white hover:bg-emerald-600"
      : s === "Inbound"
      ? "bg-blue-600 text-white hover:bg-blue-600"
      : s === "For Dispatch"
      ? "bg-amber-500 text-white hover:bg-amber-500"
      : "bg-slate-600 text-white hover:bg-slate-600";

  return <Badge className={cn("rounded-md px-2 py-1 text-xs", cls)}>{s}</Badge>;
};

function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-1">
      <div className="col-span-4 text-xs text-slate-500">{k}</div>
      <div className="col-span-8 text-sm text-slate-900 font-medium break-words">{v}</div>
    </div>
  );
}

export function InvoiceDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNo: string | null;
}) {
  const { open, onOpenChange, invoiceNo } = props;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PendingInvoiceDetails | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!open) return;

      if (!invoiceNo) {
        setError("Missing invoice number.");
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = await fetch(`/api/pending-invoices/${encodeURIComponent(invoiceNo)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          // show server payload
          let body = "";
          try {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const j = await res.json();
              body = j?.error ? ` | ${j.error}` : ` | ${JSON.stringify(j)}`;
            } else {
              body = ` | ${await res.text()}`;
            }
          } catch {
            // ignore parse errors
          }
          throw new Error(`Failed to load invoice: ${res.status} ${res.statusText}${body}`);
        }

        const json = (await res.json()) as PendingInvoiceDetails;

        if (!cancelled) setData(json);
      } catch (e: any) {
        console.error("InvoiceDetailsDialog load error:", e);
        if (!cancelled) setError(e?.message || "Failed to load invoice.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, invoiceNo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        {/* REQUIRED for a11y */}
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Invoice Details</span>
            {data?.header?.status ? statusBadge(data.header.status) : null}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Review invoice header, itemized lines, and totals.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : !data ? (
          <div className="text-sm text-slate-500">No data.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs font-semibold tracking-wide text-slate-700 mb-2">
                  HEADER
                </div>

                <KeyValue k="Invoice No" v={<span className="font-mono">{data.header.invoice_no}</span>} />
                <KeyValue k="Customer" v={data.header.customer_name} />
                <KeyValue k="Customer Code" v={<span className="font-mono">{data.header.customer_code}</span>} />
                <KeyValue k="Salesman" v={data.header.salesman} />
                <KeyValue k="Location" v={data.header.location} />
                <KeyValue k="Sales Type" v={data.header.sales_type} />
                <KeyValue k="Receipt Type" v={data.header.receipt_type} />
                <KeyValue k="Price Type" v={data.header.price_type} />
                <KeyValue k="Invoice Date" v={dateOrDash(data.header.date)} />
                <KeyValue k="Due Date" v={dateOrDash(data.header.due)} />
                <KeyValue k="Dispatch Date" v={dateOrDash(data.header.dispatch_date)} />
                <KeyValue k="Dispatch Plan" v={data.header.dispatch_plan || "unlinked"} />
              </div>

              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs font-semibold tracking-wide text-slate-700 mb-2">
                  SUMMARY
                </div>

                <KeyValue k="Discount" v={<span className="font-mono">{money(data.summary.discount)}</span>} />
                <KeyValue k="Vatable" v={<span className="font-mono">{money(data.summary.vatable)}</span>} />
                <KeyValue k="VAT" v={<span className="font-mono">{money(data.summary.vat)}</span>} />
                <Separator className="my-2" />
                <KeyValue k="Total" v={<span className="font-mono">{money(data.summary.total)}</span>} />
                <KeyValue k="Balance" v={<span className="font-mono">{money(data.summary.balance)}</span>} />
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-8">
              <div className="rounded-lg border bg-white">
                <div className="px-4 py-3 border-b">
                  <div className="text-xs font-semibold tracking-wide text-slate-700">
                    ITEMIZED LINES ({data.lines.length})
                  </div>
                </div>

                <ScrollArea className="h-[520px]">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 sticky top-0 z-10">
                      <div className="col-span-4">Product</div>
                      <div className="col-span-2">Unit</div>
                      <div className="col-span-1 text-right">Qty</div>
                      <div className="col-span-1 text-right">Price</div>
                      <div className="col-span-1 text-right">Gross</div>
                      <div className="col-span-2">Discount</div>
                      <div className="col-span-1 text-right">Net</div>
                    </div>

                    {data.lines.map((l, idx) => (
                      <div
                        key={`${l.product_id}-${idx}`}
                        className={cn(
                          "grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm",
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                        )}
                      >
                        <div className="col-span-4">
                          <div className="font-medium text-slate-900 truncate" title={l.product_name}>
                            {l.product_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{l.product_code}</div>
                        </div>

                        <div className="col-span-2 text-slate-700">{l.unit}</div>

                        <div className="col-span-1 text-right font-mono text-slate-700">
                          {money(l.qty)}
                        </div>

                        <div className="col-span-1 text-right font-mono text-slate-700">
                          {money(l.price)}
                        </div>

                        <div className="col-span-1 text-right font-mono text-slate-700">
                          {money(l.gross)}
                        </div>

                        <div className="col-span-2">
                          <div className="text-xs text-slate-600">{l.disc_type || "No Discount"}</div>
                          <div className="text-right font-mono text-slate-700">{money(l.disc_amt)}</div>
                        </div>

                        <div className="col-span-1 text-right font-mono font-semibold text-slate-900">
                          {money(l.net_total)}
                        </div>
                      </div>
                    ))}

                    {data.lines.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500">No line items.</div>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
