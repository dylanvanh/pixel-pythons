import { z } from "zod";

export const PrepareCommitRequestSchema = z.object({
  paymentAddress: z.string().min(1),
  ordinalsAddress: z.string().min(1),
  ordinalsPublicKey: z.string().min(1),
  paymentPublicKey: z.string().min(1),
});

export type PrepareCommitRequest = z.infer<typeof PrepareCommitRequestSchema>; 