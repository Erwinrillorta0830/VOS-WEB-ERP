import { z } from "zod";

// Zod schema for customer analysis data
export const customerAnalysisSchema = z.object({
  rank: z.number(),
  customer_id: z.number(),
  customer_name: z.string(),
  customer_code: z.string(),
  is_active: z.number(),
  collections_count: z.number(),
  total_amount: z.number(),
  average_amount: z.number(),
  last_collection_date: z.string(),
  percent_of_total: z.number(),
});

export const customerAnalysisResponseSchema = z.object({
  data: z.array(customerAnalysisSchema),
  summary: z.object({
    total_customers: z.number(),
    total_customers_all: z.number(),
    total_amount: z.number(),
    average_per_customer: z.number(),
    top_customer: customerAnalysisSchema.nullable(),
  }),
});

// TypeScript types
export type CustomerAnalysis = z.infer<typeof customerAnalysisSchema>;
export type CustomerAnalysisResponse = z.infer<
  typeof customerAnalysisResponseSchema
>;
export type CustomerAnalysisSummary = CustomerAnalysisResponse["summary"];
