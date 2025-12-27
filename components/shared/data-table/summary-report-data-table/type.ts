// src/components/summary-report-data-table/types.ts
import { z } from "zod";

// Zod schema for collection detail item
export const collectionDetailSchema = z.object({
  collection_id: z.number(),
  collection_date: z.string(),
  customer_name: z.string(),
  customer_code: z.string().nullable(),
  salesman_id: z.number(),
  salesman_name: z.string(),
  payment_method: z.string(),
  amount: z.number(),
  status: z.enum(["Posted", "Unposted"]),
});

// Zod schema for summary metrics
export const summaryMetricsSchema = z.object({
  total_collections: z.number(),
  total_amount: z.number(),
  posted_collections: z.number(),
  posted_amount: z.number(),
  unposted_collections: z.number(),
  unposted_amount: z.number(),
  average_collection: z.number(),
});

// Zod schema for daily trend item
export const dailyTrendSchema = z.object({
  date: z.string(),
  amount: z.number(),
});

// Zod schema for payment method item
export const paymentMethodSchema = z.object({
  method_name: z.string(),
  amount: z.number(),
  count: z.number(),
});

// Zod schema for API response
export const summaryReportResponseSchema = z.object({
  summary: summaryMetricsSchema,
  daily_trend: z.array(dailyTrendSchema),
  payment_methods: z.array(paymentMethodSchema),
  collection_details: z.array(collectionDetailSchema),
});

// TypeScript types
export type CollectionDetail = z.infer<typeof collectionDetailSchema>;
export type SummaryMetrics = z.infer<typeof summaryMetricsSchema>;
export type DailyTrend = z.infer<typeof dailyTrendSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type SummaryReportResponse = z.infer<typeof summaryReportResponseSchema>;
