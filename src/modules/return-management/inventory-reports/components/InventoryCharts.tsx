"use client"

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from '../types';

interface InventoryChartsProps {
  branchData: ChartData[];
  categoryData: ChartData[];
  loading: boolean;
}

// --- NEW: Helper to group small data points into "Other" ---
const processChartData = (data: ChartData[], maxItems: number): ChartData[] => {
  if (!data || data.length <= maxItems) return data;

  // 1. Sort descending
  const sorted = [...data].sort((a, b) => b.value - a.value);
  
  // 2. Slice top items
  const topItems = sorted.slice(0, maxItems);
  const others = sorted.slice(maxItems);

  // 3. Sum up the rest
  if (others.length > 0) {
    const otherValue = others.reduce((sum, item) => sum + item.value, 0);
    topItems.push({
      name: `Others (${others.length})`,
      value: otherValue,
      fill: '#94a3b8' // Slate-400 for a neutral "Other" color
    });
  }

  return topItems;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow text-xs z-50 font-mono">
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p className="text-slate-600">Qty: <span className="font-bold text-slate-900">{new Intl.NumberFormat().format(payload[0].value)}</span></p>
      </div>
    );
  }
  return null;
};

export function InventoryCharts({ branchData, categoryData, loading }: InventoryChartsProps) {
  
  // --- NEW: Process data to group small slices ---
  // We show top 12, group the rest. Prevents the "thin slice" issue.
  const finalBranchData = useMemo(() => processChartData(branchData, 12), [branchData]);
  const finalCategoryData = useMemo(() => processChartData(categoryData, 12), [categoryData]);

  const renderChart = (title: string, data: ChartData[]) => (
    <Card className="flex-1 min-w-[300px] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      {/* Increased height slightly for better legend space */}
      <CardContent className="h-[400px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 animate-pulse text-sm">
            Loading Chart data...
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            No Data Available based on current filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* Added bottom margin for legend */}
            <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 30 }}>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={80}
                outerRadius={110}
                // --- FIX: Remove gaps between slices ---
                paddingAngle={0} 
                dataKey="value"
                // --- FIX: Remove white border ---
                stroke="none"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} style={{ outline: 'none' }} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={false} />
              
              <Legend 
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ 
                  fontSize: '11px',
                  paddingTop: '20px',
                  width: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '10px',
                  color: '#475569'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {renderChart("Quantity by Branch", finalBranchData)}
      {renderChart("Quantity by Category", finalCategoryData)}
    </div>
  );
}