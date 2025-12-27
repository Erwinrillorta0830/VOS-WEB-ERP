// src/components/shared/charts/summary-payment-method-pie.tsx
"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell, Legend, Tooltip } from "recharts";

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
import { PaymentMethod } from "../data-table/summary-report-data-table/type";

interface SummaryPaymentMethodPieProps {
  data: PaymentMethod[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function SummaryPaymentMethodPie({
  data,
}: SummaryPaymentMethodPieProps) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  const chartData = data.map((item, index) => ({
    name: item.method_name,
    value: item.amount,
    count: item.count,
    color: COLORS[index % COLORS.length],
    percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
  }));

  const chartConfig = data.reduce((config, item, index) => {
    config[item.method_name] = {
      label: item.method_name,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  const topMethod = chartData[0];

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Payment Method Distribution</CardTitle>
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
      <CardHeader>
        <CardTitle>Payment Method Distribution</CardTitle>
        <CardDescription>Breakdown by payment method</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[350px] w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              label={({ name, value }) =>
                `${name} ₱${
                  value >= 1e6
                    ? (value / 1e6).toFixed(2) + " M"
                    : value >= 1e3
                    ? (value / 1e3).toFixed(1) + " K"
                    : value
                }`
              }
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
                          {data.name}
                        </span>
                        <span className="font-bold text-right">
                          {data.count} transactions
                        </span>
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Amount
                        </span>
                        <span className="font-bold text-right">
                          {formatCurrency(data.value)}
                        </span>
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Percentage
                        </span>
                        <span className="font-bold text-right">
                          {data.percentage.toFixed(1)}%
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
          {topMethod ? (
            <>
              {topMethod.name} is the most used method{" "}
              {topMethod.percentage.toFixed(1)}%
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No payment method data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing payment method breakdown by amount
        </div>
      </CardFooter>
    </Card>
  );
}
