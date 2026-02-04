import { useState, useEffect } from "react";
import { SalesReturn } from "../type";
import { SalesReturnProvider } from "../provider/api";

export function useSalesReturnList() {
  const [data, setData] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🟢 NEW: Store options to pass to filters
  const [options, setOptions] = useState<{
    salesmen: { value: string; label: string }[];
    customers: { value: string; label: string }[];
  }>({
    salesmen: [],
    customers: [],
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    salesman: "All",
    customer: "All",
    status: "All",
  });

  // Helper: Normalize to ensure "MAIN - 123" matches "MAIN-123"
  const normalize = (str: string) => {
    if (!str) return "";
    return str.replace(/\s+/g, "").toUpperCase();
  };

  const refresh = async () => {
    setLoading(true);
    try {
      // 1. Fetch Returns, Customers, and Salesmen in parallel
      const [returnsResult, customersList, salesmenList] = await Promise.all([
        SalesReturnProvider.getReturns(page, 10, search, filters),
        SalesReturnProvider.getCustomersList(),
        SalesReturnProvider.getSalesmenList(),
      ]);

      // 2. Update Options State (for Filter Dropdowns)
      setOptions({
        salesmen: salesmenList,
        customers: customersList,
      });

      // 3. Create Lookup Maps (Normalizing Keys)
      const customerMap = new Map();
      customersList.forEach((c) => {
        customerMap.set(normalize(c.value), c.label);
      });

      const salesmanMap = new Map();
      salesmenList.forEach((s) => {
        salesmanMap.set(s.value.toString(), s.label);
      });

      // 4. Map Names into Data
      const mappedData = returnsResult.data.map((item) => {
        const cleanCustomerCode = normalize(item.customerCode);
        const customerName = customerMap.get(cleanCustomerCode);
        const salesmanName = salesmanMap.get(item.salesmanId.toString());

        return {
          ...item,
          // If name found, use it. Else fallback to code.
          customerName: customerName || item.customerCode,
          salesmanName: salesmanName || `ID: ${item.salesmanId}`,
        };
      });

      setData(mappedData);
      setTotalPages(Math.max(1, Math.ceil(returnsResult.total / 10)));
    } catch (err) {
      console.error("Error fetching sales return list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [page, search, filters]);

  return {
    data,
    loading,
    page,
    totalPages,
    setPage,
    setSearch,
    setFilters,
    filters,
    refresh,
    options, // 🟢 Exporting options for the UI
  };
}
