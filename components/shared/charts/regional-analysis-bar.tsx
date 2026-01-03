// src/components/shared/charts/regional-analysis-bar.tsx
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
import { RegionalAnalysis } from "@/components/shared/data-table/regional-analysis-data-table/types";

interface RegionalAnalysisBarChartProps {
  data: RegionalAnalysis[];
  loading?: boolean;
  topCount?: number;
}

const chartConfig = {
  total_amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RegionalAnalysisBarChart({
  data = [],
  topCount = 10,
}: RegionalAnalysisBarChartProps) {
  const topProvinces = data
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, topCount);

  const chartData = topProvinces.map((item) => ({
    province: item.province,
    total_amount: item.total_amount,
  }));

  const totalAmount = chartData.reduce(
    (acc, curr) => acc + curr.total_amount,
    0
  );
  const topProvince = topProvinces[0];
  const topProvincePercent =
    topProvince && totalAmount > 0
      ? ((topProvince.total_amount / totalAmount) * 100).toFixed(1)
      : "0.0";

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Regional Performance</CardTitle>
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
        <CardTitle>Regional Performance</CardTitle>
        <CardDescription>
          Top {topProvinces.length} provinces ranked by total amount
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
              dataKey="province"
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
                `₱ ${
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
          {topProvince ? (
            <>
              {topProvince.province} accounts for {topProvincePercent}% of total
              collections
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No regional data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total amount by province.
        </div>
      </CardFooter>
    </Card>
  );
}
