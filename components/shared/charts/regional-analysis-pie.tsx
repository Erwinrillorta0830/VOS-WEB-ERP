// src/components/shared/charts/regional-analysis-pie.tsx
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
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RegionalAnalysis } from "@/components/shared/data-table/regional-analysis-data-table/types";

interface RegionalAnalysisPieChartProps {
  data: RegionalAnalysis[];
  loading?: boolean;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RegionalAnalysisPieChart({
  data = [],
}: RegionalAnalysisPieChartProps) {
  // Format data for pie chart
  const chartData = data
    .filter((item) => item.total_amount > 0)
    .map((item, index) => {
      const key = item.province.toLowerCase().replace(/\s+/g, "_");
      return {
        province: item.province,
        amount: item.total_amount,
        percent: item.percent_of_total,
        color: COLORS[index % COLORS.length],
      };
    });

  // Create chart config dynamically
  const chartConfig: ChartConfig = {
    amount: {
      label: "Amount",
    },
    ...data
      .filter((item) => item.total_amount > 0)
      .reduce((config, item, index) => {
        const key = item.province.toLowerCase().replace(/\s+/g, "_");
        // const colorIndex = (index % 5) + 1;
        config[key] = {
          label: item.province,
          color: COLORS[index % COLORS.length],
        };
        return config;
      }, {} as ChartConfig),
  } satisfies ChartConfig;

  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
  const topProvince = chartData[0];

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Regional Distribution</CardTitle>
          <CardDescription>Provincial breakdown by amount</CardDescription>
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
        <CardTitle>Regional Distribution</CardTitle>
        <CardDescription>Provincial breakdown by amount</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px] w-full"
        >
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  // payload[0].payload contains the item from your chartData map
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Province
                        </span>
                        <span className="font-bold text-right">
                          {data.province}
                        </span>

                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Amount
                        </span>
                        <span className="font-bold text-right">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                            maximumFractionDigits: 0,
                          }).format(data.amount)}
                        </span>

                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Share
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
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="province"
              label={({ name, percent }) => `${name}: ${percent.toFixed(1)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {topProvince ? (
            <>
              {topProvince.province} leads with {topProvince.percent.toFixed(1)}
              % of total collections
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>No regional data</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Total of{" "}
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 0,
          }).format(totalAmount)}{" "}
          collected across all provinces.
        </div>
      </CardFooter>
    </Card>
  );
}
