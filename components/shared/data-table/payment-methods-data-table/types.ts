import { z } from "zod";

/**
 * Zod schema for Payment Method Performance data
 */
export const PaymentMethodPerformanceSchema = z.object({
  method_key: z.string(),
  method_id: z.number().nullable(),
  method_name: z.string(),
  transactions_count: z.number(),
  total_amount: z.number(),
  average_amount: z.number(),
  percent_of_total: z.number(),
  percent_of_transactions: z.number(),
});

export type PaymentMethodPerformance = z.infer<
  typeof PaymentMethodPerformanceSchema
>;

/**
 * Summary statistics for payment methods
 */
export const PaymentMethodSummarySchema = z.object({
  totalTransactions: z.number(),
  totalAmount: z.number(),
});

export type PaymentMethodSummary = z.infer<typeof PaymentMethodSummarySchema>;

/**
 * Top performing payment method
 */
export interface TopPaymentMethod {
  method_id: number | null;
  method_name: string;
  total_amount: number;
  transactions_count: number;
}

/**
 * Extended summary with calculated fields
 */
export interface PaymentMethodSummaryExtended extends PaymentMethodSummary {
  totalMethods: number;
  avgPerTransaction: number;
  topMethod: TopPaymentMethod | null;
}

/**
 * API Response structure
 */
export const PaymentMethodApiResponseSchema = z.object({
  rows: z.array(PaymentMethodPerformanceSchema),
  summary: PaymentMethodSummarySchema,
  salesmen: z.array(
    z.object({
      id: z.number(),
      salesman_name: z.string(),
    })
  ),
});

export type PaymentMethodApiResponse = z.infer<
  typeof PaymentMethodApiResponseSchema
>;
