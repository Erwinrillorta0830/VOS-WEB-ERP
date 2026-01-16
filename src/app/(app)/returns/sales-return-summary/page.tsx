import React from "react";
import { SalesReturnSummary } from "../../../../modules/return-management/sales-return-summary/components/SalesReturnSummary";

export const metadata = {
  title: "Sales Return Summary",
  description: "Sales Return Summary Report (charts + list)",
};

export default function SalesReturnV3SummaryPage() {
  return (
    <main className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className=" text-3xl font-bold text-slate-800">Sales Return Summary</h1>
        
        <h1 className="text-slate-500">Helps manage and track all Returned Sales</h1>
      </div>

      <SalesReturnSummary />
    </main>
  );
}
