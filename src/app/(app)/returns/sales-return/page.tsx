import React from "react";
// ✅ Import the V3 vtc-invoice-management
import { SalesReturnModule } from "../../../../modules/return-management/sales-returnv3/SalesReturnModule";

export const metadata = {
  title: "Sales Returns V3",
  description: "Manage sales return-management and history",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* Render the module here */}
      <SalesReturnModule />
    </main>
  );
}