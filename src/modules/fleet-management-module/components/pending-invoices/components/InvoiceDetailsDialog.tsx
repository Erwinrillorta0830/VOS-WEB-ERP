// modules/fleet-management-module/components/pending-invoices/components/InvoiceDetailsDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import type { InvoiceDetailsResponse } from "../types";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    // Reset when closed
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1200px]">
        {/* Accessibility requirement: DialogTitle must exist inside DialogContent */}
        <DialogHeader>
          {/* Keep title for screen readers, hide visually to preserve your UI */}
          <VisuallyHidden>
            <DialogTitle>
              {invoiceNo ? `Invoice Details - ${invoiceNo}` : "Invoice Details"}
            </DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        {!invoiceNo ? null : (
          <div className="space-y-4">
            <div className="text-2xl font-semibold text-blue-600">Invoice #{invoiceNo}</div>

            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {err && !loading && <div className="text-sm text-red-600">{err}</div>}

            {!loading && !err && data && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Customer Name</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">
                          {data.header.customer_name ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">No.</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">{data.header.invoice_no}</div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Customer Code</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">
                          {data.header.customer_code ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Dispatch Date</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">
                          {data.header.dispatch_date ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Salesman</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">
                          {data.header.salesman ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Location</div>
                        <div className="rounded-md bg-muted/30 px-3 py-2">
                          {data.header.address ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <Badge variant="outline">{data.header.status}</Badge>

                      <div className="text-xs text-muted-foreground">Dispatch Plan</div>
                      <span className="text-xs">
                        {data.header.dispatch_plan !== "unlinked" ? data.header.dispatch_plan : "—"}
                      </span>
                    </div>
                  </div>

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

                <div className="rounded-md border">
                  <div className="bg-muted/40 px-3 py-2 text-sm font-semibold">Invoice Details</div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/20">
                        <tr className="text-left">
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Gross</th>
                          <th className="px-3 py-2">Disc Type</th>
                          <th className="px-3 py-2 text-right">Disc Amt</th>
                          <th className="px-3 py-2 text-right">Net Total</th>
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
                            <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                              No invoice lines.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
