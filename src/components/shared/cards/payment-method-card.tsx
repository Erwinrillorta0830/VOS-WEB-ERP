// src/components/shared/cards/payment-method-card.tsx
"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentMethodPerformance } from "@/components/shared/data-table/payment-methods-data-table/types";
import { CreditCard } from "lucide-react";

interface PaymentMethodCardsProps {
  data: PaymentMethodPerformance[];
  loading?: boolean;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatNumber = (num: number): string =>
  new Intl.NumberFormat("en-US").format(num);

const formatPercent = (percent: number): string => `${percent.toFixed(1)}%`;

const getCardColor = (index: number): string => {
  const colors = [
    "from-blue-500/10",
    "from-green-500/10",
    "from-purple-500/10",
    "from-orange-500/10",
  ];
  return colors[index % colors.length];
};

export default function PaymentMethodCards({ data }: PaymentMethodCardsProps) {
  const topMethods = data.slice(0, 4);

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {topMethods.map((method, index) => (
        <Card
          key={method.method_key}
          className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
            index
          )} shadow-xs`}
        >
          <CardHeader>
            <div className="flex items-start justify-between text-muted-foreground">
              <CardTitle className="text-sm font-medium ">
                {method.method_name}
              </CardTitle>
              <CreditCard className="size-5" />
            </div>
            <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
              {formatNumber(method.transactions_count)} transaction
              {method.transactions_count !== 1 ? "s" : ""}
            </CardDescription>

            <CardTitle className="text-lg font-semibold tabular-nums">
              {formatCurrency(method.total_amount)}
            </CardTitle>

            <CardDescription className="text-sm text-muted-foreground">
              {formatPercent(method.percent_of_total)} of total
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
