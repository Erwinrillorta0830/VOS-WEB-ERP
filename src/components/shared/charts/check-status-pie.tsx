// src/components/shared/charts/check-status-pie.tsx
"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { StatusDistribution } from "@/components/shared/data-table/check-register-table/types";

interface CheckStatusPieChartProps {
  data: StatusDistribution[];
  loading?: boolean;
}

// Define specific colors for each status to match the badge colors
const STATUS_COLORS: Record<string, string> = {
  Cleared: "hsl(221.2, 83.2%, 53.3%)", // Blue (matching bg-blue-700)
  "Post Dated Check": "hsl(24.6, 95%, 53.1%)", // Orange (matching bg-orange-500)
  "Dated Check": "hsl(47.9, 95.8%, 53.1%)", // Yellow (matching bg-yellow-500)
  Pending: "hsl(142.1, 76.2%, 36.3%)", // Green (matching bg-green-500)
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function CheckStatusPieChart({ data = [] }: CheckStatusPieChartProps) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  // Format data for pie chart
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      status: item.status,
      count: item.count,
      amount: item.amount,
      percent: item.percentage,
      color: STATUS_COLORS[item.status] || STATUS_COLORS["Pending"],
    }));

  // Create chart config dynamically
  const chartConfig = data
    .filter((item) => item.count > 0)
    .reduce((config, item) => {
      const key = item.status.toLowerCase().replace(/\s+/g, "_");
      config[key] = {
        label: item.status,
        color: STATUS_COLORS[item.status] || STATUS_COLORS["Pending"],
      };
      return config;
    }, {} as ChartConfig);

  const topStatus = chartData[0];

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Check Status Distribution</CardTitle>
          <CardDescription>Distribution by check status</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No check data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Check Status Distribution</CardTitle>
        <CardDescription>Distribution by check status</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px] w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {data.status}
                        </span>
                        <span className="font-bold text-right">
                          {data.count.toLocaleString()} checks
                        </span>
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Amount
                        </span>
                        <span className="font-bold text-right">
                          {formatCurrency(data.amount)}
                        </span>
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Percentage
                        </span>
                        <span className="font-bold text-right">
                          {data.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {topStatus ? (
            <>
              {topStatus.status} is the most common status at{" "}
              {topStatus.percent.toFixed(1)}%
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No check data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Total of {totalCount.toLocaleString()} checks worth{" "}
          {formatCurrency(totalAmount)}
        </div>
      </CardFooter>
    </Card>
  );
}
