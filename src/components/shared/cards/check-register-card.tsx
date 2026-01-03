"use client";

import { Summary } from "@/components/shared/data-table/check-register-table/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Clock, Calendar, Wallet } from "lucide-react";

interface CheckRegisterCardsProps {
  summary: Summary | null;
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
    "from-orange-500/10",
    "from-purple-500/10",
  ];
  return colors[index % colors.length];
};

export function CheckRegisterCards({ summary }: CheckRegisterCardsProps) {
  if (!summary) return null;
  const cards = [
    {
      icon: Wallet,
      title: "Total Checks",
      value: summary.total_checks,
      subtitle: formatCurrency(summary.total_amount),
      format: "number" as const,
    },
    {
      icon: CheckCircle2,
      title: "Cleared",
      value: summary.cleared_count,
      subtitle: formatCurrency(summary.cleared_amount),
      format: "number" as const,
    },
    {
      icon: Clock,
      title: "Pending",
      value: summary.pending_count,
      subtitle: formatCurrency(summary.pending_amount),
      format: "number" as const,
    },
    {
      icon: Calendar,
      title: "Post Dated",
      value: summary.post_dated_count,
      subtitle: formatCurrency(summary.post_dated_amount),
      format: "number" as const,
    },
    {
      icon: Calendar,
      title: "Dated Check",
      value: summary.dated_check_count,
      subtitle: formatCurrency(summary.dated_check_amount),
      format: "number" as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const displayValue =
          card.format === "number" ? card.value.toLocaleString() : card.value;

        return (
          <Card
            key={card.title}
            className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
              index
            )} shadow-xs relative ${
              index === 0 ? "col-span-2 lg:col-span-1" : "col-span-1"
            }`}
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
