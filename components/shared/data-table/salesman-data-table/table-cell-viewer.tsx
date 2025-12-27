"use client";

import { useState, useEffect } from "react";
import { IconTrendingUp } from "@tabler/icons-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SalesmanPerformance, MonthlyChartData, chartConfig } from "./types";

interface TableCellViewerProps {
  item: SalesmanPerformance;
}

export function TableCellViewer({ item }: TableCellViewerProps) {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = useState<MonthlyChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data when drawer opens
  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/salesman-monthly-collections?salesman_id=${item.salesman_id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch chart data");
      }

      const json = await response.json();
      setChartData(json.chartData || []);
    } catch (err: any) {
      console.error("Error fetching chart data:", err);
      setError(err?.message || "Failed to load chart");
    } finally {
      setLoading(false);
    }
  };

  const formatter = (value: number) => {
    if (value >= 1e6) return `₱${(value / 1e6).toFixed(2)} M`;
    if (value >= 1e3) return `₱${(value / 1e3).toFixed(1)} K`;
    return `₱${value.toFixed(2)}`;
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="text-foreground w-fit px-0 text-left"
          onClick={fetchChartData}
        >
          {item.salesman_name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.salesman_name}</DrawerTitle>
          <DrawerDescription>Salesman performance details</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart data...
                </div>
              ) : error ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-red-600">
                  {error}
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No monthly data available
                </div>
              ) : (
                <ChartContainer config={chartConfig}>
                  <AreaChart
                    accessibilityLayer
                    data={chartData}
                    margin={{ left: 0, right: 10 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                      hide
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      dataKey="total_amount"
                      type="natural"
                      fill="var(--color-total_amount)"
                      fillOpacity={0.6}
                      stroke="var(--color-primary)"
                      stackId="a"
                    />
                    <Area
                      dataKey="average_amount"
                      type="natural"
                      fill="var(--color-average_amount)"
                      fillOpacity={0.4}
                      stroke="var(--color-average_amount)"
                      stackId="a"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Monthly collection trends
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Total:{" "}
                  {chartData
                    .reduce((sum, d) => sum + d.total_amount, 0)
                    .toLocaleString()}{" "}
                  | Collections:{" "}
                  {chartData.reduce((sum, d) => sum + d.collection_count, 0)}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="salesman">Salesman</Label>
              <Input id="salesman" defaultValue={item.salesman_name} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="rank">Salesman ID</Label>
                <Input
                  id="rank"
                  type="number"
                  defaultValue={item.salesman_id}
                  disabled
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="collections">Collections</Label>
                <Input
                  id="collections"
                  type="number"
                  defaultValue={item.collections_count}
                  disabled
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="text"
                  defaultValue={`₱${item.total_amount.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`}
                  disabled
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="average">Average</Label>
                <Input
                  id="average"
                  type="text"
                  defaultValue={`₱${item.average_amount.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`}
                  disabled
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="percentage">Percentage (%)</Label>
              <Input
                id="percentage"
                type="text"
                step="0.1"
                defaultValue={`${Number(item.percent_of_total).toFixed(2)}%`}
                disabled
              />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
