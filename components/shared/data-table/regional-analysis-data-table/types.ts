import { z } from "zod";

export const RegionalAnalysisSchema = z.object({
  rank: z.number(),
  province: z.string(),
  collections_count: z.number(),
  salesmen_count: z.number(),
  total_amount: z.number(),
  average_amount: z.number(),
  percent_of_total: z.number(),
});

export const RegionalAnalysisResponseSchema = z.object({
  data: z.array(RegionalAnalysisSchema),
});

export type RegionalAnalysis = z.infer<typeof RegionalAnalysisSchema>;
export type RegionalAnalysisResponse = z.infer<
  typeof RegionalAnalysisResponseSchema
>;
