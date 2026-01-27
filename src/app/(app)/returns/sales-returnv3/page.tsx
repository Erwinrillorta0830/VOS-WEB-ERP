// src/app/sales-return-v3/page.tsx
import React from "react";
import { SalesReturnModule } from "../../../../modules/return-management/sales-returnv3/SalesReturnModule";

export const metadata = {
  title: "Sales Return V3",
  description: "New Sales Return vtc-invoice-management",
};

export default function SalesReturnV3Page() {
  return (
    <main>
      <SalesReturnModule />
    </main>
  );
}
