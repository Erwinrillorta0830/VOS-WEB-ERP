// src/components/shared/cards/customer-analysis-card.tsx

import { CustomerAnalysisSummary } from "@/components/shared/data-table/customer-analysis-data-table/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Target } from "lucide-react";
import { formatCurrency } from "../../../src/app/lib/utils";
import { getCardColor } from "../../../src/app/lib/utils";

interface CustomerAnalysisCardProps {
  summary: CustomerAnalysisSummary | null;
  isLoading?: boolean;
}


export function CustomerAnalysisCard({ summary }: CustomerAnalysisCardProps) {
  const cards = [
    {
      icon: Users,
      title: "Total Customers",
      value: summary?.total_customers ?? 0,
      subtitle: "Total active customers",
      format: "number",
    },
    {
      icon: Target,
      title: "Top Customer",
      value: summary?.top_customer?.customer_name
        ? `${summary.top_customer.customer_name.slice(0, 25)}${
            summary.top_customer.customer_name.length > 25 ? "..." : ""
          }`
        : "N/A",
      subtitle: "",
      format: "string",
    },
    {
      icon: DollarSign,
      title: "Total Amount",
      value: summary?.total_amount,
      subtitle: "All collections",
      format: "currency",
    },
    {
      icon: TrendingUp,
      title: "Average per Customer",
      value: summary?.average_per_customer,
      subtitle: "Per customer",
      format: "currency",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        const displayValue =
          card.format === "currency"
            ? formatCurrency(card.value as number)
            : card.format === "number"
            ? (card.value as number).toLocaleString()
            : card.value;
        return (
          <Card
            key={index}
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
