import {
  SummaryMetrics,
  CollectionDetail,
} from "@/components/shared/data-table/summary-report-data-table/type";

export function calculateFilteredSummary(
  filteredData: CollectionDetail[]
): SummaryMetrics {
  const postedItems = filteredData.filter((item) => item.status === "Posted");
  const unpostedItems = filteredData.filter(
    (item) => item.status === "Unposted"
  );

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const postedAmount = postedItems.reduce((sum, item) => sum + item.amount, 0);
  const unpostedAmount = unpostedItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return {
    total_collections: filteredData.length,
    total_amount: totalAmount,
    posted_collections: postedItems.length,
    posted_amount: postedAmount,
    unposted_collections: unpostedItems.length,
    unposted_amount: unpostedAmount,
    average_collection:
      filteredData.length > 0 ? totalAmount / filteredData.length : 0,
  };
}

export const exportColumns = [
  {
    key: "collection_date",
    label: "Date",
    format: (val: string) =>
      new Date(val).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
  },
  { key: "customer_name", label: "Customer" },
  { key: "salesman_name", label: "Salesman" },
  { key: "payment_method", label: "Payment Method" },
  {
    key: "amount",
    label: "Amount",
    format: (val: number) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }).format(val),
  },
  { key: "status", label: "Status" },
];
