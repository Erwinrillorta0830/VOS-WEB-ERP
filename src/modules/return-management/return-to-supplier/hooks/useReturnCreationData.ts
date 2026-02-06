import { useState, useEffect } from "react";
import { ReturnToSupplierProvider } from "../providers/api";
import {
  Supplier,
  Branch,
  Product,
  LineDiscount,
  ProductSupplier,
  InventoryRecord,
  RTSReturnType, // Import the new type (or use any if you skipped step 1)
} from "../type";

export function useReturnCreationData(isOpen: boolean) {
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Update the type definition of the state
  const [refs, setRefs] = useState<{
    suppliers: Supplier[];
    branches: Branch[];
    products: Product[];
    discounts: LineDiscount[];
    connections: ProductSupplier[];
    returnTypes: RTSReturnType[]; // <--- ADD THIS LINE
  }>({
    suppliers: [],
    branches: [],
    products: [],
    discounts: [],
    connections: [],
    returnTypes: [], // <--- Initialize it
  });

  const [inventory, setInventory] = useState<Map<number, InventoryRecord>>(
    new Map(),
  );

  useEffect(() => {
    if (isOpen && !refs.suppliers.length) {
      const loadRefs = async () => {
        setLoading(true);
        try {
          const data = await ReturnToSupplierProvider.getReferences();
          setRefs({
            suppliers: data.suppliers,
            branches: data.branches,
            products: data.products,
            discounts: data.lineDiscounts,
            connections: data.connections,
            returnTypes: data.returnTypes, // <--- Assign data from API
          });
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadRefs();
    }
  }, [isOpen, refs.suppliers.length]);

  const loadInventory = async (branchId: number, supplierId: number) => {
    setLoading(true);
    try {
      const data = await ReturnToSupplierProvider.getInventory(
        branchId,
        supplierId,
      );
      const map = new Map<number, InventoryRecord>();
      data.forEach((item) => map.set(item.product_id, item));
      setInventory(map);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { refs, inventory, loadInventory, loading };
}
