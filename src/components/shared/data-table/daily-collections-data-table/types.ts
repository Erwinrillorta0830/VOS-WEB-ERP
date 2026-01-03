import { z } from "zod";

// Zod schema for daily collection item
export const dailyCollectionSchema = z.object({
  date: z.string(),
  transactions_count: z.number(),
  salesmen_count: z.number(),
  customers_count: z.number(),
  total_amount: z.number(),
  average_amount: z.number(),
});

// Zod schema for summary
export const summarySchema = z.object({
  total_days: z.number(),
  total_collections: z.number(),
  total_amount: z.number(),
  daily_average: z.number(),
});

export type DailyCollection = z.infer<typeof dailyCollectionSchema>;
// Zod schema for API response
export const dailyCollectionResponseSchema = z.object({
  summary: summarySchema,
  daily_collections: z.array(dailyCollectionSchema),
});

// TypeScript types
export type Summary = z.infer<typeof summarySchema>;
export type DailyCollectionResponse = z.infer<
  typeof dailyCollectionResponseSchema
>;
