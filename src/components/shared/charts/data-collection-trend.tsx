import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DailyCollection } from "../data-table/daily-collections-data-table/types";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DailyCollectionTrendChartProps {
  data: DailyCollection[];
  loading?: boolean;
}

const chartConfig = {
  Amount: {
    label: "Amount ",
    color: "var(--chart-1)",
  },
  Count: {
    label: "Count ",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function DailyCollectionTrendChart({
  data,
  loading,
}: DailyCollectionTrendChartProps) {
  // Format data for chart
  const chartData = data.map((item) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return {
      date: formattedDate,
      Amount: item.total_amount,
      Count: item.transactions_count,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Collections Trend</CardTitle>
        <CardDescription>
          Showing collection amounts and transaction counts over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[350px]">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 1,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
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
                  formatter={(value, name) => {
                    if (name === "Amount") {
                      return [
                        chartConfig[name as keyof typeof chartConfig]?.label ||
                          name,
                        `₱${Number(value).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                      ];
                    }
                    return [
                      chartConfig[name as keyof typeof chartConfig]?.label ||
                        name,
                      Number(value).toLocaleString(),
                    ];
                  }}
                />
              }
            />
            <defs>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-Amount)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-Amount)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-Count)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-Count)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="Count"
              type="natural"
              fill="url(#fillCount)"
              fillOpacity={0.4}
              stroke="var(--color-Count)"
              stackId="a"
            />
            <Area
              dataKey="Amount"
              type="natural"
              fill="url(#fillAmount)"
              fillOpacity={0.4}
              stroke="var(--color-Amount)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-center gap-2 text-sm"></div>
      </CardFooter>
    </Card>
  );
}
