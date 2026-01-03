"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useMemo, useState } from "react";

interface SalesmanPerformance {
  salesman_id: number;
  salesman_name: string;
  collections_count: number;
  customers_count: number;
  total_amount: number;
  average_amount: number;
  percent_of_total: number;
}

interface SalesmanCollectionChartProps {
  data: SalesmanPerformance[];
  loading?: boolean;
  topCount?: number;
}

const chartConfig = {
  total_amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
  collections_count: {
    label: "Count",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function SalesmanCollectionChart({
  data = [],
  topCount = 10,
}: SalesmanCollectionChartProps) {
  // Get top N salesmen (already sorted by total_amount from API)
  const topSalesmen = data.slice(0, topCount);
  const [activeChart, setActiveChart] =
    useState<keyof typeof chartConfig>("total_amount");

  // Format data for the chart
  const chartData = topSalesmen.map((salesman) => ({
    salesman_name: salesman.salesman_name,
    total_amount: salesman.total_amount,
    collections_count: salesman.collections_count,
  }));

  // Calculate totals for each metric
  const total = useMemo(
    () => ({
      total_amount: chartData.reduce((acc, curr) => acc + curr.total_amount, 0),
      collections_count: chartData.reduce(
        (acc, curr) => acc + curr.collections_count,
        0
      ),
    }),
    [chartData]
  );

  // Calculate growth percentage (top performer vs average)
  const topPerformer = topSalesmen[0];
  const avgAmount =
    topSalesmen.length > 0
      ? topSalesmen.reduce((sum, s) => sum + s.total_amount, 0) /
        topSalesmen.length
      : 0;
  const growthPercent =
    topPerformer && avgAmount > 0
      ? (((topPerformer.total_amount - avgAmount) / avgAmount) * 100).toFixed(1)
      : "0.0";

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Collection by Salesman</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-col items-stretch border-b border-t p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>Collection by Salesman</CardTitle>
          <CardDescription>
            Top {topSalesmen.length} salesmen ranked by total collection amount
          </CardDescription>
        </div>
        <div className="flex">
          {(["total_amount", "collections_count"] as const).map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground gap-2 flex items-center text-xs">
                  <span
                    className="inline-block w-3 h-3 rounded-xs"
                    style={{ backgroundColor: chartConfig[chart].color }}
                  ></span>
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {key === "total_amount"
                    ? new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                        maximumFractionDigits: 0,
                      }).format(total[key])
                    : total[key].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: -20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(value) =>
                `₱${
                  value >= 1e6
                    ? (value / 1e6).toFixed(2) + " M"
                    : value >= 1e3
                    ? (value / 1e3).toFixed(1) + " K"
                    : value
                }`
              }
            />
            <YAxis
              dataKey="salesman_name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value}`}
                  formatter={(value, name) => {
                    if (name === "total_amount") {
                      return [
                        new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          maximumFractionDigits: 0,
                        }).format(value as number),
                        " Amount",
                      ];
                    }
                    return [value, " Collections"];
                  }}
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`var(--color-${activeChart})`}
              radius={5}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {topPerformer ? (
            <>
              {topPerformer.salesman_name} leads by {growthPercent}% above
              average
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No performance data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total amount and count collected by each salesman.
        </div>
      </CardFooter>
    </Card>
  );
}
