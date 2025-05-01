import { z } from "zod";

export const PrepareRevealRequestSchema = z.object({
  commitTxid: z.string().min(64).max(64),
  ordinalsAddress: z.string().min(1),
  ordinalsPublicKey: z.string().min(1),
  paymentAddress: z.string().min(1),
  paymentPublicKey: z.string().min(1),
  mintIndex: z.number().min(0),
});

export type PrepareRevealRequest = z.infer<typeof PrepareRevealRequestSchema>;

