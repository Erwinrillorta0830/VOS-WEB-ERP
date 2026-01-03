// src/components/check-register-data-table/types.ts
import { z } from "zod";

// Zod schema for check data
export const checkSchema = z.object({
  id: z.number(),
  collection_id: z.number(),
  date_received: z.string(),
  check_number: z.string(),
  bank_name: z.string(),
  customer_name: z.string(),
  customer_code: z.string(),
  salesman_name: z.string(),
  salesman_id: z.number(),
  amount: z.number(),
  check_date: z.string(),
  status: z.enum(["Cleared", "Pending", "Post Dated Check", "Dated Check"]),
  coa_title: z.string(),
  payment_type: z.number(),
  is_cleared: z.number().nullable().optional(),
  origin_type: z.number().nullable().optional(),
  origin_type_label: z.string().nullable().optional(),
});

export const summarySchema = z.object({
  total_checks: z.number(),
  total_amount: z.number(),
  cleared_count: z.number(),
  cleared_amount: z.number(),
  pending_count: z.number(),
  pending_amount: z.number(),
  post_dated_count: z.number(),
  post_dated_amount: z.number(),
  dated_check_count: z.number(),
  dated_check_amount: z.number(),
});

export const statusDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
  amount: z.number(),
  percentage: z.number(),
});

export const checkRegisterResponseSchema = z.object({
  checks: z.array(checkSchema),
  summary: summarySchema,
  status_distribution: z.array(statusDistributionSchema),
});

// TypeScript types
export type Check = z.infer<typeof checkSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type StatusDistribution = z.infer<typeof statusDistributionSchema>;
export type CheckRegisterResponse = z.infer<typeof checkRegisterResponseSchema>;
