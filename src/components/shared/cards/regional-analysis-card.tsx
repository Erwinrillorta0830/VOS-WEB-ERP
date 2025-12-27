// src/components/shared/cards/regional-analysis-card.tsx
"use client";

import { RegionalAnalysis } from "@/components/shared/data-table/regional-analysis-data-table/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface RegionalAnalysisCardsProps {
  data: RegionalAnalysis[];
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
    "from-purple-500/10",
    "from-orange-500/10",
  ];
  return colors[index % colors.length];
};

export function RegionalAnalysisCards({ data }: RegionalAnalysisCardsProps) {
  const top4Regions = data
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 4);

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {top4Regions.map((card, index) => {
        return (
          <Card
            key={card.province}
            className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
              index
            )} shadow-xs`}
          >
            <CardHeader>
              <div className="flex items-start justify-between text-muted-foreground">
                <CardTitle className="text-sm font-medium">
                  {card.province}
                </CardTitle>
                <MapPin className="size-5 " />
              </div>

              <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
                {formatCurrency(card.total_amount)}
              </CardDescription>

              <CardTitle className="text-md tabular-nums">
                {formatNumber(card.collections_count)} Collections
              </CardTitle>

              <CardDescription className="text-sm text-muted-foreground">
                {formatNumber(card.salesmen_count)} Salesmen
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
