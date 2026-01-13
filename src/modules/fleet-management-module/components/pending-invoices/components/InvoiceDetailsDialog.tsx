"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { InvoiceDetailsResponse } from "../types";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateOnly(v: unknown) {
  const s = typeof v === "string" ? v : "";
  if (!s) return "-";
  return s.includes("T") ? s.split("T")[0] : s;
}

function field(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : "-";
}

function statusBadgeClass(status: unknown) {
  const s = (typeof status === "string" ? status : "").toLowerCase();
  if (s.includes("unlinked")) return "border-muted-foreground/30 text-muted-foreground";
  if (s.includes("dispatch")) return "border-blue-200 text-blue-700 bg-blue-50";
  if (s.includes("inbound")) return "border-amber-200 text-amber-700 bg-amber-50";
  if (s.includes("clear")) return "border-emerald-200 text-emerald-700 bg-emerald-50";
  return "border-muted-foreground/30 text-muted-foreground";
}

function FieldSingle({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="h-10 w-full rounded-md bg-muted/30 px-3 flex items-center text-sm overflow-hidden whitespace-nowrap text-ellipsis">
        {value}
      </div>
    </div>
  );
}

function FieldMulti({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      {/* IMPORTANT: no fixed height; allow wrapping for long text */}
      <div className="min-h-10 w-full rounded-md bg-muted/30 px-3 py-2 text-sm leading-5 whitespace-normal break-words">
        {value}
      </div>
    </div>
  );
}

export function InvoiceDetailsDialog({
  open,
  invoiceNo,
  onClose,
}: {
  open: boolean;
  invoiceNo: string | null;
  onClose: () => void;
}) {
  const [data, setData] = React.useState<InvoiceDetailsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    if (!open || !invoiceNo) {
      setData(null);
      setErr(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/pending-invoices/${encodeURIComponent(invoiceNo)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || "Failed to load invoice details");
        }

        const json = (await res.json()) as InvoiceDetailsResponse;
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Failed to load invoice details");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, invoiceNo]);

  const header: any = data?.header ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Wide, like Image #2 */}
      <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-blue-600 text-2xl font-semibold">
            {invoiceNo ? `Invoice #${invoiceNo}` : "Invoice"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-auto max-h-[calc(92vh-4.5rem)]">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {err && !loading && <div className="text-sm text-red-600">{err}</div>}

          {!loading && !err && data && (
            <div className="space-y-5">
              {/* Top: Left details + Right summary */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                {/* LEFT */}
                <div className="space-y-4">
                  {/* Customer Name (multi-line safe) */}
                  <FieldMulti label="Customer Name" value={field(header?.customer_name)} />

                  {/* No / Date / Due */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FieldSingle label="No." value={field(header?.invoice_no)} />
                    <FieldSingle
                      label="Date"
                      value={fmtDateOnly(header?.invoice_date ?? header?.dispatch_date)}
                    />
                    <FieldSingle
                      label="Due"
                      value={fmtDateOnly(header?.due_date ?? header?.dispatch_date)}
                    />
                  </div>

                  {/* Customer Code / Dispatch Date */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FieldSingle label="Customer Code" value={field(header?.customer_code)} />
                    <FieldSingle label="Dispatch Date" value={fmtDateOnly(header?.dispatch_date)} />
                    <div className="hidden md:block" />
                  </div>

                  {/* Salesman / Location / Sales Type / Receipt / Price */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <FieldSingle label="Salesman" value={field(header?.salesman)} />
                    {/* Location should also be multi-line safe */}
                    <FieldMulti label="Location" value={field(header?.address)} />
                    <FieldSingle label="Sales Type" value={field(header?.sales_type)} />
                    <FieldSingle label="Receipt Type" value={field(header?.receipt_type)} />
                    <FieldSingle label="Price Type" value={field(header?.price_type)} />
                  </div>

                  {/* Status + Dispatch Plan */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge className={statusBadgeClass(header?.status)} variant="outline">
                      {field(header?.status)}
                    </Badge>

                    <div className="ml-2 text-xs text-muted-foreground">Dispatch Plan</div>
                    <span className="text-sm text-muted-foreground">
                      {header?.dispatch_plan && header?.dispatch_plan !== "unlinked"
                        ? header?.dispatch_plan
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* RIGHT SUMMARY */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <ShadCardTitle className="text-sm font-semibold">Summary</ShadCardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>{money(data.summary.discount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vatable</span>
                      <span>{money(data.summary.vatable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net</span>
                      <span className="text-blue-600">{money(data.summary.net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT</span>
                      <span>{money(data.summary.vat)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>TOTAL</span>
                      <span>{money(data.summary.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="text-red-600">{money(data.summary.balance)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoice Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">Invoice Details</div>
                </div>

                <div className="rounded-md border bg-background">
                  <div className="overflow-auto">
                    <table className="min-w-[1100px] w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-semibold">Description</th>
                          <th className="px-3 py-2 font-semibold">Unit</th>
                          <th className="px-3 py-2 text-right font-semibold">Qty</th>
                          <th className="px-3 py-2 text-right font-semibold">Price</th>
                          <th className="px-3 py-2 text-right font-semibold">Gross</th>
                          <th className="px-3 py-2 font-semibold">Disc Type</th>
                          <th className="px-3 py-2 text-right font-semibold">Disc Amt</th>
                          <th className="px-3 py-2 text-right font-semibold">Net Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lines.map((l) => (
                          <tr key={l.id} className="border-t">
                            <td className="px-3 py-2">{l.product_name ?? "-"}</td>
                            <td className="px-3 py-2">{l.unit ?? "-"}</td>
                            <td className="px-3 py-2 text-right">{l.qty}</td>
                            <td className="px-3 py-2 text-right">{money(l.price)}</td>
                            <td className="px-3 py-2 text-right">{money(l.gross)}</td>
                            <td className="px-3 py-2">{l.disc_type}</td>
                            <td className="px-3 py-2 text-right">{money(l.disc_amt)}</td>
                            <td className="px-3 py-2 text-right">{money(l.net_total)}</td>
                          </tr>
                        ))}

                        {data.lines.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                              No invoice lines.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
