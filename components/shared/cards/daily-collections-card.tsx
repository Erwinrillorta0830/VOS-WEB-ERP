"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, TrendingUp, Wallet, Activity } from "lucide-react";
import { Summary } from "../data-table/daily-collections-data-table/types";

interface DailyCollectionCardsProps {
  summary: Summary | null;
  loading?: boolean;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const getCardColor = (index: number): string => {
  const colors = [
    "from-blue-500/10",
    "from-green-500/10",
    "from-purple-500/10",
    "from-orange-500/10",
  ];
  return colors[index % colors.length];
};

export function DailyCollectionCards({ summary }: DailyCollectionCardsProps) {
  const cardData = [
    {
      icon: Calendar,
      title: "Total Days",
      value: summary?.total_days ?? 0,
      subtitle: "Days with collections",
      format: "number",
    },
    {
      icon: Activity,
      title: "Total Collections",
      value: summary?.total_collections ?? 0,
      subtitle: "Number of transactions",
      format: "number",
    },
    {
      icon: TrendingUp,
      title: "Daily Average",
      value: summary?.daily_average ?? 0,
      subtitle: "Average per day",
      format: "currency",
    },
    {
      icon: Wallet,
      title: "Total Amount",
      value: summary?.total_amount ?? 0,
      subtitle: "All transactions combined",
      format: "number",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card, index) => {
        const Icon = card.icon;

        const displayValue =
          card.format === "currency"
            ? formatCurrency(card.value as number)
            : card.format === "number"
            ? (card.value as number).toLocaleString()
            : card.value;

        return (
          <Card
            key={card.title}
            className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
              index
            )} shadow-xs relative`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardDescription className="text-sm font-medium">
                  {card.title}
                </CardDescription>
                <Icon className="size-5 text-muted-foreground" />
              </div>

              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {displayValue}
              </CardTitle>

              <CardDescription className="text-sm text-muted-foreground">
                {card.subtitle}
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
