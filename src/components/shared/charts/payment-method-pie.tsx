// src/components/shared/charts/payment-method-pie.tsx
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
import { PaymentMethodPerformance } from "@/components/shared/data-table/payment-methods-data-table/types";

interface PaymentMethodPieChartProps {
  data: PaymentMethodPerformance[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const formatNumber = (value: number) => value.toLocaleString("en-PH");

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function PaymentMethodPieChart({
  data = [],
}: PaymentMethodPieChartProps) {
  const totalTransactions = data.reduce(
    (sum, item) => sum + item.transactions_count,
    0
  );

  const chartData = data.map((method, index) => ({
    name: method.method_name,
    value: method.transactions_count,
    amount: method.total_amount,
    percent: method.percent_of_transactions,
    color: COLORS[index % COLORS.length],
  }));

  const chartConfig = data.reduce((config, method, index) => {
    config[method.method_key] = {
      label: method.method_name,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  const topMethod = chartData[0];

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Transaction Distribution</CardTitle>
          <CardDescription>
            Payment method usage by transaction count
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Transaction Distribution</CardTitle>
        <CardDescription>
          Payment method usage by transaction count
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px] w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} : ${percent.toFixed(1)}%`}
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
                          {data.value.toLocaleString()} transactions
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
          {topMethod ? (
            <>
              {topMethod.name} is the most used method at{" "}
              {topMethod.percent.toFixed(1)}%
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No transaction data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Total of {totalTransactions.toLocaleString()} transactions across all
          payment methods
        </div>
      </CardFooter>
    </Card>
  );
}
