// src/modules/pending-invoices/PrintPendingInvoicesPage.tsx
"use client";

import * as React from "react";
import type { PendingInvoiceRow } from "./types";
import { StatusPill } from "./components/status";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

type PendingStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";
const ORDER: PendingStatus[] = ["Unlinked", "For Dispatch", "Inbound", "Cleared"];

export default function PrintPendingInvoicesPage(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sp = props.searchParams;

  const salesman = String(sp.salesman ?? "all");
  const customer = String(sp.customer ?? "all");
  const status = String(sp.status ?? "all");
  const from = String(sp.from ?? "");
  const to = String(sp.to ?? "");

  const [rows, setRows] = React.useState<PendingInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "5000",
          search: "",
          status: status === "all" ? "all" : status,
          salesman,
          customer,
          from,
          to,
          _t: String(Date.now()),
        });

        const res = await fetch(`/api/pending-invoices?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed: ${res.status} ${res.statusText}`);
        const json = await res.json();
        setRows(json.data || []);
      } catch (e: any) {
        console.error("print report error:", e);
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [salesman, customer, status, from, to]);

  const grouped = React.useMemo(() => {
    const map = new Map<PendingStatus, PendingInvoiceRow[]>();
    for (const s of ORDER) map.set(s, []);

    for (const r of rows) {
      map.get(r.status as PendingStatus)?.push(r);
    }
    return map;
  }, [rows]);

  const statusesToRender: PendingStatus[] =
    status === "all" ? ORDER : (ORDER.filter((s) => s === status) as PendingStatus[]);

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.netAmount) || 0), 0);

  return (
    <div className="p-8 bg-white min-h-screen print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-slate-900">Pending Invoices Report</div>
          <div className="text-sm text-slate-500">
            Range: {from} to {to}
          </div>
        </div>
        <button
          className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold"
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading report...</div>
      ) : error ? (
        <div className="p-4 border rounded bg-red-50 text-red-700">{error}</div>
      ) : (
        <>
          <div className="text-sm text-slate-600 mb-4">
            Total Rows: <span className="font-mono font-bold text-slate-900">{rows.length}</span>{" "}
            | Total Amount:{" "}
            <span className="font-mono font-bold text-slate-900">${money(totalAmount)}</span>
          </div>

          <div
            className={`grid gap-4 ${
              statusesToRender.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            {statusesToRender.map((s) => {
              const list = grouped.get(s) || [];
              const subtotal = list.reduce((sum, r) => sum + (Number(r.netAmount) || 0), 0);

              return (
                <div key={s} className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <StatusPill status={s} />
                      <span className="text-xs text-slate-500">({list.length})</span>
                    </div>
                    <div className="text-xs text-slate-700 font-mono">${money(subtotal)}</div>
                  </div>

                  <div className="p-3">
                    {list.length === 0 ? (
                      <div className="text-sm text-slate-400">No invoices.</div>
                    ) : (
                      <div className="space-y-2">
                        {list.map((r) => (
                          <div key={r.invoiceNo} className="border rounded-md p-3">
                            <div className="flex justify-between gap-3">
                              <div className="font-semibold text-blue-700">{r.invoiceNo}</div>
                              <div className="font-mono font-bold text-slate-900">${money(r.netAmount)}</div>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{r.customer}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              DP: {r.dispatchPlan || "unlinked"} | Salesman: {r.salesman}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
