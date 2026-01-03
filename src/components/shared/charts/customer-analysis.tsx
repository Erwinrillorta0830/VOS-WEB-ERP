// src/components/shared/charts/customer-collection-chart.tsx

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerAnalysis } from "@/components/shared/data-table/customer-analysis-data-table/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CustomerCollectionChartProps {
  data: CustomerAnalysis[];
  isLoading?: boolean;
}

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
};

export function CustomerCollectionChart({
  data,
  isLoading,
}: CustomerCollectionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Customers by Collection Amount</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Get top 5 customers by total_amount
  const top5Customers = data.slice(0, 5);

  // Transform data for chart
  const chartData = top5Customers.map((customer) => ({
    name: customer.customer_name,
    amount: customer.total_amount,
  }));

  const maxAmount = Math.max(...chartData.map((d) => d.amount));
  const yAxisMax = Math.ceil(maxAmount * 1.1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Customers by Collection Amount</CardTitle>
        <CardDescription>
          Showing the top 5 customers ranked by total collection amount
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[550px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                return value.length > 10 ? `${value.slice(0, 10)}...` : value;
              }}
            />
            <YAxis
              tickMargin={10}
              tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
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
            <Bar dataKey="amount" fill="var(--chart-1)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
