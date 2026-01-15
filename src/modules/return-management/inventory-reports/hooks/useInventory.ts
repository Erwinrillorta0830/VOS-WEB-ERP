import { useState, useEffect } from 'react';
import { InventoryApiResponse } from '../types';

interface FilterParams {
  branch: string;
  supplier: string;
  search: string;
}

export function useInventory(page: number, limit: number, filters: FilterParams) {
  const [data, setData] = useState<InventoryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          branch: filters.branch,
          supplier: filters.supplier,
          search: filters.search,
          _t: Date.now().toString()
        });

        const res = await fetch(`/api/inventory-monitoring?${params.toString()}`);
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch inventory:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
    
  }, [page, limit, filters.branch, filters.supplier, filters.search]);

  return { data, loading, error };
}