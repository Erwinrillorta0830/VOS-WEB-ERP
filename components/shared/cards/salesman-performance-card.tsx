"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityIcon, DollarSign, TrendingUp, Users } from "lucide-react";

interface TopPerformer {
  salesman_id: number;
  salesman_name: string;
  total_amount: number;
}

interface Summary {
  activeSalesmen: number;
  totalAmount: number;
  avgPerSalesman: number;
  topPerformer: TopPerformer | null;
}

interface SectionCardsProps {
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

export default function SectionCards({ summary }: SectionCardsProps) {
  const cardData = [
    {
      icon: Users,
      title: "Active Salesmen",
      value: summary?.activeSalesmen ?? 0,
      subtitle: "Total active salesmen",
      format: "number",
    },
    {
      icon: TrendingUp,
      title: "Top Performer",
      value: summary?.topPerformer?.salesman_name ?? "N/A",
      subtitle: formatCurrency(summary?.topPerformer?.total_amount ?? 0),
      format: "text",
    },
    {
      icon: DollarSign,
      title: "Total Collection",
      value: summary?.totalAmount ?? 0,
      subtitle: "All collections combined",
      format: "currency",
    },
    {
      icon: ActivityIcon,
      title: "Average per Salesman",
      value: summary?.avgPerSalesman ?? 0,
      subtitle: "Mean collection amount",
      format: "currency",
    },
  ];

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {cardData.map((card, index) => {
        const Icon = card.icon;

        const displayValue =
          card.format === "currency"
            ? formatCurrency(card.value as number)
            : card.format === "number"
            ? (card.value as number).toString()
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

              <CardDescription className="text-md text-muted-foreground">
                {card.subtitle}
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
