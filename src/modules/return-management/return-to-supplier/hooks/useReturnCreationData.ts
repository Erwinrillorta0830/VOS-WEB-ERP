// src/modules/return-to-supplier/hooks/useReturnCreationData.ts

import { useState, useEffect } from "react";
import { ReturnToSupplierProvider } from "../providers/api";
import {
  Supplier,
  Branch,
  Product,
  LineDiscount,
  ProductSupplier,
  InventoryRecord,
} from "../type";

export function useReturnCreationData(isOpen: boolean) {
  const [refs, setRefs] = useState<{
    suppliers: Supplier[];
    branches: Branch[];
    products: Product[];
    discounts: LineDiscount[];
    connections: ProductSupplier[];
  }>({
    suppliers: [],
    branches: [],
    products: [],
    discounts: [],
    connections: [],
  });

  // [REV] Changed Map to store full InventoryRecord
  const [inventory, setInventory] = useState<Map<number, InventoryRecord>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      ReturnToSupplierProvider.getReferences().then((data) => {
        setRefs({
          suppliers: data.suppliers,
          branches: data.branches,
          products: data.products,
          discounts: data.lineDiscounts,
          connections: data.connections,
        });
        setLoading(false);
      });
    }
  }, [isOpen]);

  const loadInventory = async (branchId: number, supplierId: number) => {
    const inv = await ReturnToSupplierProvider.getInventory(
      branchId,
      supplierId,
    );
    // [REV] Store full record
    const map = new Map<number, InventoryRecord>();
    inv.forEach((i) => map.set(i.product_id, i));
    setInventory(map);
  };

  return { refs, inventory, loading, loadInventory };
}
