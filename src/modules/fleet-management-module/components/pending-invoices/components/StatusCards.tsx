// src/modules/pending-invoices/components/StatusCards.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link2, Send, PackageCheck, CheckCircle2 } from "lucide-react";

export function StatusCards(props: {
  total: number;
  unlinked: number;
  forDispatch: number;
  inbound: number;
  cleared: number;
}) {
  const CardBox = (p: {
    title: string;
    value: number;
    icon: React.ReactNode;
    accent: string; // text color
    bg: string; // icon bg
  }) => (
    <Card className="shadow-sm">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500">{p.title}</div>
          <div className={`text-3xl font-bold mt-1 ${p.accent}`}>{p.value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${p.bg}`}>
          {p.icon}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <CardBox
        title="Total Pending Invoices"
        value={props.total}
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        accent="text-blue-600"
        bg="bg-blue-50"
      />
      <CardBox
        title="Unlinked"
        value={props.unlinked}
        icon={<Link2 className="h-5 w-5 text-slate-600" />}
        accent="text-slate-800"
        bg="bg-slate-100"
      />
      <CardBox
        title="For Dispatch"
        value={props.forDispatch}
        icon={<Send className="h-5 w-5 text-blue-600" />}
        accent="text-blue-600"
        bg="bg-blue-50"
      />
      <CardBox
        title="Inbound"
        value={props.inbound}
        icon={<PackageCheck className="h-5 w-5 text-orange-600" />}
        accent="text-orange-600"
        bg="bg-orange-50"
      />
      <CardBox
        title="Cleared"
        value={props.cleared}
        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        accent="text-green-600"
        bg="bg-green-50"
      />
    </div>
  );
}
