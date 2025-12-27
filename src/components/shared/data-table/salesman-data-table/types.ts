// components/salesman-data-table/types.ts

import { z } from "zod";

export const schema = z.object({
  salesman_id: z.number(),
  salesman_name: z.string(),
  collections_count: z.number(),
  customers_count: z.number(), // Allow both string and number
  total_amount: z.number(),
  average_amount: z.number(),
  percent_of_total: z.number(),
});

export type SalesmanPerformance = z.infer<typeof schema>;

export interface MonthlyChartData {
  month: string;
  total_amount: number;
  average_amount: number;
  collection_count: number;
}



export const chartConfig = {  
  total_amount: {
    label: "Total Amount",
    color: "var(--primary)",
  },
  average_amount: {
    label: "Average Amount",
    color: "var(--primary)",
  },
} as const;
