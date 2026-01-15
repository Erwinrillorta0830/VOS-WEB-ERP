  import { Metadata } from "next";
import ReturnToSupplierModule from "../../../../modules/return-management/return-to-supplier/ReturnToSupplierModule";

export const metadata: Metadata = {
  title: "Return to Supplier",
  description: "Manage return-management of goods and bad stocks to suppliers",
};

export default function ReturnToSupplierPage() {
  return <ReturnToSupplierModule />;
}