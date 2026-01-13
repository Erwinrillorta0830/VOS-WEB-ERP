// modules/fleet-management-module/components/pending-invoices/components/DashboardCards.tsx
"use client";

import * as React from "react";
import type { PendingInvoiceKpis } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link2, Send, Package, CheckCircle2 } from "lucide-react";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  icon: any;
  accent?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className={`text-3xl font-semibold ${accent ?? ""}`}>{value}</div>
        </div>
        <div className="rounded-lg border bg-background p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCards({ kpis }: { kpis: PendingInvoiceKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <StatCard title="Total Pending Invoices" value={kpis.total_count} icon={FileText} accent="text-blue-600" />
      <StatCard title="Unlinked" value={kpis.by_status.Unlinked.count} icon={Link2} />
      <StatCard title="For Dispatch" value={kpis.by_status["For Dispatch"].count} icon={Send} accent="text-blue-600" />
      <StatCard title="Inbound" value={kpis.by_status.Inbound.count} icon={Package} accent="text-orange-600" />
      <StatCard title="Cleared" value={kpis.by_status.Cleared.count} icon={CheckCircle2} accent="text-green-600" />
      <div className="md:col-span-5 -mt-2 text-right text-sm text-muted-foreground">
        Total Amount: <span className="font-semibold text-foreground">{money(kpis.total_amount)}</span>
      </div>
    </div>
  );
}
