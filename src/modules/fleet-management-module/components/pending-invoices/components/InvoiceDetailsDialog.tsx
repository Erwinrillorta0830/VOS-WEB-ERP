"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { InvoiceDetailsResponse } from "../types";

function money(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function ReadonlyField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
      <div className="flex min-h-[2.25rem] w-full items-center rounded-md bg-slate-50 border border-slate-200 px-3 py-1 text-sm text-slate-800">
        {value || "-"}
      </div>
    </div>
  );
}

export function InvoiceDetailsDialog({ open, invoiceNo, onClose }: { open: boolean; invoiceNo: string | null; onClose: () => void; }) {
  const [data, setData] = React.useState<InvoiceDetailsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !invoiceNo) return;
    setLoading(true);
    fetch(`/api/pending-invoices/${invoiceNo}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, invoiceNo]);

  const h = data?.header;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-[1300px] h-[90vh] flex flex-col p-0 gap-0 bg-white">
        
        {/* Header Bar */}
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-blue-600 text-xl font-bold">Invoice #{invoiceNo}</DialogTitle>
          {h && (
             <div className="flex gap-2">
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1">{h.status}</Badge>
                {h.dispatch_plan !== "unlinked" && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                       Plan: {h.dispatch_plan}
                    </Badge>
                )}
             </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {loading && <div className="text-center py-10">Loading...</div>}
          
          {!loading && data && h && (
            <div className="space-y-6">
              {/* Form Section */}
              <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ReadonlyField label="Customer Name" value={h.customer_name} className="md:col-span-3" />
                  <ReadonlyField label="No." value={h.invoice_no} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ReadonlyField label="Customer Code" value={h.customer_code} />
                  <ReadonlyField label="Date" value={h.invoice_date} />
                  <ReadonlyField label="Due" value={h.invoice_date} /> {/* Assuming same for now */}
                  <ReadonlyField label="Dispatch Date" value={h.dispatch_date} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <ReadonlyField label="Salesman" value={h.salesman} />
                  <ReadonlyField label="Location" value={h.address} />
                  <ReadonlyField label="Sales Type" value={h.sales_type} />
                  <ReadonlyField label="Receipt Type" value="Cash" />
                  <ReadonlyField label="Price Type" value={h.price_type} />
                </div>
              </div>

              {/* Table & Summary Section */}
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Table */}
                <div className="flex-1 rounded-lg border bg-white shadow-sm overflow-hidden min-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left">Code</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-center">Unit</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Gross</th>
                        <th className="px-4 py-3 text-center">Disc Type</th>
                        <th className="px-4 py-3 text-right">Disc Amt</th>
                        <th className="px-4 py-3 text-right">Net Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.lines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{l.product_id}</td>
                          <td className="px-4 py-3 text-slate-600">{l.product_name}</td>
                          <td className="px-4 py-3 text-center">{l.unit}</td>
                          <td className="px-4 py-3 text-right">{l.qty}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{money(l.price)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{money(l.gross)}</td>
                          <td className="px-4 py-3 text-center text-xs text-slate-400">{l.disc_type}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{money(l.disc_amt)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(l.net_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Box */}
                <Card className="w-full xl:w-[320px] shadow-sm h-fit">
                  <CardHeader className="bg-slate-50 py-3 border-b">
                    <ShadCardTitle className="text-sm font-semibold text-blue-700">Summary</ShadCardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>{money(data.summary.discount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Vatable</span><span>{money(data.summary.vatable)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Memo</span><span>0.00</span></div>
                    <Separator />
                    <div className="flex justify-between text-blue-600 font-medium"><span>Net</span><span>{money(data.summary.net)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(data.summary.vat)}</span></div>
                    <Separator className="bg-slate-200 h-[2px]" />
                    <div className="flex justify-between font-bold text-lg text-slate-900"><span>TOTAL</span><span>{money(data.summary.total)}</span></div>
                    <div className="flex justify-between font-medium text-red-600"><span>Balance</span><span>{money(data.summary.balance)}</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}