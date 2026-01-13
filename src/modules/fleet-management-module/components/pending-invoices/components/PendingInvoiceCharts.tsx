"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartData } from "../types";

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white p-2 border rounded shadow text-xs z-50">
      <div className="font-semibold">{p.name}</div>
      <div className="text-slate-600">Count: <span className="font-mono font-semibold text-slate-900">{p.value}</span></div>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white p-2 border rounded shadow text-xs z-50">
      <div className="font-semibold">{p.payload?.name}</div>
      <div className="text-slate-600">Amount: <span className="font-mono font-semibold text-slate-900">${currency(Number(p.value || 0))}</span></div>
    </div>
  );
};

export function PendingInvoiceCharts(props: {
  statusCounts: ChartData[];
  statusAmounts: ChartData[];
  totalAmount: number;
  loading: boolean;
}) {
  const { statusCounts, statusAmounts, totalAmount, loading } = props;

  const pieData = useMemo(() => statusCounts || [], [statusCounts]);
  const barData = useMemo(() => (statusAmounts || []).map(x => ({ ...x, value: Number(x.value || 0) })), [statusAmounts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Pending Invoice Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 animate-pulse text-sm">
              Loading chart...
            </div>
          ) : pieData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              No data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={75}
                  outerRadius={105}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} style={{ outline: "none" }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} cursor={false} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "16px",
                    color: "#475569",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Pending Invoice Volume by Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 animate-pulse text-sm">
              Loading chart...
            </div>
          ) : barData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              No data available.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value">
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="pt-2 text-right text-sm text-slate-600">
                Total Amount: <span className="font-mono font-semibold text-slate-900">${currency(totalAmount)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
