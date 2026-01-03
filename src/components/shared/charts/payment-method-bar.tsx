// src/components/shared/charts/payment-method.tsx
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
import { PaymentMethodPerformance } from "@/components/shared/data-table/payment-methods-data-table/types";

interface PaymentMethodChartProps {
  data: PaymentMethodPerformance[];
  loading?: boolean;
  topCount?: number;
}

const chartConfig = {
  total_amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function PaymentMethodChart({
  data = [],
  topCount = 10,
}: PaymentMethodChartProps) {
  const topMethods = data.slice(0, topCount);

  const chartData = topMethods.map((method) => ({
    method_name: method.method_name,
    total_amount: method.total_amount,
    transactions_count: method.transactions_count,
  }));

  const totalAmount = chartData.reduce(
    (acc, curr) => acc + curr.total_amount,
    0
  );
  const topMethod = topMethods[0];
  const topMethodPercent =
    topMethod && totalAmount > 0
      ? ((topMethod.total_amount / totalAmount) * 100).toFixed(1)
      : "0.0";

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Collections by Payment Method</CardTitle>
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
        <CardTitle>Collections by Payment Method</CardTitle>
        <CardDescription>
          Top {topMethods.length} payment methods ranked by total amount
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="method_name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                return value.length > 10 ? `${value.slice(0, 10)}...` : value;
              }}
            />
            <YAxis
              tickLine={false}
              tickMargin={10}
              axisLine={false}
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value}`}
                  formatter={(value) => {
                    return [
                      new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                        maximumFractionDigits: 0,
                      }).format(value as number),
                      " Amount",
                    ];
                  }}
                />
              }
            />
            <Bar dataKey="total_amount" fill="var(--chart-1)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {topMethod ? (
            <>
              {topMethod.method_name} accounts for {topMethodPercent}% of total
              collections
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No payment method data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total amount by payment method.
        </div>
      </CardFooter>
    </Card>
  );
}
