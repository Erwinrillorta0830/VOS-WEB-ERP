// src/app/sales-return-v3/page.tsx
import React from "react";
import { SalesReturnModule } from "../../../../modules/return-management/sales-returnv3/SalesReturnModule";

export const metadata = {
  title: "Sales Return V3",
  description: "New Sales Return vtc-invoice-management",
};

export default function SalesReturnV3Page() {
  return (
    <main className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Sales Return V3</h1>
        <p className="text-slate-500">Manage returns with the new V3 system</p>
      </div>
      
      {/* Renders the full module with History and Create tabs */}
      <SalesReturnModule />
    </main>
  );
}