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

  // Colors: Gray, Black, Orange, Green
  const colors = ["#94a3b8", "#0f172a", "#f97316", "#22c55e"];

  const barData = [
    { name: "Unlinked", amount: kpis.by_status.Unlinked.amount, fill: "#94a3b8" },
    { name: "For Dispatch", amount: kpis.by_status["For Dispatch"].amount, fill: "#0f172a" },
    { name: "Inbound", amount: kpis.by_status.Inbound.amount, fill: "#f97316" },
    { name: "Cleared", amount: kpis.by_status.Cleared.amount, fill: "#22c55e" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Pie Chart */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={80} 
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={colors[idx]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, "Invoices"]} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Volume by Status</CardTitle>
        </CardHeader>
        {/* ✅ FIX 2: Increased container height to 300px to fit everything */}
        <CardContent className="h-[300px] flex flex-col justify-between">
          
          {/* Chart takes up most space but leaves room at bottom */}
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10} 
                />
                <YAxis 
                    tick={{ fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                />
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    formatter={(v: any) => money(Number(v))} 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                    {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Text is now safely inside the padded container */}
          <div className="mt-2 text-right text-xs text-slate-500 border-t pt-2">
            Total Amount: <span className="font-bold text-slate-900 text-sm ml-1">{money(kpis.total_amount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}