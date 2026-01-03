export const exportColumns = [
  {
    key: "collection_date",
    label: "Date",
    format: (val: string) =>
      new Date(val).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
  },
  { key: "transactions_count", label: "Transactions" },
  { key: "salesmen_count", label: "Salesmen" },
  { key: "customers_count", label: "Customers" },
  {
    key: "total_amount",
    label: "Total Amount",
    format: (val: number) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }).format(val),
  },
  {
    key: "average_amount",
    label: "Average",
    format: (val: number) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }).format(val),
  },
];
