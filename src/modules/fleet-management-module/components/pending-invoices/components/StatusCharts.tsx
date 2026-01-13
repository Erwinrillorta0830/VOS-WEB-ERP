// modules/fleet-management-module/components/pending-invoices/components/StatusCharts.tsx
"use client";

import * as React from "react";
import type { PendingInvoiceKpis } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function StatusCharts({ kpis }: { kpis: PendingInvoiceKpis }) {
  const pieData = [
    { name: "Unlinked", value: kpis.by_status.Unlinked.count },
    { name: "For Dispatch", value: kpis.by_status["For Dispatch"].count },
    { name: "Inbound", value: kpis.by_status.Inbound.count },
    { name: "Cleared", value: kpis.by_status.Cleared.count },
  ];

  const barData = [
    { name: "Unlinked", amount: kpis.by_status.Unlinked.amount },
    { name: "For Dispatch", amount: kpis.by_status["For Dispatch"].amount },
    { name: "Inbound", amount: kpis.by_status.Inbound.amount },
    { name: "Cleared", amount: kpis.by_status.Cleared.amount },
  ];

  // No hard-coded brand colors; keep minimal but distinct default palette via recharts.
  const colors = ["#6b7280", "#2563eb", "#f97316", "#16a34a"];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={colors[idx]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Volume by Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-right text-xs text-muted-foreground">
            Total Amount: <span className="font-semibold text-foreground">{money(kpis.total_amount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
