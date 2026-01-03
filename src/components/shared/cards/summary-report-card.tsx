// src/components/shared/cards/summary-report-card.tsx
"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { SummaryMetrics } from "../data-table/summary-report-data-table/type";

interface SummaryReportCardProps {
  summary: SummaryMetrics;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatNumber = (num: number): string =>
  new Intl.NumberFormat("en-US").format(num);

const getCardColor = (index: number): string => {
  const colors = [
    "from-blue-500/10",
    "from-green-500/10",
    "from-orange-500/10",
    "from-purple-500/10",
  ];
  return colors[index % colors.length];
};

export default function SummaryReportCard({ summary }: SummaryReportCardProps) {
  const cards = [
    {
      title: "Total Collections",
      count: summary?.total_collections,
      amount: summary?.total_amount,
      icon: FileText,
    },
    {
      title: "Posted",
      count: summary?.posted_collections,
      amount: summary?.posted_amount,
      icon: CheckCircle2,
    },
    {
      title: "Unposted",
      count: summary?.unposted_collections,
      amount: summary?.unposted_amount,
      icon: XCircle,
    },
    {
      title: "Average Collection",
      amount: summary?.average_collection,
      icon: TrendingUp,
      isAverage: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`@container/card bg-gradient-to-t ${getCardColor(
              index
            )} shadow-xs`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardDescription className="text-sm font-medium">
                  {card.title}
                </CardDescription>
                <Icon className="hidden sm:flex size-5 text-muted-foreground" />
              </div>

              <CardTitle className="text-md sm:text-2xl font-semibold tabular-nums text-foreground @[250px]/card:text-3xl">
                {formatCurrency(card.amount)}
              </CardTitle>

              {!card.isAverage && (
                <CardDescription className="text-md text-muted-foreground">
                  {formatNumber(card.count!)} Collections
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
